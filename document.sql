-- ========================================
-- Users table (Public User Profiles)
-- ========================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Anyone can look up unidentifiable profiles to map Assignee Names
CREATE POLICY "Public profiles are readable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON users FOR ALL USING (auth.uid() = id);

-- ========================================
-- Boards table (navbar items / projects)
-- ========================================
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
-- Owners can interact fully. Members mapped in the join table can passively interact contextually.
CREATE POLICY "Board access" ON boards FOR ALL USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM board_members WHERE board_id = boards.id AND user_id = auth.uid())
);

-- ========================================
-- Board Members table (Collaboration Join Matrix)
-- ========================================
CREATE TABLE board_members (
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);

ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
-- Public read breaks nested queries loop recursion
CREATE POLICY "Read board members" ON board_members FOR SELECT USING (true);
-- Only the original board creator can insert/invite teammates
CREATE POLICY "Insert board members" ON board_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM boards WHERE id = board_id AND user_id = auth.uid())
);
-- Allow members to voluntarily leave via the UI, OR owners to sever connections
CREATE POLICY "Delete board members" ON board_members FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM boards WHERE id = board_id AND user_id = auth.uid())
);

-- ========================================
-- Tasks table (kanban cards within a board)
-- ========================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text,
  created_at timestamptz DEFAULT now(),
  due_date timestamptz,
  position double precision DEFAULT 0
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- Complete board hierarchy mapping. If you have board access, you have task mutation rights implicitly.
DROP POLICY IF EXISTS "Task access" ON tasks;
CREATE POLICY "Task access" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM boards b WHERE b.id = tasks.board_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = tasks.board_id AND bm.user_id = auth.uid())
);

-- ========================================
-- Supabase Realtime Configuration
-- ========================================
-- Grants the Next.js Client hook access to the active Postgres WAL
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ========================================
-- Batch Position Update RPC Function
-- ========================================
-- Atomically updates task positions and statuses in a single transaction.
-- Replaces N individual UPDATE queries with one call, reducing network
-- round-trips and WAL event spam during drag-and-drop operations.
--
-- Usage: SELECT batch_update_positions('[{"id":"uuid","position":1000,"status":"todo"}]'::jsonb);
CREATE OR REPLACE FUNCTION batch_update_positions(updates jsonb)
RETURNS void AS $$
BEGIN
  UPDATE tasks SET
    position = (item->>'position')::double precision,
    status = item->>'status'
  FROM jsonb_array_elements(updates) AS item
  WHERE tasks.id = (item->>'id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments table (discussions on tasks)
-- ========================================
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_system_activity boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Read: anyone with board access can see comments
CREATE POLICY "Comment read" ON comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks t
    JOIN boards b ON b.id = t.board_id
    WHERE t.id = comments.task_id
    AND (b.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid())))
);

-- Insert: board participants can add comments
CREATE POLICY "Comment insert" ON comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM tasks t
    JOIN boards b ON b.id = t.board_id
    WHERE t.id = comments.task_id
    AND (b.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid())))
);

-- Delete: only the comment author can delete their own comment
CREATE POLICY "Comment delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- Activity Log Triggers (Auto-Timeline)
-- ========================================

-- Ensure the system column exists if upgrading from an older schema version
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_system_activity boolean DEFAULT false;

-- Trigger 1: Log status changes natively without frontend intervention
CREATE OR REPLACE FUNCTION log_task_activity() RETURNS TRIGGER AS $$
BEGIN
  -- Automatically capture status updates (e.g., from Drag & Drop)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO comments (task_id, user_id, content, is_system_activity)
    VALUES (
      NEW.id, 
      COALESCE(auth.uid(), NEW.user_id), 
      'Moved from ' || OLD.status || ' to ' || NEW.status, 
      true
    );
  END IF;
  
  -- Automatically capture assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    IF NEW.assignee_id IS NULL THEN
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Removed assignee mapping', true);
    ELSE
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Assigned task to a new member', true);
    END IF;
  END IF;

  -- Title changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO comments (task_id, user_id, content, is_system_activity)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Changed the title from "' || OLD.name || '" to "' || NEW.name || '"', true);
  END IF;

  -- Description changes
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    IF NEW.description IS NULL OR trim(NEW.description) = '' THEN
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Removed the description', true);
    ELSE
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Updated the description', true);
    END IF;
  END IF;

  -- Priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO comments (task_id, user_id, content, is_system_activity)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Changed priority to ' || COALESCE(NEW.priority, 'None'), true);
  END IF;

  -- Due Date changes
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    IF NEW.due_date IS NULL THEN
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Removed the due date', true);
    ELSE
      INSERT INTO comments (task_id, user_id, content, is_system_activity)
      VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Changed due date to ' || TO_CHAR(NEW.due_date, 'Mon DD, YYYY'), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
CREATE TRIGGER task_activity_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_activity();

-- Trigger 2: Log task creation on inception
CREATE OR REPLACE FUNCTION log_task_creation() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO comments (task_id, user_id, content, is_system_activity)
  VALUES (
    NEW.id, 
    COALESCE(auth.uid(), NEW.user_id), 
    'Created this task', 
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_creation_trigger ON tasks;
CREATE TRIGGER task_creation_trigger
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_creation();

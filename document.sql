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

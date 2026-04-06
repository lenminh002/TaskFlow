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
CREATE POLICY "Task access" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM boards WHERE id = tasks.board_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM board_members WHERE board_id = boards.id AND user_id = auth.uid())))
);

-- ========================================
-- Supabase Realtime Configuration
-- ========================================
-- Grants the Next.js Client hook access to the active Postgres WAL
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

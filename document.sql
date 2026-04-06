-- ========================================
-- Boards table (navbar items / projects)
-- ========================================
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own boards" ON boards FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- Tasks table (kanban cards within a board)
-- ========================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text,
  created_at timestamptz DEFAULT now(),
  due_date timestamptz,
  position double precision DEFAULT 0
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

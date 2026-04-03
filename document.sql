-- ========================================
-- Boards table (navbar items / projects)
-- ========================================
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boards DISABLE ROW LEVEL SECURITY;

-- ========================================
-- Tasks table (kanban cards within a board)
-- ========================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text,
  created_at timestamptz DEFAULT now(),
  due_date timestamptz
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

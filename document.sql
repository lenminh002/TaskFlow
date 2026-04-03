CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text,
  created_at timestamptz DEFAULT now(),
  due_date timestamptz,
  assignee text,
  tags text[]
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;



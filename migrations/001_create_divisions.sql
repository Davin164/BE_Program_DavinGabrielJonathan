CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO divisions (name) VALUES 
  ('Core Team'), 
  ('Technology'), 
  ('Design'), 
  ('Marketing'), 
  ('Event')
ON CONFLICT (name) DO NOTHING;

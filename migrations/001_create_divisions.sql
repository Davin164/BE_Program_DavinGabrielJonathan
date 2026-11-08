CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO divisions (name, description) VALUES 
  ('Machine Learning', 'AI, Deep Learning, computer vision, NLP, and predictive modeling'),
  ('Cyber Security', 'Network defense, application security, ethical hacking, and digital forensics'),
  ('Game Development', 'Game design, 2D/3D graphics, Unity/Unreal mechanics, and game logic'),
  ('Mobile Development', 'Android, Kotlin, Flutter, and cross-platform mobile apps'),
  ('Web Development', 'Full-stack web applications, React, Node.js, and modern cloud stacks'),
  ('UI/UX', 'User experience research, wireframing, and Figma design systems'),
  ('Project Management', 'Agile sprints, scrum workflows, and project lifecycle management'),
  ('Human Resource', 'Member recruitment, talent development, and internal bonding'),
  ('Public Relation', 'Community outreach, partnership networking, and campus communications'),
  ('Creative Design', 'Visual assets, event branding, posters, and graphic design'),
  ('Videography', 'Video production, cinematic documentation, and motion graphics'),
  ('Copywriting', 'Content writing, social media captions, storytelling, and publications')
ON CONFLICT (name) DO NOTHING;

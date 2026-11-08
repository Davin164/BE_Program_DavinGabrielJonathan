/**
 * @file seed.js
 * @description Database seeder populating initial test accounts across the 3 role tiers
 * (LEAD, DIVISION_HEAD, MEMBER) and initial sample events.
 */

const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');
const env = require('../src/config/env');

const seed = async () => {
  console.log('Seeding GDGoC UNSRI database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure divisions exist
    const divisionsQuery = `
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
    `;
    await client.query(divisionsQuery);

    // Fetch division IDs
    const divResult = await client.query('SELECT id, name FROM divisions');
    const divisionMap = {};
    divResult.rows.forEach((row) => {
      divisionMap[row.name] = row.id;
    });

    // 2. Hash shared password for seed accounts
    const passwordHash = await bcrypt.hash('Password123!', env.BCRYPT_ROUNDS);

    // 3. Upsert Users for each Role Tier
    const users = [
      {
        email: 'lead.gdgoc@gmail.com',
        name: 'Lead Admin',
        role: 'LEAD',
        division_id: divisionMap['Project Management'],
        nim: '09021282100001',
        phone: '081111111111',
      },
      {
        email: 'colead.gdgoc@gmail.com',
        name: 'Co-Lead Admin',
        role: 'CO_LEAD',
        division_id: divisionMap['Human Resource'],
        nim: '09021282100002',
        phone: '081111111112',
      },
      {
        email: 'sec1.gdgoc@gmail.com',
        name: 'Secretary 1',
        role: 'SECRETARY_1',
        division_id: divisionMap['Public Relation'],
        nim: '09021282100003',
        phone: '081111111113',
      },
      {
        email: 'sec2.gdgoc@gmail.com',
        name: 'Secretary 2',
        role: 'SECRETARY_2',
        division_id: divisionMap['Copywriting'],
        nim: '09021282100004',
        phone: '081111111114',
      },
      {
        email: 'treas1.gdgoc@gmail.com',
        name: 'Treasurer 1',
        role: 'TREASURER_1',
        division_id: divisionMap['Project Management'],
        nim: '09021282100005',
        phone: '081111111115',
      },
      {
        email: 'treas2.gdgoc@gmail.com',
        name: 'Treasurer 2',
        role: 'TREASURER_2',
        division_id: divisionMap['Public Relation'],
        nim: '09021282100006',
        phone: '081111111116',
      },
      {
        email: 'core.tech@gmail.com',
        name: 'Core Team (Web Dev)',
        role: 'CORE_TEAM',
        division_id: divisionMap['Web Development'],
        nim: '09021282100007',
        phone: '082222222222',
      },
      {
        email: 'core.ml@gmail.com',
        name: 'Core Team (Machine Learning)',
        role: 'CORE_TEAM',
        division_id: divisionMap['Machine Learning'],
        nim: '09021282100008',
        phone: '082222222223',
      },
      {
        email: 'davingabrieljonathan@gmail.com',
        name: 'Davin Gabriel Jonathan',
        role: 'MEMBER',
        division_id: divisionMap['Web Development'],
        nim: '09021282126045',
        phone: '081234567890',
      },
      {
        email: 'member.gdgoc@gmail.com',
        name: 'Siti Nurhaliza',
        role: 'MEMBER',
        division_id: divisionMap['UI/UX'],
        nim: '09021282126046',
        phone: '081234567891',
      },
    ];

    const insertedUsers = {};

    for (const u of users) {
      const userRes = await client.query(
        `INSERT INTO users (email, name, password_hash, role, division_id, nim, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             division_id = EXCLUDED.division_id,
             nim = EXCLUDED.nim,
             phone = EXCLUDED.phone,
             is_deleted = FALSE
         RETURNING id, email, role;`,
        [u.email, u.name, passwordHash, u.role, u.division_id, u.nim, u.phone]
      );
      insertedUsers[u.email] = userRes.rows[0].id;
    }

    const leadId = insertedUsers['lead.gdgoc@gmail.com'];
    const techId = insertedUsers['core.tech@gmail.com'];

    // 4. Upsert Sample Events (1 completed + 2 upcoming)
    const now = new Date();
    const pastEventStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pastEventEnd = new Date(pastEventStart.getTime() + 3 * 60 * 60 * 1000);

    const event1Start = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const event1End = new Date(event1Start.getTime() + 4 * 60 * 60 * 1000);

    const event2Start = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const event2End = new Date(event2Start.getTime() + 3 * 60 * 60 * 1000);

    const events = [
      {
        title: 'GDGoC UNSRI Kickoff & Info Session 2026',
        description: 'Opening session introducing Google Developer Groups on Campus Universitas Sriwijaya divisions, roadmap, and core team.',
        quota: 100,
        start_time: pastEventStart.toISOString(),
        end_time: pastEventEnd.toISOString(),
        location: 'Aula Fakultas Ilmu Komputer UNSRI',
        created_by: leadId,
      },
      {
        title: 'Google Cloud & Generative AI Workshop',
        description: 'Practical hands-on workshop covering Gemini models and modern cloud architectures.',
        quota: 50,
        start_time: event1Start.toISOString(),
        end_time: event1End.toISOString(),
        location: 'Auditorium Pascasarjana UNSRI & Google Meet',
        created_by: techId,
      },
      {
        title: 'UI/UX Design Sprint 2026',
        description: 'Hands-on user research and high-fidelity prototyping session using Figma and Design Thinking.',
        quota: 30,
        start_time: event2Start.toISOString(),
        end_time: event2End.toISOString(),
        location: 'Lab Komputer 3 Fasilkom UNSRI',
        created_by: leadId,
      },
    ];

    for (const ev of events) {
      const existingEv = await client.query(
        'SELECT id FROM events WHERE title = $1 AND is_deleted = FALSE LIMIT 1',
        [ev.title]
      );
      if (existingEv.rows.length === 0) {
        await client.query(
          `INSERT INTO events (title, description, quota, start_time, end_time, location, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [ev.title, ev.description, ev.quota, ev.start_time, ev.end_time, ev.location, ev.created_by]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
    console.log('Test Accounts (Password: Password123!):');
    console.log('  LEAD        : lead.gdgoc@gmail.com');
    console.log('  CO_LEAD     : colead.gdgoc@gmail.com');
    console.log('  SECRETARY 1 : sec1.gdgoc@gmail.com');
    console.log('  SECRETARY 2 : sec2.gdgoc@gmail.com');
    console.log('  TREASURER 1 : treas1.gdgoc@gmail.com');
    console.log('  TREASURER 2 : treas2.gdgoc@gmail.com');
    console.log('  CORE_TEAM   : core.tech@gmail.com (Web Dev) & core.ml@gmail.com (ML)');
    console.log('  MEMBER      : davingabrieljonathan@gmail.com & member.gdgoc@gmail.com');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;

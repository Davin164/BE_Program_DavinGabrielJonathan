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
        ('Core Team', 'Strategic planning and chapter leadership'),
        ('Technical Division', 'Software engineering, AI/ML, web, mobile, and cloud development'),
        ('Non-Technical Division', 'Creative UI/UX design, marketing, media, and event logistics')
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
        email: 'lead@gdgoc.unsri.ac.id',
        name: 'Lead Admin',
        role: 'LEAD',
        division_id: divisionMap['Core Team'],
        nim: '09021282100001',
        phone: '081111111111',
      },
      {
        email: 'colead@gdgoc.unsri.ac.id',
        name: 'Co-Lead Admin',
        role: 'CO_LEAD',
        division_id: divisionMap['Core Team'],
        nim: '09021282100002',
        phone: '081111111112',
      },
      {
        email: 'secretary@gdgoc.unsri.ac.id',
        name: 'Secretary Core',
        role: 'SECRETARY',
        division_id: divisionMap['Core Team'],
        nim: '09021282100003',
        phone: '081111111113',
      },
      {
        email: 'treasurer@gdgoc.unsri.ac.id',
        name: 'Treasurer Core',
        role: 'TREASURER',
        division_id: divisionMap['Core Team'],
        nim: '09021282100004',
        phone: '081111111114',
      },
      {
        email: 'tech@gdgoc.unsri.ac.id',
        name: 'Technical Officer',
        role: 'TECHNICAL_DIVISION',
        division_id: divisionMap['Technical Division'],
        nim: '09021282100005',
        phone: '082222222222',
      },
      {
        email: 'nontech@gdgoc.unsri.ac.id',
        name: 'Non-Technical Officer',
        role: 'NON_TECHNICAL_DIVISION',
        division_id: divisionMap['Non-Technical Division'],
        nim: '09021282100006',
        phone: '083333333333',
      },
      {
        email: 'davin@gdgoc.unsri.ac.id',
        name: 'Davin Gabriel Jonathan',
        role: 'MEMBER',
        division_id: divisionMap['Technical Division'],
        nim: '09021282126045',
        phone: '081234567890',
      },
      {
        email: 'member2@gdgoc.unsri.ac.id',
        name: 'Siti Nurhaliza',
        role: 'MEMBER',
        division_id: divisionMap['Non-Technical Division'],
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

    const leadId = insertedUsers['lead@gdgoc.unsri.ac.id'];
    const techId = insertedUsers['tech@gdgoc.unsri.ac.id'];

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
    console.log('  LEAD                   : lead@gdgoc.unsri.ac.id');
    console.log('  CO_LEAD                : colead@gdgoc.unsri.ac.id');
    console.log('  SECRETARY              : secretary@gdgoc.unsri.ac.id');
    console.log('  TREASURER              : treasurer@gdgoc.unsri.ac.id');
    console.log('  TECHNICAL_DIVISION     : tech@gdgoc.unsri.ac.id');
    console.log('  NON_TECHNICAL_DIVISION : nontech@gdgoc.unsri.ac.id');
    console.log('  MEMBER                 : davin@gdgoc.unsri.ac.id');
    console.log('  MEMBER 2               : member2@gdgoc.unsri.ac.id');
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

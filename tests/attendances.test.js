/**
 * @file attendances.test.js
 * @description Automated tests for event attendance:
 * - Time window enforcement (only valid during event duration)
 * - Registration check (only for registered participants)
 * - Idempotency (repeated check-in does not duplicate record or crash)
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, initTestDb, cleanTestDb, createTestUser, createTestEvent, query } = require('./testHelper');

describe('Event Attendance & Idempotency Tests', () => {
  let leadUser;
  let memberUser, memberToken, memberId;
  let activeEventId;
  let futureEventId;

  beforeAll(async () => {
    await initTestDb();
    await cleanTestDb();

    const lead = await createTestUser({ role: 'LEAD', email: 'lead-att@test.com' });
    leadUser = lead.user;

    const member = await createTestUser({ role: 'MEMBER', email: 'member-att@test.com' });
    memberUser = member.user;
    memberId = member.user.id;
    memberToken = member.token;

    // Event aktif (sedang berlangsung)
    const activeEv = await createTestEvent({
      title: 'Active Ongoing Workshop',
      quota: 50,
      created_by: leadUser.id,
      start_time: new Date(Date.now() - 3600000).toISOString(),
      end_time: new Date(Date.now() + 7200000).toISOString(),
    });
    activeEventId = activeEv.id;

    // Event masa depan (belum dimulai)
    const futureEv = await createTestEvent({
      title: 'Future Workshop',
      quota: 50,
      created_by: leadUser.id,
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 90000000).toISOString(),
    });
    futureEventId = futureEv.id;
  });


  it('should reject check-in if user is not registered for the event', async () => {
    const res = await request(app)
      .post(`/api/events/${activeEventId}/checkin`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect([400, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('should reject check-in if event is outside the active time window', async () => {
    // Register for the future event first
    await request(app)
      .post(`/api/events/${futureEventId}/register`)
      .set('Authorization', `Bearer ${memberToken}`);

    const res = await request(app)
      .post(`/api/events/${futureEventId}/checkin`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should allow check-in for registered user within window and remain idempotent on duplicates', async () => {
    // Daftar ke event aktif
    await request(app)
      .post(`/api/events/${activeEventId}/register`)
      .set('Authorization', `Bearer ${memberToken}`);

    // Check-in pertama
    const res1 = await request(app)
      .post(`/api/events/${activeEventId}/checkin`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect([200, 201]).toContain(res1.status);
    expect(res1.body.success).toBe(true);

    // Check-in kedua (duplikat idempoten)
    const res2 = await request(app)
      .post(`/api/events/${activeEventId}/checkin`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.alreadyCheckedIn).toBe(true);

    // Data di database tetap tepat 1 baris
    const count = await query(
      'SELECT COUNT(*)::int AS count FROM attendances WHERE user_id = $1 AND event_id = $2',
      [memberId, activeEventId]
    );
    expect(parseInt(count.rows[0].count, 10)).toBe(1);
  });
});

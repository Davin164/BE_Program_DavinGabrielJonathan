/**
 * @file registrations.test.js
 * @description Concurrency and race condition testing for event quota enforcement.
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, initTestDb, cleanTestDb, createTestUser, createTestEvent, query } = require('./testHelper');

describe('Event Registrations & Concurrency Quota Tests', () => {
  let leadUser;
  let user1, token1;
  let user2, token2;
  let user3, token3;
  let eventId;

  beforeAll(async () => {
    await initTestDb();
    await cleanTestDb();

    const lead = await createTestUser({ role: 'LEAD', email: 'lead-reg@test.com' });
    leadUser = lead.user;

    const u1 = await createTestUser({ role: 'MEMBER', email: 'reg-user1@test.com' });
    user1 = u1.user;
    token1 = u1.token;

    const u2 = await createTestUser({ role: 'MEMBER', email: 'reg-user2@test.com' });
    user2 = u2.user;
    token2 = u2.token;

    const u3 = await createTestUser({ role: 'MEMBER', email: 'reg-user3@test.com' });
    user3 = u3.user;
    token3 = u3.token;
  });


  beforeEach(async () => {
    // Create an event with quota = 1 before each race test
    const ev = await createTestEvent({
      title: `Race Condition Event ${Date.now()}`,
      quota: 1,
      created_by: leadUser.id,
    });
    eventId = ev.id;
  });

  it('should only allow one registration when two concurrent requests hit last slot', async () => {
    // Send 2 simultaneous register requests to an event with quota = 1
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${token1}`),
      request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${token2}`),
    ]);

    const successes = [res1, res2].filter((r) => r.status === 201).length;
    const failures = [res1, res2].filter((r) => r.status === 409 || r.status === 400).length;

    expect(successes).toBe(1);
    expect(failures).toBe(1);

    // Verify database has exactly 1 registration row
    const countRes = await query(
      'SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1',
      [eventId]
    );
    expect(countRes.rows[0].count).toBe(1);
  });

  it('should prevent the same user from registering twice for the same event', async () => {
    const multiSlotEvent = await createTestEvent({
      title: 'Multi Slot Event',
      quota: 10,
      created_by: leadUser.id,
    });

    const firstRes = await request(app)
      .post(`/api/events/${multiSlotEvent.id}/register`)
      .set('Authorization', `Bearer ${token3}`);
    expect(firstRes.status).toBe(201);

    const duplicateRes = await request(app)
      .post(`/api/events/${multiSlotEvent.id}/register`)
      .set('Authorization', `Bearer ${token3}`);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.code).toBe('ALREADY_REGISTERED');
  });
});

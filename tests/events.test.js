/**
 * @file events.test.js
 * @description Integration tests for events creation, validation, and listing.
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, initTestDb, cleanTestDb, createTestUser } = require('./testHelper');

describe('Events Module Tests', () => {
  let leadToken;
  let divHeadToken;
  let memberToken;

  beforeAll(async () => {
    await initTestDb();
    await cleanTestDb();

    const lead = await createTestUser({ role: 'LEAD', email: 'lead-events@test.com' });
    leadToken = lead.token;

    const divHead = await createTestUser({ role: 'CORE_TEAM', email: 'tech-events@test.com' });
    divHeadToken = divHead.token;

    const member = await createTestUser({ role: 'MEMBER', email: 'member-events@test.com' });
    memberToken = member.token;
  });


  describe('POST /api/events', () => {
    it('should forbid a MEMBER from creating an event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Member Event',
          quota: 20,
          start_time: new Date(Date.now() + 86400000).toISOString(),
          end_time: new Date(Date.now() + 90000000).toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it('should allow CORE_TEAM member to create an event', async () => {
      const startTime = new Date(Date.now() + 86400000).toISOString();
      const endTime = new Date(Date.now() + 90000000).toISOString();

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${divHeadToken}`)
        .send({
          title: 'Tech Workshop 2026',
          description: 'Hands-on programming workshop',
          quota: 40,
          start_time: startTime,
          end_time: endTime,
          location: 'Lab 2',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Tech Workshop 2026');
      expect(res.body.data.quota).toBe(40);
    });

    it('should reject event creation if end_time is earlier than or equal to start_time', async () => {
      const startTime = new Date(Date.now() + 90000000).toISOString();
      const endTime = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          title: 'Invalid Date Event',
          quota: 10,
          start_time: startTime,
          end_time: endTime,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject event creation if quota is zero or negative', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          title: 'Invalid Quota Event',
          quota: 0,
          start_time: new Date(Date.now() + 86400000).toISOString(),
          end_time: new Date(Date.now() + 90000000).toISOString(),
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/events', () => {
    it('should retrieve a list of events with remaining quota', async () => {
      const res = await request(app).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].remaining_quota).toBeDefined();
    });
  });
});

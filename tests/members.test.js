const request = require('supertest');
const app = require('../src/app');
const { pool, initTestDb, cleanTestDb, createTestUser, query } = require('./testHelper');

describe('Members Module & IDOR Security Tests', () => {
  let leadUser, leadToken;
  let member1, member1Token;
  let member2, member2Token;

  beforeAll(async () => {
    await initTestDb();
    await cleanTestDb();

    const lead = await createTestUser({ role: 'LEAD', email: 'lead-members@test.com' });
    leadUser = lead.user;
    leadToken = lead.token;

    const m1 = await createTestUser({ role: 'MEMBER', email: 'member1@test.com', name: 'Member One' });
    member1 = m1.user;
    member1Token = m1.token;

    const m2 = await createTestUser({ role: 'MEMBER', email: 'member2@test.com', name: 'Member Two' });
    member2 = m2.user;
    member2Token = m2.token;
  });

describe('GET /api/members', () => {
    it('should retrieve a paginated list of active members', async () => {
      const res = await request(app)
        .get('/api/members?page=1&limit=10&sort=name&order=asc')
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter members by search keyword', async () => {
      const res = await request(app)
        .get('/api/members?search=Member One')
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('member1@test.com');
    });
  });

  describe('IDOR Prevention on Profile Update', () => {
    it('should forbid a MEMBER from updating another member profile (IDOR prevention)', async () => {
      const res = await request(app)
        .put(`/api/members/${member2.id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only modify your own profile/i);
    });

    it('should allow a MEMBER to update their own profile', async () => {
      const res = await request(app)
        .put(`/api/members/${member1.id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ name: 'Updated Member One', phone: '08999999999' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Member One');
      expect(res.body.data.phone).toBe('08999999999');
    });
  });

  describe('LEAD Administrative Actions', () => {
    it('should allow LEAD to change a member role and create an audit log', async () => {
      const res = await request(app)
        .patch(`/api/members/${member2.id}/role`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ role: 'CORE_TEAM' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('CORE_TEAM');

      const auditRes = await query(
        `SELECT * FROM audit_logs WHERE target_id = $1 AND action = 'ROLE_CHANGE'`,
        [member2.id]
      );
      expect(auditRes.rows.length).toBeGreaterThan(0);
      expect(auditRes.rows[0].new_value.role).toBe('CORE_TEAM');
    });

    it('should allow LEAD to soft delete a member', async () => {
      const res = await request(app)
        .delete(`/api/members/${member2.id}`)
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const userRes = await query('SELECT is_deleted, deleted_at FROM users WHERE id = $1', [member2.id]);
      expect(userRes.rows[0].is_deleted).toBe(true);
      expect(userRes.rows[0].deleted_at).not.toBeNull();
    });
  });
});

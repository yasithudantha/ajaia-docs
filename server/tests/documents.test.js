import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { initDb, pool } from '../src/db.js';

let createdDocId;
let importedDocId;

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  if (createdDocId) {
    await pool.query('DELETE FROM documents WHERE id = $1', [createdDocId]);
  }
  if (importedDocId) {
    await pool.query('DELETE FROM documents WHERE id = $1', [importedDocId]);
  }
  await pool.end();
});

describe('Document Creation, Sharing & Permission Enforcement', () => {
  it('allows Alice to create a document and blocks unshared user Bob from reading it', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('X-User-Id', 'user-alice')
      .send({ title: 'Test Secret Spec', content: '<p>Confidential</p>' });

    expect(createRes.status).toBe(201);
    createdDocId = createRes.body.id;

    // Bob has no access yet -> 403
    const forbiddenRes = await request(app)
      .get(`/api/documents/${createdDocId}`)
      .set('X-User-Id', 'user-bob');

    expect(forbiddenRes.status).toBe(403);
  });

  it('grants Bob viewer access (read allowed, edit blocked) then upgrades to editor', async () => {
    // Share as viewer
    const shareRes = await request(app)
      .post(`/api/documents/${createdDocId}/shares`)
      .set('X-User-Id', 'user-alice')
      .send({ userId: 'user-bob', permission: 'viewer' });

    expect(shareRes.status).toBe(201);

    // Bob can read
    const readRes = await request(app)
      .get(`/api/documents/${createdDocId}`)
      .set('X-User-Id', 'user-bob');
    expect(readRes.status).toBe(200);
    expect(readRes.body.access_level).toBe('viewer');

    // Bob cannot edit as viewer -> 403
    const editBlocked = await request(app)
      .patch(`/api/documents/${createdDocId}`)
      .set('X-User-Id', 'user-bob')
      .send({ content: '<p>Unauthorized edit</p>' });
    expect(editBlocked.status).toBe(403);

    // Upgrade Bob to editor
    await request(app)
      .post(`/api/documents/${createdDocId}/shares`)
      .set('X-User-Id', 'user-alice')
      .send({ userId: 'user-bob', permission: 'editor' });

    // Bob can now edit
    const editAllowed = await request(app)
      .patch(`/api/documents/${createdDocId}`)
      .set('X-User-Id', 'user-bob')
      .send({ content: '<p>Approved editor update</p>' });
    expect(editAllowed.status).toBe(200);
    expect(editAllowed.body.content).toBe('<p>Approved editor update</p>');
  });
});

describe('File Upload & Import Validation', () => {
  it('rejects unsupported file extensions with 400', async () => {
    const res = await request(app)
      .post('/api/documents/import')
      .set('X-User-Id', 'user-alice')
      .attach('file', Buffer.from('binary-content'), 'malware.exe');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unsupported file type/i);
  });

  it('imports a Markdown (.md) file into a formatted editable document', async () => {
    const mdBuffer = Buffer.from('# Sprint Notes\n\n- Task **One**\n- Task *Two*');
    const res = await request(app)
      .post('/api/documents/import')
      .set('X-User-Id', 'user-alice')
      .attach('file', mdBuffer, 'sprint-notes.md');

    expect(res.status).toBe(201);
    importedDocId = res.body.id;
    expect(res.body.title).toBe('sprint-notes');
    expect(res.body.content).toContain('<h1>Sprint Notes</h1>');
    expect(res.body.content).toContain('<strong>One</strong>');
  });
});
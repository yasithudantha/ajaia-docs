import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role_label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '<p></p>',
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (document_id, user_id)
    );
  `);

  // Seed 3 demo users idempotently
  await pool.query(`
    INSERT INTO users (id, name, email, role_label) VALUES
      ('user-alice', 'Alice Chen', 'alice@ajaia.ai', 'Product Lead'),
      ('user-bob', 'Bob Martinez', 'bob@ajaia.ai', 'Full Stack Engineer'),
      ('user-carol', 'Carol Silva', 'carol@ajaia.ai', 'AI Researcher')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed starter documents only if documents table is empty
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM documents');
  if (rows[0].count === 0) {
    const doc1 = await pool.query(
      `INSERT INTO documents (title, content, owner_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [
        'Q4 Product Roadmap',
        '<h1>Q4 Product Roadmap</h1><p>Welcome to <strong>Ajaia Docs</strong>. Use the toolbar above to format text, or click <u>Share</u> to collaborate.</p><ul><li>Ship lightweight rich-text editor</li><li>Support Markdown, TXT, and DOCX imports</li><li>Enforce owner, editor, and viewer permissions</li></ul>',
        'user-alice',
      ]
    );

    await pool.query(
      `INSERT INTO document_shares (document_id, user_id, permission)
       VALUES ($1, 'user-bob', 'editor'), ($1, 'user-carol', 'viewer')`,
      [doc1.rows[0].id]
    );

    await pool.query(
      `INSERT INTO documents (title, content, owner_id)
       VALUES ($1, $2, $3)`,
      [
        'Engineering Architecture Notes',
        '<h2>System Overview</h2><p>Built with React, Tiptap, Express, and Neon PostgreSQL.</p><ol><li>Stateless REST API with header-based user context</li><li>Role-based access control enforced on every read/write</li></ol>',
        'user-bob',
      ]
    );
  }
}
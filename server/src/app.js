import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { marked } from 'marked';
import mammoth from 'mammoth';
import { pool } from './db.js';

export const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    allowedHeaders: ['Content-Type', 'X-User-Id'],
  })
);
app.use(express.json({ limit: '2mb' }));

// Multer in-memory storage (2MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.docx'];

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Auth middleware: resolves active user from X-User-Id header
async function requireUser(req, res, next) {
  const userId = req.header('X-User-Id');
  if (!userId) {
    return res.status(401).json({ error: 'Missing X-User-Id header' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Helper: fetch document + effective access level for current user
async function getDocumentWithAccess(docId, userId) {
  const { rows } = await pool.query(
    `SELECT d.*, u.name AS owner_name, u.email AS owner_email,
            CASE
              WHEN d.owner_id = $2 THEN 'owner'
              ELSE ds.permission
            END AS access_level
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     LEFT JOIN document_shares ds ON ds.document_id = d.id AND ds.user_id = $2
     WHERE d.id = $1`,
    [docId, userId]
  );
  return rows[0] || null;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all seeded users (for demo switcher & share dropdown)
app.get('/api/users', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role_label FROM users ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// List documents owned by OR shared with current user
app.get('/api/documents', requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.title, d.owner_id, d.source_filename, d.created_at, d.updated_at,
              u.name AS owner_name,
              CASE
                WHEN d.owner_id = $1 THEN 'owner'
                ELSE ds.permission
              END AS access_level
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       LEFT JOIN document_shares ds ON ds.document_id = d.id AND ds.user_id = $1
       WHERE d.owner_id = $1 OR ds.user_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create a blank document
app.post('/api/documents', requireUser, async (req, res, next) => {
  try {
    const title = (req.body.title || 'Untitled Document').trim();
    const content = typeof req.body.content === 'string' ? req.body.content : '<p></p>';

    if (!title || title.length > 150) {
      return res.status(400).json({ error: 'Title must be between 1 and 150 characters' });
    }

    const { rows } = await pool.query(
      `INSERT INTO documents (title, content, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, content, req.user.id]
    );

    res.status(201).json({ ...rows[0], owner_name: req.user.name, access_level: 'owner' });
  } catch (err) {
    next(err);
  }
});

// Import .txt, .md, or .docx file as a new editable document
app.post('/api/documents/import', requireUser, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Supported types: .txt, .md, .docx' });
    }

    const originalName = req.file.originalname;
    const dotIdx = originalName.lastIndexOf('.');
    const ext = dotIdx !== -1 ? originalName.slice(dotIdx).toLowerCase() : '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: `Unsupported file type "${ext || 'unknown'}". Allowed formats: .txt, .md, .docx`,
      });
    }

    let htmlContent = '<p></p>';
    if (ext === '.txt') {
      const rawText = req.file.buffer.toString('utf-8');
      const lines = rawText.split(/\r?\n/);
      htmlContent = lines.map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
    } else if (ext === '.md') {
      const rawMd = req.file.buffer.toString('utf-8');
      htmlContent = await marked.parse(rawMd);
    } else if (ext === '.docx') {
      const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
      htmlContent = result.value || '<p></p>';
    }

    const baseTitle = originalName.slice(0, dotIdx).trim() || 'Imported Document';
    const { rows } = await pool.query(
      `INSERT INTO documents (title, content, owner_id, source_filename)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [baseTitle.slice(0, 150), htmlContent, req.user.id, originalName]
    );

    res.status(201).json({ ...rows[0], owner_name: req.user.name, access_level: 'owner' });
  } catch (err) {
    next(err);
  }
});

// Get single document (enforces owner or shared access)
app.get('/api/documents/:id', requireUser, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await getDocumentWithAccess(docId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!doc.access_level) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    const sharesRes = await pool.query(
      `SELECT ds.user_id, ds.permission, u.name, u.email
       FROM document_shares ds
       JOIN users u ON ds.user_id = u.id
       WHERE ds.document_id = $1
       ORDER BY u.name ASC`,
      [docId]
    );

    res.json({ ...doc, shares: sharesRes.rows });
  } catch (err) {
    next(err);
  }
});

// Update document title or content (enforces owner or editor access)
app.patch('/api/documents/:id', requireUser, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await getDocumentWithAccess(docId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.access_level !== 'owner' && doc.access_level !== 'editor') {
      return res.status(403).json({ error: 'Only owners and editors can modify this document' });
    }

    const nextTitle = req.body.title !== undefined ? req.body.title.trim() : doc.title;
    const nextContent = req.body.content !== undefined ? req.body.content : doc.content;

    if (!nextTitle || nextTitle.length > 150) {
      return res.status(400).json({ error: 'Title must be between 1 and 150 characters' });
    }

    const { rows } = await pool.query(
      `UPDATE documents
       SET title = $1, content = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nextTitle, nextContent, docId]
    );

    res.json({ ...rows[0], owner_name: doc.owner_name, access_level: doc.access_level });
  } catch (err) {
    next(err);
  }
});

// Delete document (owner only)
app.delete('/api/documents/:id', requireUser, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    const doc = await getDocumentWithAccess(docId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.access_level !== 'owner') {
      return res.status(403).json({ error: 'Only the document owner can delete it' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Grant or update share permission (owner only)
app.post('/api/documents/:id/shares', requireUser, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    const { userId, permission = 'editor' } = req.body;

    if (!['viewer', 'editor'].includes(permission)) {
      return res.status(400).json({ error: 'Permission must be "viewer" or "editor"' });
    }

    const doc = await getDocumentWithAccess(docId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.access_level !== 'owner') {
      return res.status(403).json({ error: 'Only the document owner can manage sharing' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You are already the owner of this document' });
    }

    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target user does not exist' });
    }

    await pool.query(
      `INSERT INTO document_shares (document_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id)
       DO UPDATE SET permission = EXCLUDED.permission`,
      [docId, userId, permission]
    );

    const sharesRes = await pool.query(
      `SELECT ds.user_id, ds.permission, u.name, u.email
       FROM document_shares ds
       JOIN users u ON ds.user_id = u.id
       WHERE ds.document_id = $1
       ORDER BY u.name ASC`,
      [docId]
    );

    res.status(201).json(sharesRes.rows);
  } catch (err) {
    next(err);
  }
});

// Revoke user access (owner only)
app.delete('/api/documents/:id/shares/:targetUserId', requireUser, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    const { targetUserId } = req.params;

    const doc = await getDocumentWithAccess(docId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.access_level !== 'owner') {
      return res.status(403).json({ error: 'Only the document owner can revoke access' });
    }

    await pool.query(
      'DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2',
      [docId, targetUserId]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Global error handler (including Multer file size errors)
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message} (Max 2MB)` });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
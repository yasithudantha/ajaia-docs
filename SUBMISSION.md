# Ajaia AI-Native Full Stack Developer Assignment — Submission

**Candidate:** Yasith Udantha (`yasith.udantha@gmail.com`)  
**Project:** Ajaia Docs — Lightweight Collaborative Document Editor

## Live Deployment & Links
- **Live Product URL:** https://ajaia-docs-seven-delta.vercel.app
- **Live Backend API URL:** https://ajaia-docs-api-murex.vercel.app
- **API Health Check:** https://ajaia-docs-api-murex.vercel.app/api/health
- **GitHub Repository:** https://github.com/yasithudantha/ajaia-docs

## Test Accounts (Seeded Demo Users)
Select any user from the **"Acting as"** dropdown in the top-right corner of the app (no password required):
- **Alice Chen (`alice@ajaia.ai`)** — Owner of *Q4 Product Roadmap*
- **Bob Martinez (`bob@ajaia.ai`)** — Owner of *Engineering Architecture Notes*; `Editor` on *Q4 Product Roadmap*
- **Carol Silva (`carol@ajaia.ai`)** — `Viewer` (read-only) on *Q4 Product Roadmap*

## Google Drive Folder Contents
1. `client/` — React + Vite + Tailwind CSS + Tiptap frontend source code
2. `server/` — Node.js + Express + PostgreSQL backend source code and Vitest + Supertest integration tests
3. `README.md` — Local setup, run instructions, supported file types, and test credentials
4. `ARCHITECTURE.md` — System architecture, prioritization rationale, tradeoffs, and roadmap
5. `AI_WORKFLOW.md` — AI tools used, acceleration points, manual corrections, and verification process
6. `SUBMISSION.md` — Submission index and evaluator guide
7. `VIDEO_LINK.txt` — Link to the 3–5 minute walkthrough video

## Scope Summary
- **Working End-to-End:** Document creation, renaming, Tiptap rich-text formatting (Bold, Italic, Underline, H1, H2, Bulleted/Numbered Lists, Undo/Redo), PostgreSQL persistence across refreshes, `.md`/`.txt`/`.docx` file import into new editable documents (max 2 MB), Owner/Editor/Viewer sharing & revocation, automated integration tests, and live Vercel + Neon deployment.
- **Intentionally Deprioritized:** Real-time WebSocket multi-cursor editing, inline comments, version history, and document export—cut to keep scope tight and ensure reliable persistence and access control within the 4-hour timebox.
- **Next Priorities (With 2–4 More Hours):** Server-side HTML sanitization (`sanitize-html`), Markdown/PDF export, optimistic concurrency conflict detection, and debounced autosave.
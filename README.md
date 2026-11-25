# Ajaia Docs — Lightweight Collaborative Document Editor

A full-stack collaborative document editor built for the **Ajaia AI-Native Full Stack Developer Assignment**. Users can create, rename, format, persist, import, and share documents with role-based permissions (`Owner`, `Editor`, `Viewer`).

## Live Links
- **Live Application (Frontend):** https://ajaia-docs-seven-delta.vercel.app
- **Live Backend API:** https://ajaia-docs-api-murex.vercel.app
- **Health Check Endpoint:** https://ajaia-docs-api-murex.vercel.app/api/health
- **GitHub Repository:** https://github.com/yasithudantha/ajaia-docs

## Seeded Test Accounts (No Password Required)
Use the **"Acting as"** user switcher in the top-right navigation bar to test ownership, sharing, and permission enforcement:

| User ID | Name | Email | Role | Pre-seeded Access |
| :--- | :--- | :--- | :--- | :--- |
| `user-alice` | Alice Chen | `alice@ajaia.ai` | Product Lead | Owns *Q4 Product Roadmap* |
| `user-bob` | Bob Martinez | `bob@ajaia.ai` | Full Stack Engineer | Owns *Engineering Architecture Notes*; `Editor` on *Q4 Product Roadmap* |
| `user-carol` | Carol Silva | `carol@ajaia.ai` | AI Researcher | `Viewer` (read-only) on *Q4 Product Roadmap* |

## Core Features
1. **Rich-Text Document Editor (Tiptap):** Create, rename, edit, save, and reopen documents with Bold, Italic, Underline, Headings (`H1`, `H2`), Bulleted Lists, Numbered Lists, and Undo/Redo.
2. **File Import Workflow:** Upload a `.md`, `.txt`, or `.docx` file (max **2 MB**) to convert and save it as a new editable document. Unsupported file extensions and oversized files are rejected with clear validation messages.
3. **Document Sharing & Access Control:**
   - Clear separation between **My Documents** (owned) and **Shared with Me** (with owner attribution and role badges).
   - Owners can grant `Editor` or `Viewer` access to other users and revoke access at any time.
   - Enforced on both the UI (read-only lock for Viewers) and the Express backend (`403 Forbidden` on unauthorized reads, edits, or deletes).
4. **PostgreSQL Persistence (Neon):** All users, documents, HTML formatting, and share permissions persist across browser refreshes and sessions.

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Tiptap (`@tiptap/react`, `starter-kit`, `extension-underline`), Lucide Icons
- **Backend:** Node.js, Express 5, Multer (memory upload), Marked (`.md` parser), Mammoth (`.docx` parser)
- **Database:** Neon Serverless PostgreSQL (`pg`)
- **Testing:** Vitest + Supertest
- **Deployment:** Vercel (Frontend & Serverless Express API) + Neon PostgreSQL

## Local Setup & Run Instructions

### Prerequisites
- Node.js `v20+`
- A PostgreSQL connection string (e.g., free tier on [Neon](https://neon.tech))

### 1. Clone the Repository
```bash
git clone [https://github.com/yasithudantha/ajaia-docs.git](https://github.com/yasithudantha/ajaia-docs.git)
cd ajaia-docs
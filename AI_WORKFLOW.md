# AI-Native Workflow Note

## 1. AI Tools Used
- **Google Gemini:** Used as an architectural thought partner, full-stack scaffolding accelerator, debugging partner for serverless deployment edge cases, and documentation structuring assistant.

## 2. Where AI Materially Sped Up Execution
- **Scaffolding & Boilerplate Compression:** Generated the initial Express 5 REST API structure, PostgreSQL schema with idempotent seed queries, and Tiptap toolbar component in minutes—leaving time for end-to-end testing, deployment verification, and edge-case validation.
- **Multi-Format File Conversion:** Quickly wired `multer` memory uploads with `marked` (`.md`) and `mammoth` (`.docx`) into a unified HTML import endpoint.
- **Integration Test Coverage:** Generated Vitest + Supertest integration tests validating cross-user isolation (`403` responses) and file extension validation (`400` responses).

## 3. Where AI Output Was Changed, Debugged, or Rejected
- **Serverless Runtime Adaptation (Vercel):** Initial deployment boilerplate assumed a traditional long-running Node server (`app.listen`), and an initial custom Vercel wrapper triggered `FUNCTION_INVOCATION_FAILED` because Vercel's native Express runtime expects `export default app` directly from `src/app.js` with lazy database initialization middleware. I removed the redundant wrapper and refactored `src/app.js` to export `app` as default while guarding `initDb()` with a cached promise.
- **Remote Database Test Timeouts:** Vitest's default `5000ms` timeout failed on multi-step permission tests against remote Neon PostgreSQL over TLS. I added a dedicated `vitest.config.js` (`testTimeout: 20000`) so integration tests pass reliably across network latencies.
- **Rich-Text Editor Styling (`ProseMirror` + Tailwind v4):** Default Tailwind v4 CSS resets stripped native heading sizes and list markers inside Tiptap's `.ProseMirror` container. I added explicit `.ProseMirror h1, h2, ul, ol` rules in `client/src/index.css` so headings and lists render unmistakably.
- **Frontend Environment Variable Hardening:** Caught and fixed a malformed `VITE_API_URL` value during deployment and configured it as a public `Config` variable rather than a `Secret` to comply with Vite's build-time exposure rules.

## 4. How Correctness, UX Quality, and Reliability Were Verified
- **Automated Integration Tests:** Ran `vitest run` against live Neon PostgreSQL to verify `403` enforcement for unauthorized users/viewers, `200` edits for owners/editors, and `400` rejection for invalid file types (`.exe`).
- **End-to-End Live Smoke Testing:** Tested the deployed Vercel frontend + backend across all three seeded user personas (`Alice`, `Bob`, `Carol`), verifying persistence across full page refreshes, file import formatting, and role-based UI locking.
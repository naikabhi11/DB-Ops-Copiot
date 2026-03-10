# DB Ops Copilot (MongoDB + PostgreSQL)

AI-powered Database Operations Copilot with a dark-theme dashboard for real-time observability, incident response, and query optimization.

## Features

- **Role-based login** (admin/operator/viewer).
- **Multiple environments** (development, staging, production).
- **Database Monitoring**
  - CPU, memory, disk I/O, connection counts.
  - Replication lag tracking.
  - Query throughput and latency trends.
  - Disk usage growth snapshots.
- **Slow Query Analyzer**
  - Upload/query log input.
  - AI + local fallback recommendations.
  - Index and rewrite suggestions.
- **Incident Detection**
  - Detects CPU saturation, replication lag spikes, lock contention, and long-running queries.
  - Runbook-style troubleshooting guidance.
- **Capacity Planning**
  - Storage/index growth forecasting.
  - Scaling recommendations (vertical/horizontal).
- **Query Plan Visualizer**
  - Visual plan tree.
  - Highlights expensive scan operations.
- **Alerting System**
  - Threshold rules for CPU/memory/lag/latency.
  - Email/Slack channel configuration.
- **AI Assistant**
  - Chat for diagnostics and optimization questions.

## Tech Stack

- React + Vite + TypeScript
- Express (API + Vite middleware)
- SQLite (`better-sqlite3`) for local persistence
- Recharts + Lucide icons
- Gemini API integration with local fallback behavior

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) set `GEMINI_API_KEY` in `.env.local` for full AI responses.
3. Start app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

## Seeded users

- `admin@example.com` / `admin123`
- `operator@example.com` / `operator123`
- `viewer@example.com` / `viewer123`

## Validation

```bash
npm run lint
npm run build
```

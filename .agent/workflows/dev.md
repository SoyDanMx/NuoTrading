---
description: Start the NUO TRADE development environment using Docker Compose.
---

To start all services (Frontend, Backend, TimescaleDB, Redis):

// turbo
1. Run the following command from the root directory:
```bash
npm run dev
```

This will:
- Start the database (TimescaleDB) at localhost:5432
- Start Redis at localhost:6379
- Start the FastAPI backend at http://localhost:8000
- Start the Next.js frontend at http://localhost:3000

To stop the services:
```bash
npm run docker:down
```

---
description: Setup the local development environment for NUO TRADE.
---

Follow these steps to set up the project locally:

1. **Install root dependencies & Setup env**:
```bash
npm install
cp .env.example .env
```

2. **Setup Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Setup Frontend**:
```bash
cd frontend
npm install
```

4. **Initialize Database** (Ensure Docker is running):
```bash
npm run docker:up db
```

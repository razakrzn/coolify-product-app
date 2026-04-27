# 🚀 Product Store — Coolify Test Deploy

**Stack:** Vite + React · Express API · PostgreSQL · Docker Compose · Nginx

---

## Local Dev

```bash
# Terminal 1 — Start Postgres (Docker)
docker run -d --name pg \
  -e POSTGRES_DB=productdb \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 postgres:16-alpine

# Terminal 2 — API
cd api
npm install
DATABASE_URL=postgresql://appuser:secret@localhost:5432/productdb npm run dev

# Terminal 3 — Web (proxies /api → localhost:3000)
cd web && npm install && npm run dev
```

Visit: http://localhost:5173

---

## Docker Local Test (Full Stack)

```bash
cp .env.example .env       # defaults work out of the box
docker compose up --build
```

Visit: http://localhost  
Data persists in `pgdata` Docker volume ✅

---

## Deploy to Coolify

### Option A — Coolify-managed DB (Recommended)
1. **Coolify → New Resource → PostgreSQL** → note the connection string
2. **Coolify → New Resource → Docker Compose** → select your repo
3. Compose Path: `/docker-compose.yml`
4. **Remove the `db` service block** from compose (Coolify manages it)
5. Set env vars:
   ```
   DATABASE_URL=postgresql://...  ← from step 1
   POSTGRES_USER=appuser
   POSTGRES_PASSWORD=secret
   POSTGRES_DB=productdb
   ```
6. Add domain → point to `web` port `80` → **Deploy**

### Option B — DB inside compose (simpler)
1. Push repo to GitHub as-is
2. **Coolify → New Resource → Docker Compose**
3. Set env vars: `POSTGRES_PASSWORD=yourpassword`
4. Add domain → Deploy ✅

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + DB status |
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Create product |
| DELETE | `/api/products/:id` | Delete product |

### POST body example
```json
{
  "name": "Wireless Headset",
  "price": 59.99,
  "category": "Electronics",
  "stock": 25
}
```

---

## How it works

- API auto-creates the `products` table on first boot
- Seeds 6 sample products if table is empty
- Data **persists** across restarts via PostgreSQL volume
- Health check verifies DB connectivity — Coolify waits for it before starting `web`

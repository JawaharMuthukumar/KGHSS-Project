# KGHSS Project: Team Setup and Data Sharing

## Important: what does a git push include, and what does it not?

Git only carries **code**. It does **not** carry database data.

| Goes to git | Does NOT go to git |
|---|---|
| Backend / frontend code | MySQL data (Docker volume `ghss_mysql_data`, stored only on the original laptop) |
| `docker-compose.yml` | `.env` (listed in `.gitignore`) |
| `.env.example` | `D:\ghss_backup.sql` (stored on D:, not in the repo) |
| | Files uploaded into `backend/uploads` (images etc.). Share them separately if needed |

So when a team member pulls, they get the **code, but an empty database**. The data you created on your laptop is not visible to them.

## Flow for a team member who has Docker

```
git pull  ->  docker compose up -d  ->  start backend  ->  start frontend
               (empty ghss_portal DB)    (tables auto-created)
```

**Step 1: Pull**
```
git pull origin main
```

**Step 2:** Open Docker Desktop and wait until it shows "Engine running".

**Step 3: Start MySQL from the project root**
```
cd "D:\Website Kghss\KGHSS-Project"
docker compose up -d
docker ps
```
`ghss-mysql` should show as Up. Wait 30-60 seconds for MySQL to be ready.

**Step 4: Backend**
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
When `Application startup complete.` appears, the tables have been created automatically (empty).

**Step 5: Frontend** (in a new terminal)
```
cd frontend
npm install
npm run dev
```

The database they see at this point is **empty**. To share data, set up a seed file as described below.

## Sharing data: seed file setup (one-time, done by the original developer)

**Step A: Dump the data** (CMD, Docker must be Up)
```
cd "D:\Website Kghss\KGHSS-Project"
mkdir db\init
docker exec ghss-mysql mysqldump -u root -proot-dev-pass --no-tablespaces ghss_portal > db\init\01-seed.sql
```

**Step B: Add one line under `volumes` in `docker-compose.yml`**
```yaml
    volumes:
      - ghss_mysql_data:/var/lib/mysql
      - ./db/init:/docker-entrypoint-initdb.d:ro
```

**Step C: In `.gitignore`, if `*.sql` is already listed, add this exception**
```
*.sql
!db/init/*.sql
```

**Step D: Push**
```
git add docker-compose.yml db/init/01-seed.sql .gitignore
git commit -m "Add MySQL seed data"
git push origin main
```

Now when a team member runs `docker compose up -d`, MySQL imports `01-seed.sql` automatically on its **first start**, and their database contains your data.

**Important points**
- The seed runs **only on an empty volume**. If a team member already ran `docker compose up` (empty DB), the seed will not run again. In that case:
  ```
  docker compose down -v
  docker compose up -d
  ```
  (`-v` deletes the volume, so their local data is lost. The seed is then loaded again.)
- Check whether the seed contains **real student/parent personal data, phone numbers or password hashes**. If this is school data, do not push it to the repo. Use dummy/sample data only (an admin user plus sample classes).
- If you update the seed, dump again and push. Team members must run `docker compose down -v` and then `up -d` to pick it up.

## What if a team member does not have Docker?

**Option 1 (recommended): Install Docker Desktop**
1. Download and install Docker Desktop for Windows from docker.com.
2. Restart. WSL2 / virtualization must be enabled (Virtualization ON in BIOS).
3. Once "Engine running" appears, follow the flow above.

**Option 2: Install MySQL directly, without Docker**
1. Install MySQL 8 Community Server (MySQL Installer) and set a root password.
2. Connect as root (Workbench or command line) and run:
   ```sql
   CREATE DATABASE ghss_portal CHARACTER SET utf8mb4;
   CREATE USER 'ghss_user'@'localhost' IDENTIFIED BY 'change-this';
   GRANT ALL PRIVILEGES ON ghss_portal.* TO 'ghss_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Import the seed data (if wanted):
   ```
   mysql -u root -p ghss_portal < db\init\01-seed.sql
   ```
4. Copy `.env.example` to `.env`. In `DATABASE_URL` use `127.0.0.1:3306`, user `ghss_user`, password `change-this` (same values as the Docker setup).
5. Start the backend and frontend as in Steps 4 and 5 above.

MySQL then runs as a Windows service and starts automatically when the laptop boots.

## Summary

| Situation | What to do |
|---|---|
| Has Docker | `git pull` -> `docker compose up -d` -> backend -> frontend |
| No Docker | Install Docker Desktop, or install MySQL directly and create the DB and user |
| Needs the data | Push the seed file (`db/init/01-seed.sql`), then `docker compose down -v` and `up -d` |
| Needs uploaded images | Share `backend/uploads` separately (zip / shared drive), or move to object storage such as S3 |

*Note: the passwords in this guide (`root-dev-pass`, `change-this`) are for local development only. Never use them in production.*

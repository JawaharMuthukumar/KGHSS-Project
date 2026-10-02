## Local setup

1. Install Docker Desktop and wait for "Engine running".
2. From the project root: `docker compose up -d`
3. Backend:
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   uvicorn app.main:app --reload
4. Frontend:
   cd frontend
   npm install
   npm run dev

Tables are created automatically on first backend start.
Data lives in the Docker volume `ghss_mysql_data`, local to each machine.
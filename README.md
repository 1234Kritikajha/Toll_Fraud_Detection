# Toll Detection

Clean split between the FastAPI backend and Vite React frontend.

## Structure

```text
backend/
  main.py
  requirements.txt
  db/
  routers/
  services/
  models/

frontend/
  package.json
  index.html
  src/
```

## Backend

```powershell
cd backend
C:\Users\preet\AppData\Local\Programs\Python\Python310\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Frontend

```powershell
cd frontend
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

Backend URL: `http://127.0.0.1:8000`


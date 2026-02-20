# Datahorse Survey Platform

A professional survey platform for datahorse.no — Django backend + React frontend.

---

## QUICK START

### Step 1 — Create MySQL Database

Open MySQL and run:
```sql
CREATE DATABASE datahorse_survey CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Step 2 — Backend Setup (Django)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it:
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env — set your DB_PASSWORD and a new SECRET_KEY

# Run migrations (creates all tables)
python manage.py migrate

# Create your super admin account
python manage.py createsuperuser

# Start the backend server
python manage.py runserver
```

Backend runs at: http://localhost:8000

---

### Step 3 — Frontend Setup (React)

Open a NEW terminal:

```bash
cd frontend

# Install packages
npm install

# Start the dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## ACCESSING THE APP

| What | URL |
|------|-----|
| Admin Panel | http://localhost:5173/admin |
| Admin Login | http://localhost:5173/admin/login |
| Example Survey | http://localhost:5173/your-survey-slug |

---

## HOW TO CREATE YOUR FIRST SURVEY

1. Go to http://localhost:5173/admin/login
2. Sign in with the superuser you created
3. Click **New Survey**
4. Fill in title, description, optional cover image
5. Add questions — choose type: Single Choice, Multiple Choice, or Open Text
6. Add an optional heading per question
7. Toggle each question Required or Optional
8. Set status to **Active**
9. Click **Create Survey**
10. Copy the survey URL from Results page and share it

---

## PROJECT STRUCTURE

```
datahorse_survey/
├── backend/                  ← Django project
│   ├── config/               ← Settings, URLs
│   ├── surveys/              ← Main app (models, views, API)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example          ← Copy to .env and fill in
│
└── frontend/                 ← React project
    ├── src/
    │   ├── admin/            ← Admin panel screens
    │   ├── survey/           ← Public survey screens
    │   ├── components/       ← Shared components
    │   └── api/              ← All API calls
    ├── package.json
    └── vite.config.js
```

---

## SURVEY FEATURES

**Admin can:**
- Create, edit, delete surveys
- Add unlimited questions (single choice, multiple choice, open text)
- Add optional heading per question
- Set each question as required or optional
- Upload a cover image for the welcome screen
- Drag to reorder questions
- Toggle whether users see results after submitting
- Set survey status: Draft / Active / Closed
- View full results with bar charts and open text answers
- Export results to CSV or PDF

**Users (respondents):**
- Open the survey link — no login needed, fully anonymous
- See welcome screen with cover image, title, description
- Answer one question at a time with smooth Next flow
- Required questions: Next button activates only after answering
- Optional questions: Next always available
- After submitting: see live results with bar charts (if enabled by admin)

**Duplicate protection:**
- One submission per IP address per survey
- Silent — no cookie banners, no consent screens

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Django 5 + Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | MySQL 8 |
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| HTTP | Axios |
| Charts | Recharts (built-in) / custom CSS bars |
| Drag & Drop | @hello-pangea/dnd |
| Notifications | react-hot-toast |
| PDF Export | ReportLab |

---

## FOR PRODUCTION DEPLOYMENT

1. Set `DEBUG=False` in `.env`
2. Set `ALLOWED_HOSTS` to your domain
3. Run `npm run build` in frontend — deploy `dist/` folder
4. Use gunicorn + nginx for Django
5. Set `FRONTEND_URL` to your production domain in `.env`
6. Run `python manage.py collectstatic` for admin static files

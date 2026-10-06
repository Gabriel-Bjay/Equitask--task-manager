# EquiTask — Workload Management System

A full-stack web application that helps managers distribute tasks fairly and equitably across their teams. Built as a final-year Computer Science capstone project at Riara University.

![EquiTask Dashboard](./assets/My%20tasks.png)

## What It Does

Most task management tools let managers assign tasks manually with no guidance on fairness or workload balance. EquiTask solves this by combining task management with a scoring algorithm that recommends who should be assigned each task based on their skills and current workload, and a live RAPID compliance dashboard that tracks how equitably tasks have been distributed over time.

**For managers:**

- Create and assign tasks with AI-assisted recommendations
- View team workload at a glance
- Track RAPID compliance scores to ensure fair distribution
- Manage user roles and team members

**For team members:**

- View assigned tasks and update their status
- See their own workload and performance metrics

## Tech Stack

|Layer             |Technology                    |
|------------------|------------------------------|
|Backend           |Django REST Framework (Python)|
|Frontend          |React + TypeScript            |
|State Management  |Redux Toolkit                 |
|Database          |MySQL                         |
|Authentication    |JWT (JSON Web Tokens)         |
|UI Components     |Material-UI                   |
|Data Visualisation|Recharts                      |

## Key Features

- **Task recommendation engine** — weighted scoring algorithm matches tasks to team members by skill set and current workload
- **Explainable, accountable assignment** — every candidate shows five component scores and a plain-English reason; choosing someone other than the top recommendation requires a recorded justification
- **Self-improving weights** — a weekly Celery job retrains the scoring weights with logistic regression on real outcomes (on time and quality), with a cold-start guard
- **RAPID compliance dashboard** — live charts showing workload equity and accountability metrics over time
- **Role-based access control** — separate views and permissions for managers and team members
- **JWT authentication** — secure login with token refresh
- **REST API** — fully documented Django REST Framework backend consumed by the React frontend

## Project Structure

```
equitask/
├── equitask-backend/     # Django REST Framework API
│   └── apps/
│       ├── analytics/        # RAPID scoring logic
│       ├── authentication/   # User management and auth
│       ├── notifications/    # Notifications
│       ├── recommendations/  # Recommendation engine
│       └── tasks/            # Task management app
└── equitask-frontend/    # React + TypeScript SPA
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Route-level pages
    │   ├── store/        # Redux Toolkit slices
    │   └── services/     # API service layer
```

## Getting Started

### Prerequisites

- Python 3.10–3.12 (the pinned numpy and scikit-learn have no 3.13 wheels)
- Node.js 18+
- MySQL (optional locally: SQLite is used when `DB_ENGINE` is unset)

### Backend Setup

```bash
cd equitask-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the backend root:

```env
SECRET_KEY=your_django_secret_key
DEBUG=True
DB_ENGINE=mysql
DB_NAME=equitask
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```

Leave out `DB_ENGINE` (and the `DB_*` lines) to use a local SQLite file instead. Deployments need a database that outlives the server, since most hosts wipe the filesystem on every redeploy: set `DATABASE_URL` (PostgreSQL or MySQL, for example a Neon connection string), or use `DB_ENGINE=mysql`.

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

New accounts are team members. To manage tasks, set your user's role to Administrator or Manager in `/admin/`, or load demo data with `python manage.py seed_simulation`, which creates a demo manager, 25 team members, and 400 historical tasks for the engine to learn from.

### Tests

```bash
python manage.py test
```

### Background jobs

Deadline reminders, overdue checks, daily workload metrics, and the weekly weight retraining run on Celery Beat (Redis broker, `REDIS_URL`):

```bash
celery -A equitask_backend worker -B -l info
```

Each job can also be run by hand, for example `python manage.py retrain_weights`. On hosting without a worker, the [Scheduled jobs workflow](.github/workflows/scheduled-jobs.yml) runs the same commands on the same schedule from GitHub Actions (see below).

### Frontend Setup

```bash
cd equitask-frontend
npm install
```

Create a `.env` file in the frontend root:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

```bash
npm start
```

## Deploying for free

EquiTask runs on free plans with no card: the database on [Neon](https://neon.com), the API on [Render](https://render.com), the frontend on [Vercel](https://vercel.com), and the background jobs on GitHub Actions. Choose the same region for Neon and Render (Frankfurt is closest to East Africa).

1. **Database (Neon).** Create a project, open **Connect**, turn off connection pooling, and copy the connection string (`postgresql://...`).
2. **API (Render).** Create a **Web Service** from this repo:

   | Setting | Value |
   | --- | --- |
   | Root Directory | `equitask-backend` |
   | Build Command | `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate && python manage.py ensure_admin` |
   | Start Command | `gunicorn equitask_backend.wsgi --workers 1 --threads 4 --timeout 120` |

   Environment variables: `PYTHON_VERSION` = `3.11.9`, `SECRET_KEY` (use **Generate**), `DATABASE_URL` (from Neon), and `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the administrator account, which every deploy creates or restores. Add `FRONTEND_URL` once the frontend has its address.
3. **Frontend (Vercel).** Import this repo with **Root Directory** `equitask-frontend` and set `REACT_APP_API_URL` to the Render address plus `/api` (for example `https://equitask-api.onrender.com/api`). Then set `FRONTEND_URL` on Render to the Vercel address, with no trailing slash.
4. **Background jobs (GitHub Actions).** Under **Settings → Secrets and variables → Actions**, add `DATABASE_URL` and `SECRET_KEY` with the same values as on Render. To check it, run **Actions → Scheduled jobs → Run workflow**.

What to expect on free plans: the API sleeps after 15 minutes without visits, so the first request afterwards takes about a minute. Uploaded profile pictures don't last, because the free server's disk is wiped whenever it restarts, sleeps or redeploys. GitHub pauses scheduled workflows after 60 days without commits; re-enable it from the **Actions** tab.

### Public demo

To let visitors try EquiTask without signing up, set `DEMO_PASSWORD` on Render and add `&& python manage.py ensure_demo` to the end of the build command. The next deploy loads a sample product team: a manager, ten team members, four months of finished work for the recommendation engine to learn from, and a live board of pending, in-progress and overdue tasks with notifications. Later deploys leave the data alone.

The sign-in page then offers **Manager** and **Team member** demo buttons that sign in without a password. Administrator is never offered. The demo accounts can't change their profile or password, or close the account, so every visitor finds them the same way. The Scheduled jobs workflow runs `ensure_demo --refresh` every Sunday, which rebuilds the demo board around the current date and clears visitors' changes. Leave `DEMO_PASSWORD` empty on a deployment with real data.

## Screenshots

|Login                                   |Task List                  |Dashboard                     |
|----------------------------------------|---------------------------|------------------------------|
|![Login](./assets/Fig%204.1%20login%20page.png)|![Tasks](./assets/Task%20List.png)|![Dashboard](./assets/My%20tasks.png)|

## What I Learned

This project pushed me to think about software beyond just making it work. Designing the recommendation algorithm meant thinking carefully about data modelling before writing any code — the MySQL schema had to support efficient real-time queries across workload history and skill profiles simultaneously. Building the RAPID dashboard required translating a fairness framework from organisational theory into scoring logic and then into a visual interface. It also reinforced the value of separating concerns cleanly: the Django REST API handles all business logic, and the React frontend is purely presentational with Redux managing state.

## Author

**Bjay Mburu Makara**
[linkedin.com/in/bjay-makara](https://www.linkedin.com/in/bjay-makara)

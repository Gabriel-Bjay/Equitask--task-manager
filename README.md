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

Leave out `DB_ENGINE` (and the `DB_*` lines) to use a local SQLite file instead. Deployments must use MySQL, since most hosts wipe the filesystem on every redeploy.

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

Each job can also be run by hand, for example `python manage.py retrain_weights`.

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

## Screenshots

|Login                                   |Task List                  |Dashboard                     |
|----------------------------------------|---------------------------|------------------------------|
|![Login](./assets/Fig%204.1%20login%20page.png)|![Tasks](./assets/Task%20List.png)|![Dashboard](./assets/My%20tasks.png)|

## What I Learned

This project pushed me to think about software beyond just making it work. Designing the recommendation algorithm meant thinking carefully about data modelling before writing any code — the MySQL schema had to support efficient real-time queries across workload history and skill profiles simultaneously. Building the RAPID dashboard required translating a fairness framework from organisational theory into scoring logic and then into a visual interface. It also reinforced the value of separating concerns cleanly: the Django REST API handles all business logic, and the React frontend is purely presentational with Redux managing state.

## Author

**Bjay Mburu Makara**
[linkedin.com/in/bjay-makara](https://www.linkedin.com/in/bjay-makara)

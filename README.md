# EquiTask — Workload Management System

A full-stack web application that helps managers distribute tasks fairly and equitably across their teams. Built as a final-year Computer Science capstone project at Riara University.

![EquiTask Dashboard](./My%20tasks.png)

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
- **RAPID compliance dashboard** — live charts showing workload equity and accountability metrics over time
- **Role-based access control** — separate views and permissions for managers and team members
- **JWT authentication** — secure login with token refresh
- **REST API** — fully documented Django REST Framework backend consumed by the React frontend

## Project Structure

```
equitask/
├── equitask-backend/     # Django REST Framework API
│   ├── tasks/            # Task management app
│   ├── users/            # User management and auth
│   └── analytics/        # RAPID scoring logic
└── equitask-frontend/    # React + TypeScript SPA
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Route-level pages
    │   ├── store/        # Redux Toolkit slices
    │   └── services/     # API service layer
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL

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
DB_NAME=equitask
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd equitask-frontend
npm install
```

Create a `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:8000/api
```

```bash
npm run dev
```

## Screenshots

|Login                                   |Task List                  |Dashboard                     |
|----------------------------------------|---------------------------|------------------------------|
|![Login](./Fig%204.1%20login%20page.png)|![Tasks](./Task%20List.png)|![Dashboard](./My%20tasks.png)|

## What I Learned

This project pushed me to think about software beyond just making it work. Designing the recommendation algorithm meant thinking carefully about data modelling before writing any code — the MySQL schema had to support efficient real-time queries across workload history and skill profiles simultaneously. Building the RAPID dashboard required translating a fairness framework from organisational theory into scoring logic and then into a visual interface. It also reinforced the value of separating concerns cleanly: the Django REST API handles all business logic, and the React frontend is purely presentational with Redux managing state.

## Author

**Bjay Mburu Makara**
[linkedin.com/in/bjay-makara](https://www.linkedin.com/in/bjay-makara)

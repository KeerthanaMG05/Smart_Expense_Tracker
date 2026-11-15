# 💰 Smart Expense Tracker v2 (AAT-2)

AAT-2 extension of the Smart Expense Tracker (AAT-1, Flask). The backend is rebuilt as a **Node.js + Express REST API**
with an **SQL.js** database, and new features are added with the help of an AI coding assistant (Claude).

## Objective
Use an AI-assisted workflow responsibly to extend an existing full stack application, then review, test and understand the generated code.

## What's new compared to AAT-1
| Feature | AAT-1 (Flask) | AAT-2 (Node/Express) |
|---|---|---|
| Backend | Flask + sqlite3 | Express 5 + SQL.js |
| API | one read-only endpoint | full REST CRUD (`GET/POST/PUT/DELETE`) |
| Edit expense | ✗ | ✔ |
| Monthly category budgets + alerts (80% / 100%) | ✗ | ✔ |
| Title search | ✗ | ✔ |
| CSV export | ✗ | ✔ |
| Validation | basic | server-side JSON errors (400/404) |
| Frontend | server-rendered Jinja | single page, `fetch()` to the API |

## Tools
Node.js 18+, Express.js, SQL.js, HTML, CSS, JavaScript, Git/GitHub, Claude (AI assistant)

## Run
```bash
npm install
npm start            # http://localhost:3000
npm run seed         # (optional, in a 2nd terminal) load sample data
```

## REST API
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/expenses?category=Food&q=tea` | list / filter / search |
| POST | `/api/expenses` | create (201) |
| PUT | `/api/expenses/:id` | update |
| DELETE | `/api/expenses/:id` | delete (204) |
| GET | `/api/budgets` · PUT `/api/budgets/:category` | read / set monthly limit |
| GET | `/api/summary?month=YYYY-MM` | spent vs limit + status per category |
| GET | `/api/export.csv` | download all expenses |

## Screenshots
See the `screenshots/` folder.

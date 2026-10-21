"""Smart Expense Tracker - Flask + SQLite full stack application."""
import sqlite3
from datetime import date
from flask import Flask, render_template, request, redirect, url_for, jsonify, g

app = Flask(__name__)
DATABASE = "expenses.db"
CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Education", "Other"]

# Default sample expenses matching the demo screenshots (output_1_dashboard.png)
DEMO_EXPENSES = [
    ("Lunch at canteen", 120.0, "Food", "2026-10-18"),
    ("Metro card recharge", 500.0, "Transport", "2026-10-17"),
    ("Python book", 650.0, "Education", "2026-10-15"),
    ("Mobile recharge", 299.0, "Bills", "2026-10-14"),
    ("Movie tickets", 450.0, "Entertainment", "2026-10-12"),
    ("Groceries", 880.0, "Food", "2026-10-10"),
    ("T-shirt", 799.0, "Shopping", "2026-10-08"),
]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create database tables and auto-seed sample demo data if empty."""
    with sqlite3.connect(DATABASE) as con:
        con.execute(
            """CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                spent_on TEXT NOT NULL)"""
        )
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM expenses")
        if cur.fetchone()[0] == 0:
            con.executemany(
                "INSERT INTO expenses (title, amount, category, spent_on) VALUES (?,?,?,?)",
                DEMO_EXPENSES,
            )
            con.commit()


# Ensure database and demo data exist on launch
init_db()


@app.route("/")
def index():
    db = get_db()
    cat = request.args.get("category", "All")
    if cat != "All":
        rows = db.execute(
            "SELECT * FROM expenses WHERE category=? ORDER BY spent_on DESC, id DESC",
            (cat,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM expenses ORDER BY spent_on DESC, id DESC"
        ).fetchall()
    total = sum(r["amount"] for r in rows)
    return render_template(
        "index.html",
        expenses=rows,
        total=total,
        categories=CATEGORIES,
        selected=cat,
        today=date.today().isoformat(),
    )


@app.route("/add", methods=["POST"])
def add():
    title = request.form.get("title", "").strip()
    category = request.form.get("category", "Other")
    spent_on = request.form.get("spent_on") or date.today().isoformat()
    try:
        amount = float(request.form.get("amount", "0"))
    except ValueError:
        amount = 0
    if title and amount > 0 and category in CATEGORIES:
        db = get_db()
        db.execute(
            "INSERT INTO expenses (title, amount, category, spent_on) VALUES (?,?,?,?)",
            (title, amount, category, spent_on),
        )
        db.commit()
    return redirect(url_for("index"))


@app.route("/delete/<int:expense_id>", methods=["POST"])
def delete(expense_id):
    db = get_db()
    db.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
    db.commit()
    cat = request.args.get("category")
    if cat and cat in CATEGORIES:
        return redirect(url_for("index", category=cat))
    return redirect(url_for("index"))


@app.route("/api/summary")
def summary():
    """JSON endpoint: total spent per category (used by the chart)."""
    rows = get_db().execute(
        "SELECT category, ROUND(SUM(amount),2) AS total FROM expenses GROUP BY category ORDER BY total DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    init_db()
    app.run(debug=True)

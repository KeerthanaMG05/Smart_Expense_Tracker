"""Seed or reset sample demo data matching project screenshots."""
import sqlite3
from app import init_db, DATABASE, DEMO_EXPENSES

init_db()

with sqlite3.connect(DATABASE) as con:
    con.execute("DELETE FROM expenses")
    con.executemany("INSERT INTO expenses (title, amount, category, spent_on) VALUES (?,?,?,?)", DEMO_EXPENSES)
    con.commit()

print("Successfully seeded demo data (7 expenses, matching output_1_dashboard.png).")


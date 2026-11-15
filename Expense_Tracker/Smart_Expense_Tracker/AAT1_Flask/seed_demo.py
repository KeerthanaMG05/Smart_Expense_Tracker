"""Optional: load sample data for demo/screenshots."""
import sqlite3
from app import init_db, DATABASE
init_db()
rows = [("Lunch at canteen",120,"Food","2026-10-18"),("Metro card recharge",500,"Transport","2026-10-17"),
        ("Python book",650,"Education","2026-10-15"),("Mobile recharge",299,"Bills","2026-10-14"),
        ("Movie tickets",450,"Entertainment","2026-10-12"),("Groceries",880,"Food","2026-10-10"),
        ("T-shirt",799,"Shopping","2026-10-08")]
with sqlite3.connect(DATABASE) as con:
    con.executemany("INSERT INTO expenses (title,amount,category,spent_on) VALUES (?,?,?,?)", rows)

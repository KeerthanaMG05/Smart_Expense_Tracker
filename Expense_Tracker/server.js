// Smart Expense Tracker v2 - Node.js + Express + SQL.js (REST API)
const express = require("express");
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "expenses.db");
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Education", "Other"];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

// ---- helpers ---------------------------------------------------------
function save() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function validate(body) {
  const title = String(body.title || "").trim();
  const amount = Number(body.amount);
  const category = body.category;
  const spent_on = body.spent_on || new Date().toISOString().slice(0, 10);
  if (!title || title.length > 80) return { error: "Title is required (max 80 characters)." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be a positive number." };
  if (!CATEGORIES.includes(category)) return { error: "Invalid category." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spent_on)) return { error: "Date must be YYYY-MM-DD." };
  return { value: { title, amount, category, spent_on } };
}

// ---- REST API ----------------------------------------------------------
app.get("/api/categories", (req, res) => res.json(CATEGORIES));

// READ (with optional ?category= and ?q= search)
app.get("/api/expenses", (req, res) => {
  const { category, q } = req.query;
  let sql = "SELECT * FROM expenses WHERE 1=1";
  const params = [];
  if (category && category !== "All") { sql += " AND category = ?"; params.push(category); }
  if (q) { sql += " AND title LIKE ?"; params.push(`%${q}%`); }
  sql += " ORDER BY spent_on DESC, id DESC";
  res.json(all(sql, params));
});

// CREATE
app.post("/api/expenses", (req, res) => {
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });
  db.run("INSERT INTO expenses (title, amount, category, spent_on) VALUES (?,?,?,?)",
    [value.title, value.amount, value.category, value.spent_on]);
  const id = all("SELECT last_insert_rowid() AS id")[0].id;
  save();
  res.status(201).json(all("SELECT * FROM expenses WHERE id = ?", [id])[0]);
});

// UPDATE
app.put("/api/expenses/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!all("SELECT id FROM expenses WHERE id = ?", [id]).length) return res.status(404).json({ error: "Expense not found." });
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });
  db.run("UPDATE expenses SET title=?, amount=?, category=?, spent_on=? WHERE id=?",
    [value.title, value.amount, value.category, value.spent_on, id]);
  save();
  res.json(all("SELECT * FROM expenses WHERE id = ?", [id])[0]);
});

// DELETE
app.delete("/api/expenses/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!all("SELECT id FROM expenses WHERE id = ?", [id]).length) return res.status(404).json({ error: "Expense not found." });
  db.run("DELETE FROM expenses WHERE id = ?", [id]);
  save();
  res.status(204).end();
});

// Budgets: monthly limit per category
app.get("/api/budgets", (req, res) => res.json(all("SELECT category, monthly_limit FROM budgets")));
app.put("/api/budgets/:category", (req, res) => {
  const { category } = req.params;
  const limit = Number(req.body.monthly_limit);
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category." });
  if (!Number.isFinite(limit) || limit < 0) return res.status(400).json({ error: "Limit must be 0 or more." });
  db.run("INSERT INTO budgets (category, monthly_limit) VALUES (?,?) " +
         "ON CONFLICT(category) DO UPDATE SET monthly_limit = excluded.monthly_limit", [category, limit]);
  save();
  res.json({ category, monthly_limit: limit });
});

// Summary for one month (?month=YYYY-MM): spent vs budget per category + status
app.get("/api/summary", (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : new Date().toISOString().slice(0, 7);
  const rows = all(
    `SELECT c.category AS category, COALESCE(SUM(e.amount),0) AS spent, COALESCE(b.monthly_limit,0) AS monthly_limit
     FROM (SELECT ? AS category ${CATEGORIES.slice(1).map(() => "UNION SELECT ?").join(" ")}) c
     LEFT JOIN expenses e ON e.category = c.category AND substr(e.spent_on,1,7) = ?
     LEFT JOIN budgets b ON b.category = c.category
     GROUP BY c.category`, [...CATEGORIES, month]);
  const data = rows.map(r => {
    const pct = r.monthly_limit > 0 ? (r.spent / r.monthly_limit) * 100 : null;
    return { ...r, spent: Math.round(r.spent * 100) / 100, percent: pct === null ? null : Math.round(pct),
      status: pct === null ? "no-budget" : pct >= 100 ? "over" : pct >= 80 ? "warning" : "ok" };
  }).sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
  res.json({ month, categories: data, total: Math.round(data.reduce((s, r) => s + r.spent, 0) * 100) / 100 });
});

// CSV export
app.get("/api/export.csv", (req, res) => {
  const rows = all("SELECT id, spent_on, title, category, amount FROM expenses ORDER BY spent_on DESC, id DESC");
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ["id,date,title,category,amount", ...rows.map(r => [r.id, r.spent_on, esc(r.title), r.category, r.amount].join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
  res.send(csv);
});

// ---- start ------------------------------------------------------------------
async function start() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, amount REAL NOT NULL,
            category TEXT NOT NULL, spent_on TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS budgets (category TEXT PRIMARY KEY, monthly_limit REAL NOT NULL);`);
  save();
  app.listen(PORT, () => console.log(`Smart Expense Tracker v2 running at http://localhost:${PORT}`));
}
start();

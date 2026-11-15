// Optional: load sample data into a running server via the REST API (start `npm start` first)
const base = "http://localhost:" + (process.env.PORT || 3000);
const m = new Date().toISOString().slice(0, 7);
const data = [
  ["Lunch at canteen", 120, "Food", 18], ["Groceries", 880, "Food", 10], ["Metro card recharge", 500, "Transport", 17],
  ["Python book", 650, "Education", 15], ["Mobile recharge", 299, "Bills", 14], ["Movie tickets", 450, "Entertainment", 12],
  ["T-shirt", 1799, "Shopping", 8]];
(async () => {
  for (const [title, amount, category, d] of data)
    await fetch(base + "/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, amount, category, spent_on: `${m}-${String(d).padStart(2, "0")}` }) });
  for (const [c, l] of [["Food", 1200], ["Shopping", 2000], ["Entertainment", 500], ["Transport", 1000]])
    await fetch(`${base}/api/budgets/${c}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_limit: l }) });
  console.log("Sample data loaded.");
})();

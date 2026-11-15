// Smart Expense Tracker v2 - frontend (talks to the Express REST API)
const $ = id => document.getElementById(id);
let editingId = null;
let categories = [];

const money = n => "₹" + Number(n).toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function init() {
  categories = await api("/api/categories");
  $("category").innerHTML = categories.map(c => `<option>${c}</option>`).join("");
  $("filter").innerHTML = ["All", ...categories].map(c => `<option>${c}</option>`).join("");
  $("spent_on").value = new Date().toISOString().slice(0, 10);
  $("month").value = new Date().toISOString().slice(0, 7);
  refresh();
}

async function loadExpenses() {
  const q = encodeURIComponent($("search").value.trim());
  const rows = await api(`/api/expenses?category=${encodeURIComponent($("filter").value)}&q=${q}`);
  $("total").textContent = money(rows.reduce((s, r) => s + r.amount, 0));
  $("rows").innerHTML = rows.length ? rows.map(r => `
    <tr><td>${r.spent_on}</td><td>${esc(r.title)}</td><td><span class="tag">${r.category}</span></td>
    <td>${money(r.amount)}</td>
    <td><button class="edit" onclick='startEdit(${JSON.stringify(r)})'>✎</button>
        <button class="del" onclick="removeExpense(${r.id})">✕</button></td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">No expenses found.</td></tr>`;
}

async function loadBudgets() {
  const s = await api(`/api/summary?month=${$("month").value}`);
  const alerts = s.categories.filter(c => c.status === "over" || c.status === "warning");
  $("alerts").innerHTML = alerts.length
    ? alerts.map(c => `<span class="alert ${c.status}">${c.status === "over" ? "⛔ Over budget" : "⚠ 80%+ used"}: ${c.category} (${c.percent}%)</span>`).join("")
    : `<span class="alert good">✔ All budgets are within limits · Month total ${money(s.total)}</span>`;
  $("budgets").innerHTML = s.categories.map(c => `
    <div class="bud"><div class="top"><span><b>${c.category}</b> — ${money(c.spent)}${c.monthly_limit ? " of " + money(c.monthly_limit) : ""}</span>
      <span>Limit ₹<input type="number" min="0" value="${c.monthly_limit || ""}" placeholder="set" onchange="setBudget('${c.category}', this.value)"></span></div>
      <div class="track"><div class="fill2 ${c.status}" style="width:${Math.min(c.percent ?? (c.spent ? 100 : 0), 100)}%"></div></div></div>`).join("");
}

const refresh = () => Promise.all([loadExpenses(), loadBudgets()]);

async function setBudget(category, value) {
  await api(`/api/budgets/${category}`, { method: "PUT", body: JSON.stringify({ monthly_limit: value || 0 }) });
  loadBudgets();
}
async function removeExpense(id) {
  if (!confirm("Delete this expense?")) return;
  await api(`/api/expenses/${id}`, { method: "DELETE" });
  refresh();
}
function startEdit(r) {
  editingId = r.id;
  $("title").value = r.title; $("amount").value = r.amount; $("category").value = r.category; $("spent_on").value = r.spent_on;
  $("formTitle").textContent = "Edit Expense"; $("submitBtn").textContent = "Update";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("expenseForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("msg").textContent = "";
  const body = JSON.stringify({ title: $("title").value, amount: $("amount").value, category: $("category").value, spent_on: $("spent_on").value });
  try {
    await api(editingId ? `/api/expenses/${editingId}` : "/api/expenses", { method: editingId ? "PUT" : "POST", body });
    editingId = null; e.target.reset();
    $("spent_on").value = new Date().toISOString().slice(0, 10);
    $("formTitle").textContent = "Add Expense"; $("submitBtn").textContent = "Add";
    refresh();
  } catch (err) { $("msg").textContent = err.message; }
});
$("search").addEventListener("input", loadExpenses);
$("filter").addEventListener("change", loadExpenses);
$("month").addEventListener("change", loadBudgets);
init();

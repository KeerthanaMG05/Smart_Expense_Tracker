// Fetch category totals from the Flask API and draw a simple bar chart.
fetch("/api/summary")
  .then(r => r.json())
  .then(data => {
    const box = document.getElementById("chart");
    if (!data.length) {
      box.innerHTML = "<p class='empty'>Add expenses to see the chart.</p>";
      return;
    }
    const max = Math.max(...data.map(d => d.total));
    box.innerHTML = data.map(d =>
      `<div class="bar"><span class="l">${d.category}</span>
       <div class="fill" style="width:${(d.total / max) * 70}%"></div><b>₹${d.total.toFixed(2)}</b></div>`
    ).join("");
  });

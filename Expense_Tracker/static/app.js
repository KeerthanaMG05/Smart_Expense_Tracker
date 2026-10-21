// Fetch category totals from the Flask API and draw the horizontal spending bar chart.
fetch("/api/summary")
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const box = document.getElementById("chart");
    if (!data || !data.length) {
      box.innerHTML = "<p class='empty'>Add expenses to see the chart.</p>";
      return;
    }
    const max = Math.max(...data.map(d => d.total)) || 1;
    box.innerHTML = data.map(d =>
      `<div class="bar">
        <span class="l">${d.category}</span>
        <div class="fill" style="width: ${(d.total / max) * 70}%"></div>
        <b>₹${d.total.toFixed(2)}</b>
      </div>`
    ).join("");
  })
  .catch(error => {
    console.error("Failed to load category summary:", error);
  });


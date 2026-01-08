function destroyIfExists(chartRef) {
  if (chartRef && typeof chartRef.destroy === "function") chartRef.destroy();
  return null;
}

export function renderCitationsByYear(canvasEl, citationsByYear) {
  const labels = citationsByYear.map(d => String(d.year));
  const values = citationsByYear.map(d => d.citations);

  return new Chart(canvasEl, {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Citations", data: values, tension: 0.25 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

export function renderTopPapers(canvasEl, papers) {
  // take top 8
  const top = [...papers]
    .sort((a,b) => (b.citations ?? 0) - (a.citations ?? 0))
    .slice(0, 8)
    .reverse(); // horizontal bar: smaller on top tends to look nicer reversed

  const labels = top.map(p => p.title.length > 42 ? p.title.slice(0, 39) + "…" : p.title);
  const values = top.map(p => p.citations ?? 0);

  return new Chart(canvasEl, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Citations", data: values }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

import { loadJson } from "./utils.js";
import { renderStats, renderPubsTable } from "./render.js";
import { renderCitationsByYear, renderTopPapers } from "./charts.js";

let chart1 = null;
let chart2 = null;

async function main() {
  const metrics = await loadJson("data/metrics.json");

  renderStats(metrics);

  const sortSelect = document.getElementById("sortSelect");
  const tableWrap = document.getElementById("pubsTableWrap");

  const rerender = () => {
    renderPubsTable(tableWrap, metrics.papers ?? [], sortSelect.value);

    // Recreate charts if needed
    // (Chart.js can glitch if canvas reused incorrectly after layout changes)
  };

  sortSelect.addEventListener("change", rerender);

  // initial render
  rerender();

  // charts
  const c1 = document.getElementById("chartCitationsByYear");
  const c2 = document.getElementById("chartTopPapers");

  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();

  chart1 = renderCitationsByYear(c1, metrics.citations_by_year ?? []);
  chart2 = renderTopPapers(c2, metrics.papers ?? []);
}

main().catch(err => {
  console.error(err);
  document.getElementById("pubsTableWrap").innerHTML =
    `<p class="muted">Failed to load metrics. Check data/metrics.json and console.</p>`;
});

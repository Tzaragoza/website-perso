import { escapeHtml, formatInt } from "./utils.js";

export function renderStats(metrics) {
  document.getElementById("statTotalCites").textContent = formatInt(metrics.total_citations);
  document.getElementById("statPaperCount").textContent = formatInt(metrics.papers?.length ?? 0);

  const dt = metrics.updated_at ? new Date(metrics.updated_at) : null;
  document.getElementById("statUpdatedAt").textContent =
    dt && !isNaN(dt) ? dt.toISOString().slice(0, 10) : "—";
}

export function renderPubsTable(containerEl, pubs, sortMode) {
  const papers = [...pubs];

  const sorters = {
    citations_desc: (a,b) => (b.citations ?? 0) - (a.citations ?? 0),
    year_desc:      (a,b) => (b.year ?? 0) - (a.year ?? 0),
    year_asc:       (a,b) => (a.year ?? 0) - (b.year ?? 0),
    title_asc:      (a,b) => String(a.title).localeCompare(String(b.title))
  };
  papers.sort(sorters[sortMode] ?? sorters.citations_desc);

  const rows = papers.map(p => {
    const title = escapeHtml(p.title ?? "Untitled");
    const url = escapeHtml(p.url ?? "#");
    const year = escapeHtml(String(p.year ?? "—"));
    const cites = formatInt(p.citations);
    const source = escapeHtml(p.source ?? "—");
    const doi = p.doi ? `<span class="badge">DOI</span>` : "";
    const arxiv = p.arxiv ? `<span class="badge">arXiv</span>` : "";

    return `
      <tr>
        <td>
          <a class="paper" href="${url}" target="_blank" rel="noreferrer"><b>${title}</b></a>
          <div class="muted small" style="margin-top:4px">
            ${doi} ${arxiv}
          </div>
        </td>
        <td>${year}</td>
        <td>${cites}</td>
        <td class="muted small">${source}</td>
      </tr>
    `;
  }).join("");

  containerEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Paper</th>
          <th>Year</th>
          <th>Citations</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

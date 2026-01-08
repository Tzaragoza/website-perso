import json
import os
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests


OPENALEX_BASE = "https://api.openalex.org"
USER_AGENT = "your-site-metrics-bot/1.0"  # keep something non-empty


def _get(url: str, params: Optional[dict] = None) -> dict:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    # OpenAlex asks you to include an email when possible
    email = os.getenv("OPENALEX_EMAIL")
    if params is None:
        params = {}
    if email:
        params["mailto"] = email

    r = requests.get(url, params=params, headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def openalex_work_by_doi(doi: str) -> Optional[dict]:
    # OpenAlex stores DOIs lowercase
    doi_norm = doi.strip().lower()
    filt = f"doi:{doi_norm}"
    url = f"{OPENALEX_BASE}/works"
    data = _get(url, params={"filter": filt, "per-page": 1})
    results = data.get("results", [])
    return results[0] if results else None


def openalex_work_by_arxiv(arxiv_id: str) -> Optional[dict]:
    # Best-effort:
    # Some OpenAlex works include arXiv IDs in "ids" or as part of the primary_location URLs,
    # but there isn't a single perfect filter for all cases.
    # We'll search and take the best match containing the arXiv id in any URL string.
    q = arxiv_id.strip()
    url = f"{OPENALEX_BASE}/works"
    data = _get(url, params={"search": q, "per-page": 5})
    results = data.get("results", [])
    q_low = q.lower()
    for w in results:
        ids = w.get("ids") or {}
        # Some records may have ids["arxiv"] as a URL
        arxiv_url = (ids.get("arxiv") or "").lower()
        if q_low in arxiv_url:
            return w
        # Fallback: scan landing page urls
        loc = w.get("primary_location") or {}
        lp = (loc.get("landing_page_url") or "").lower()
        if q_low in lp:
            return w
    return results[0] if results else None


def extract_year(work: dict, fallback: Optional[int] = None) -> Optional[int]:
    # prefer publication_year if present
    y = work.get("publication_year")
    if isinstance(y, int):
        return y
    # fallback to from_date
    from_date = work.get("from_publication_date")
    if isinstance(from_date, str) and len(from_date) >= 4:
        try:
            return int(from_date[:4])
        except ValueError:
            pass
    return fallback


def main() -> None:
    with open("data/pubs.json", "r", encoding="utf-8") as f:
        pubs = json.load(f)

    papers_out: List[Dict[str, Any]] = []
    citations_by_year: Dict[int, int] = {}

    total_citations = 0

    for i, p in enumerate(pubs):
        pid = p.get("id")
        title = p.get("title")
        year_hint = p.get("year")
        doi = p.get("doi")
        arxiv = p.get("arxiv")
        url = p.get("url")

        work = None
        source = None

        try:
            if doi:
                work = openalex_work_by_doi(doi)
                source = "OpenAlex (DOI)"
            elif arxiv:
                work = openalex_work_by_arxiv(arxiv)
                source = "OpenAlex (search)"
        except requests.HTTPError as e:
            print(f"[WARN] HTTP error for {pid}: {e}")
        except Exception as e:
            print(f"[WARN] Unexpected error for {pid}: {e}")

        if work:
            cites = int(work.get("cited_by_count") or 0)
            year = extract_year(work, fallback=year_hint)
        else:
            cites = 0
            year = year_hint
            source = source or "—"

        total_citations += cites
        if isinstance(year, int):
            citations_by_year[year] = citations_by_year.get(year, 0) + cites

        papers_out.append({
            "id": pid,
            "title": title,
            "year": year,
            "doi": doi,
            "arxiv": arxiv,
            "url": url,
            "citations": cites,
            "source": source
        })

        # be polite to APIs (and prevent rate-limit surprises)
        if i < len(pubs) - 1:
            time.sleep(0.2)

    citations_by_year_list = [
        {"year": y, "citations": citations_by_year[y]}
        for y in sorted(citations_by_year.keys())
    ]

    out = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_citations": total_citations,
        "papers": papers_out,
        "citations_by_year": citations_by_year_list
    }

    os.makedirs("data", exist_ok=True)
    with open("data/metrics.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("[OK] Wrote data/metrics.json")


if __name__ == "__main__":
    main()

(function () {
  "use strict";

  const TAG_COLORS = {
    "Deal": "var(--tag-deal)",
    "Company Update": "var(--tag-company)",
    "Economic Driver": "var(--tag-econ)",
    "Macro Data": "var(--tag-macro)",
    "IPO": "var(--tag-ipo)",
    "Regulatory": "var(--tag-reg)",
    "General": "var(--tag-macro)",
  };

  const state = {
    pill: "All",
    view: "feed",
    query: "",
  };

  const feedEl = document.getElementById("feed");
  const pillRowEl = document.getElementById("pill-row");
  const searchInput = document.getElementById("search-input");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalBody = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");
  const toastEl = document.getElementById("toast");
  const updatedLabelEl = document.getElementById("updated-label");

  function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr ago`;
    return `${Math.round(minutes / (60 * 24))} d ago`;
  }

  function setUpdatedLabel() {
    if (typeof LAST_FETCHED_AT === "undefined") {
      updatedLabelEl.textContent = "Feed · never fetched yet — run fetch.js";
      return;
    }
    updatedLabelEl.textContent = `Feed · Updated ${timeAgo(LAST_FETCHED_AT)}`;
  }

  function buildPills() {
    const exchanges = Array.from(
      new Set(NEWS_ITEMS.map((i) => i.exchange).filter((e) => e && !e.startsWith("n/a")))
    ).sort();
    const pills = ["All", ...exchanges, "My Holdings"];
    pillRowEl.innerHTML = "";
    pills.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "pill" + (p === state.pill ? " active" : "");
      btn.textContent = p;
      btn.addEventListener("click", () => {
        state.pill = p;
        render();
      });
      pillRowEl.appendChild(btn);
    });
  }

  function matchesPill(item) {
    if (state.pill === "All") return true;
    if (state.pill === "My Holdings") return !!item.portfolio;
    return item.exchange === state.pill;
  }

  function matchesQuery(item) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    return (
      item.country.toLowerCase().includes(q) ||
      item.headline.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q) ||
      item.industry.toLowerCase().includes(q) ||
      (item.tickers || []).some((t) => t.toLowerCase().includes(q))
    );
  }

  function filteredItems() {
    return NEWS_ITEMS.filter((i) => matchesPill(i) && matchesQuery(i)).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  function badgeLabel(item) {
    const right = item.exchange && !item.exchange.startsWith("n/a") ? item.exchange : item.countryCode;
    return `${item.newsType} · ${right}`;
  }

  function renderCard(item) {
    const card = document.createElement("div");
    card.className = "card" + (item.portfolio ? " in-portfolio" : "");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${item.headline}. Open story.`);
    card.addEventListener("click", () => openModal(item));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(item);
      }
    });

    const tags = document.createElement("div");
    tags.className = "card-tags";

    const mainTag = document.createElement("span");
    mainTag.className = "tag";
    mainTag.style.background = TAG_COLORS[item.newsType] || "#444";
    mainTag.textContent = badgeLabel(item);
    tags.appendChild(mainTag);

    if (item.portfolio) {
      const pTag = document.createElement("span");
      pTag.className = "tag portfolio-tag";
      pTag.textContent = "In your portfolio";
      tags.appendChild(pTag);
    }

    const h3 = document.createElement("h3");
    h3.textContent = item.headline;

    const summary = document.createElement("p");
    summary.className = "summary";
    summary.textContent = item.summary;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${item.source} · ${timeAgo(item.publishedAt)} · ${item.country}`;

    card.appendChild(tags);
    card.appendChild(h3);
    card.appendChild(summary);
    card.appendChild(meta);
    return card;
  }

  function renderFeedView(items) {
    feedEl.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = NEWS_ITEMS.length === 0
        ? "No data yet — run fetch.js once to pull real items."
        : "No stories match this filter yet.";
      feedEl.appendChild(empty);
      return;
    }
    items.forEach((item) => feedEl.appendChild(renderCard(item)));
  }

  function groupBy(items, keyFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }

  function addHeading(container, text, level, count) {
    const h = document.createElement("div");
    h.className = `group-heading level-${level}`;
    const title = document.createElement("span");
    title.className = "g-title";
    title.textContent = text;
    h.appendChild(title);
    if (count !== undefined) {
      const sub = document.createElement("span");
      sub.className = "g-sub";
      sub.textContent = `(${count})`;
      h.appendChild(sub);
    }
    container.appendChild(h);
  }

  function renderCategoryView(items) {
    feedEl.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = NEWS_ITEMS.length === 0
        ? "No data yet — run fetch.js once to pull real items."
        : "No stories match this filter yet.";
      feedEl.appendChild(empty);
      return;
    }

    const byCountry = groupBy(items, (i) => i.country);
    const presentCountries = COUNTRIES.filter((c) => byCountry.has(c));
    // Items whose country isn't in the 54-country list (e.g. "Regional")
    const otherCountries = Array.from(byCountry.keys()).filter((c) => !COUNTRIES.includes(c));

    [...presentCountries, ...otherCountries].forEach((country) => {
      const countryItems = byCountry.get(country);
      addHeading(feedEl, country, "country", countryItems.length);

      const byExchange = groupBy(countryItems, (i) => i.exchange);
      byExchange.forEach((exItems, exchange) => {
        addHeading(feedEl, exchange, "exchange");

        const bySector = groupBy(exItems, (i) => i.sector);
        bySector.forEach((secItems, sector) => {
          addHeading(feedEl, sector, "sector");

          const byIndustry = groupBy(secItems, (i) => i.industry);
          byIndustry.forEach((indItems, industry) => {
            addHeading(feedEl, industry, "industry");
            indItems
              .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
              .forEach((item) => feedEl.appendChild(renderCard(item)));
          });
        });
      });
    });

    // Collapsed note for countries with no live coverage yet, only when unfiltered
    if (state.pill === "All" && !state.query) {
      const covered = new Set(byCountry.keys());
      const uncovered = COUNTRIES.filter((c) => !covered.has(c));
      if (uncovered.length) {
        const details = document.createElement("details");
        details.className = "uncovered";
        details.style.marginTop = "18px";
        const summary = document.createElement("summary");
        summary.textContent = `${uncovered.length} more countries tracked, no live coverage yet`;
        const list = document.createElement("div");
        list.className = "country-block-empty";
        list.textContent = uncovered.join(", ");
        details.appendChild(summary);
        details.appendChild(list);
        feedEl.appendChild(details);
      }
    }
  }

  function render() {
    buildPills();
    const items = filteredItems();
    if (state.view === "feed") {
      renderFeedView(items);
    } else {
      renderCategoryView(items);
    }
  }

  function openModal(item) {
    modalBody.innerHTML = "";

    const tags = document.createElement("div");
    tags.className = "card-tags";
    const mainTag = document.createElement("span");
    mainTag.className = "tag";
    mainTag.style.background = TAG_COLORS[item.newsType] || "#444";
    mainTag.textContent = badgeLabel(item);
    tags.appendChild(mainTag);
    if (item.portfolio) {
      const pTag = document.createElement("span");
      pTag.className = "tag portfolio-tag";
      pTag.textContent = "In your portfolio";
      tags.appendChild(pTag);
    }

    const h2 = document.createElement("h2");
    h2.textContent = item.headline;

    const summaryBox = document.createElement("div");
    summaryBox.className = "summary-box";
    summaryBox.textContent = item.summary;

    const story = document.createElement("p");
    story.className = "story";
    story.textContent = item.story;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${item.source} · ${timeAgo(item.publishedAt)} · ${item.country} · ${item.sector} / ${item.industry}`;

    modalBody.appendChild(tags);
    modalBody.appendChild(h2);
    modalBody.appendChild(summaryBox);
    modalBody.appendChild(story);
    modalBody.appendChild(meta);

    // Prefer the real per-article URL fetch.js captured; fall back to the
    // source's homepage if an item somehow lacks one.
    const url = item.url || SOURCE_URLS[item.source];
    if (url) {
      const link = document.createElement("a");
      link.className = "source-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Read full story at ${item.source} ↗`;
      modalBody.appendChild(link);
    }

    modalBackdrop.classList.remove("hidden");
    modalClose.focus();
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 1800);
  }

  // Wiring
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.view;
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b === btn));
      render();
    });
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nav = btn.dataset.nav;
      if (nav === "feed") return;
      showToast(`${btn.querySelector(".nav-label").textContent} isn't wired up in this MVP yet`);
    });
  });

  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    render();
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  setUpdatedLabel();
  render();
})();

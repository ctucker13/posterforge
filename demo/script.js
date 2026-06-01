const traceSteps = [
  {
    title: "Planning poster",
    detail: "Interpreting the prompt, selecting a results-first structure, and preparing the poster brief."
  },
  {
    title: "Searching sources",
    detail: "Using mock Confluence, GitLab, and paper records as repeatable development sources."
  },
  {
    title: "Extracting evidence",
    detail: "Creating a claim map so poster statements can point back to source material."
  },
  {
    title: "Selecting visuals",
    detail: "Choosing workflow, confusion matrix, Sankey flow, QA summary, and generated-image placeholders."
  },
  {
    title: "Applying theme",
    detail: "Applying the selected theme and keeping palette tokens scoped to the requested design."
  },
  {
    title: "Running QA",
    detail: "Checking for source links, factual visual handling, text density, and export readiness."
  },
  {
    title: "Rendering preview",
    detail: "Composing a browser preview from the poster project spec."
  }
];

const themeMap = {
  natwest: "natwest-theme",
  comic: "comic-theme",
  clean: "clean-theme",
  retro: "retro-theme"
};

const themeLabel = {
  natwest: "NatWest Group",
  comic: "Comic Strip Research",
  clean: "Clean Academic",
  retro: "Retro Time Lab"
};

const sourceLabel = {
  mock: "mock Confluence, GitLab, and paper sources",
  web: "web pages and research papers",
  local: "local project files"
};

const promptInput = document.querySelector("#promptInput");
const themeSelect = document.querySelector("#themeSelect");
const sourceSelect = document.querySelector("#sourceSelect");
const generateButton = document.querySelector("#generateButton");
const traceList = document.querySelector("#traceList");
const traceStatus = document.querySelector("#traceStatus");
const posterPreview = document.querySelector("#posterPreview");

generateButton.addEventListener("click", async () => {
  generateButton.disabled = true;
  traceList.innerHTML = "";
  traceStatus.textContent = "Running";

  for (const [index, step] of traceSteps.entries()) {
    await wait(330);
    addTraceItem(index + 1, step);
  }

  renderPoster();
  traceStatus.textContent = "Complete";
  generateButton.disabled = false;
});

function addTraceItem(number, step) {
  const item = document.createElement("li");
  item.className = "trace-item";
  item.innerHTML = `
    <strong>${number}. ${escapeHtml(step.title)}</strong>
    <p>${escapeHtml(step.detail)}</p>
    <span class="trace-state">complete</span>
  `;
  traceList.appendChild(item);
  item.scrollIntoView({ block: "nearest" });
}

function renderPoster() {
  const theme = themeSelect.value;
  const prompt = promptInput.value.trim();
  const source = sourceSelect.value;
  posterPreview.className = `poster ${themeMap[theme]}`;

  posterPreview.innerHTML = `
    <header class="poster-hero">
      <div>
        <p class="poster-kicker">${escapeHtml(themeLabel[theme])} · source-grounded demo</p>
        <h2>Fraud model monitoring with traceable evidence</h2>
        <p>${escapeHtml(prompt || "Generated from a poster prompt and source-backed evidence.")}</p>
      </div>
      <div class="hero-art" title="Generated image placeholder"></div>
    </header>

    <div class="poster-grid">
      <section class="poster-card">
        <h3>Evidence workflow</h3>
        <div class="visual-box">
          <p><strong>Prompt</strong> -> <strong>Sources</strong> -> <strong>Evidence map</strong> -> <strong>Poster spec</strong> -> <strong>QA</strong> -> <strong>Exports</strong></p>
          <p>Primary source mode: ${escapeHtml(sourceLabel[source])}.</p>
        </div>
      </section>

      <section class="poster-card">
        <h3>Confusion matrix</h3>
        <div class="matrix" aria-label="Example confusion matrix">
          <div class="matrix-cell"><span>True legitimate</span><strong>9,412</strong></div>
          <div class="matrix-cell error"><span>False alarm</span><strong>188</strong></div>
          <div class="matrix-cell error"><span>Missed fraud</span><strong>73</strong></div>
          <div class="matrix-cell"><span>True fraud</span><strong>327</strong></div>
        </div>
      </section>

      <section class="poster-card">
        <h3>Decision flow</h3>
        <div class="flow" aria-label="Example Sankey-style flow summary">
          ${flowRow("Low risk", 82)}
          ${flowRow("Manual review", 11)}
          ${flowRow("Declined", 3)}
          ${flowRow("Approved after review", 8)}
        </div>
      </section>

      <section class="poster-card">
        <h3>Visual registry</h3>
        <p>Tables, Gantt charts, timelines, Mermaid diagrams, math, Plotly plots, code blocks, AI images, confusion matrices, Sankey flows, ROC curves, SHAP summaries, and calibration plots.</p>
      </section>

      <section class="poster-card">
        <h3>Generated assets</h3>
        <p>GPT Image 2 should create visual atmosphere, themed panels, comic frames, hero art, and background textures. Factual visuals stay deterministic.</p>
      </section>

      <section class="poster-card">
        <h3>QA summary</h3>
        <ul class="qa-list">
          <li>Claims link to sources.</li>
          <li>Factual visuals are not drawn by image generation.</li>
          <li>Theme palette is scoped to the selected design.</li>
          <li>Poster copy is concise enough for a session environment.</li>
        </ul>
      </section>
    </div>
  `;
}

function flowRow(label, value) {
  return `
    <div class="flow-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <div class="flow-bar" style="width: ${value}%;"></div>
      </div>
      <span>${value}%</span>
    </div>
  `;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


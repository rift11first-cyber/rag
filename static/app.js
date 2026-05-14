/* ── Selectors ── */
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

const dom = {
  sidebar: qs('#sidebar'),
  sidebarToggle: qs('#sidebar-toggle'),
  navItems: qsa('.nav-item'),
  pageTitle: qs('#page-title'),
  healthBadge: qs('#health-badge'),
  modelBadge: qs('#model-badge'),
  statusDot: qs('#status-dot'),
  configLabel: qs('#config-label'),
  uploadForm: qs('#upload-form'),
  uploadLog: qs('#upload-log'),
  fileInput: qs('#file-input'),
  fileCount: qs('#file-count'),
  uploadBtn: qs('#upload-btn'),
  dropzone: qs('#dropzone'),
  documentList: qs('#document-list'),
  refreshDocs: qs('#refresh-docs'),
  queryForm: qs('#query-form'),
  questionInput: qs('#question-input'),
  topKInput: qs('#top-k-input'),
  queryBtn: qs('#query-btn'),
  answerSection: qs('#answer-section'),
  answerBox: qs('#answer-box'),
  contextCard: qs('#context-card'),
  contextCount: qs('#context-count'),
  contextList: qs('#context-list'),
  evalForm: qs('#eval-form'),
  evalInput: qs('#eval-input'),
  evalOutput: qs('#eval-output'),
  evalBtn: qs('#eval-btn'),
  evalResultsCard: qs('#eval-results-card'),
  jsonStatus: qs('#json-status'),
  loadTemplateBtn: qs('#load-template-btn'),
  clearEvalBtn: qs('#clear-eval-btn'),
  historyCard: qs('#ragas-history-card'),
  historyList: qs('#history-list'),
  clearHistoryBtn: qs('#clear-history-btn'),
};

const TITLES = { workspace: 'Workspace', query: 'Semantic Query', ragas: 'RAGAS Evaluation' };
let evalHistory = JSON.parse(localStorage.getItem('ragasHistory') || '[]');

/* ── Boot ── */
async function boot() {
  setupNavigation();
  setupDropzone();
  setupFileInput();
  setupJsonValidation();
  setupTemplateActions();
  await Promise.all([loadHealth(), loadDocuments()]);
  renderHistory();
}

/* ── Navigation ── */
function setupNavigation() {
  dom.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      dom.navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      qsa('.tab-content').forEach(t => t.classList.remove('active'));
      qs(`#tab-${tab}`).classList.add('active');
      dom.pageTitle.textContent = TITLES[tab] || tab;
      if (window.innerWidth < 768) dom.sidebar.classList.remove('open');
    });
  });
  dom.sidebarToggle.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
}

/* ── Health ── */
async function loadHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    dom.statusDot.className = 'status-dot online';
    dom.healthBadge.textContent = 'System Online';
    dom.modelBadge.textContent = `${data.embedding_model} · ${data.llm_model}`;
    dom.configLabel.textContent = `${data.llm_model} · ${data.collection}`;
  } catch (e) {
    dom.statusDot.className = 'status-dot offline';
    dom.healthBadge.textContent = 'System Offline';
    dom.modelBadge.textContent = '';
    dom.configLabel.textContent = 'Disconnected';
  }
}

/* ── Drag & Drop ── */
function setupDropzone() {
  const dz = dom.dropzone;
  ['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('drag-over'); }));
  ['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('drag-over'); }));
  dz.addEventListener('drop', ev => {
    dom.fileInput.files = ev.dataTransfer.files;
    updateFileCount();
  });
}

function setupFileInput() {
  dom.fileInput.addEventListener('change', updateFileCount);
}

function updateFileCount() {
  const n = dom.fileInput.files?.length || 0;
  dom.fileCount.textContent = n === 0 ? 'No files selected' : `${n} file${n > 1 ? 's' : ''} selected`;
}

/* ── Documents ── */
async function loadDocuments() {
  try {
    const res = await fetch('/api/documents');
    const data = await res.json();
    if (!data.documents.length) {
      dom.documentList.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p>No documents indexed yet</p>
          <p class="empty-hint">Upload files to get started</p>
        </div>`;
      return;
    }
    dom.documentList.innerHTML = data.documents.map(doc => `
      <div class="doc-item">
        <div class="doc-item-info">
          <span class="doc-item-name">${esc(doc.name)}</span>
          <span class="doc-item-meta">${doc.chunk_count} chunks · ${doc.char_count.toLocaleString()} characters</span>
        </div>
        <button class="btn btn-danger btn-sm" data-delete="${doc.id}" type="button">Delete</button>
      </div>
    `).join('');
  } catch (e) {
    dom.documentList.innerHTML = '<div class="empty-state"><p>Failed to load documents</p></div>';
  }
}

dom.refreshDocs.addEventListener('click', loadDocuments);
dom.documentList.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-delete]');
  if (!btn) return;
  btn.classList.add('loading');
  await fetch(`/api/documents/${btn.dataset.delete}`, { method: 'DELETE' });
  await loadDocuments();
});

/* ── Upload ── */
dom.uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  const files = Array.from(dom.fileInput.files || []);
  if (!files.length) { dom.uploadLog.textContent = '⚠ Choose at least one file.'; return; }

  dom.uploadBtn.classList.add('loading');
  dom.uploadLog.style.display = 'block';
  dom.uploadLog.textContent = '';

  for (const file of files) {
    dom.uploadLog.textContent += `↑ Uploading ${file.name}...\n`;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      dom.uploadLog.textContent += res.ok
        ? `✓ ${file.name}: ${data.chunk_count} chunks indexed\n`
        : `✗ ${file.name}: ${data.detail}\n`;
    } catch (err) {
      dom.uploadLog.textContent += `✗ ${file.name}: Network error\n`;
    }
  }

  dom.uploadBtn.classList.remove('loading');
  dom.fileInput.value = '';
  updateFileCount();
  await loadDocuments();
});

/* ── Query ── */
dom.queryForm.addEventListener('submit', async e => {
  e.preventDefault();
  const q = dom.questionInput.value.trim();
  if (!q) return;

  dom.queryBtn.classList.add('loading');
  dom.answerSection.style.display = 'block';
  dom.answerBox.textContent = 'Retrieving and generating...';
  dom.contextCard.style.display = 'none';
  dom.contextList.innerHTML = '';

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, top_k: Number(dom.topKInput.value || 6) }),
    });
    const data = await res.json();
    if (!res.ok) { dom.answerBox.textContent = `Error: ${data.detail}`; return; }

    dom.answerBox.textContent = data.answer;

    if (data.contexts?.length) {
      dom.contextCard.style.display = 'block';
      dom.contextCount.textContent = `${data.contexts.length} chunks`;
      dom.contextList.innerHTML = data.contexts.map((c, i) => `
        <div class="context-item">
          <div class="context-item-header">
            <span class="context-item-rank">#${i + 1}</span>
            <span class="context-item-source">${esc(c.document_id)}</span>
          </div>
          <p class="context-item-text">${esc(c.content)}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    dom.answerBox.textContent = `Network error: ${err.message}`;
  } finally {
    dom.queryBtn.classList.remove('loading');
  }
});

/* ── RAGAS ── */
function setupJsonValidation() {
  dom.evalInput.addEventListener('input', () => {
    try { JSON.parse(dom.evalInput.value); dom.jsonStatus.textContent = '✓ Valid JSON'; dom.jsonStatus.className = 'editor-hint valid'; }
    catch { dom.jsonStatus.textContent = '✗ Invalid JSON'; dom.jsonStatus.className = 'editor-hint invalid'; }
  });
}

function setupTemplateActions() {
  dom.loadTemplateBtn.addEventListener('click', () => {
    dom.evalInput.value = JSON.stringify([{
      question: "What does the document say about X?",
      answer: "The document states that X is ...",
      ground_truth: "X is defined as ...",
      contexts: ["Relevant chunk from the document about X..."]
    }], null, 2);
    dom.evalInput.dispatchEvent(new Event('input'));
  });
  dom.clearEvalBtn.addEventListener('click', () => { dom.evalInput.value = ''; dom.evalInput.dispatchEvent(new Event('input')); });
  dom.clearHistoryBtn.addEventListener('click', () => { evalHistory = []; localStorage.setItem('ragasHistory', '[]'); renderHistory(); });
}

dom.evalForm.addEventListener('submit', async e => {
  e.preventDefault();
  let payload;
  try { payload = JSON.parse(dom.evalInput.value); }
  catch (err) { dom.evalOutput.textContent = `Invalid JSON: ${err.message}`; dom.evalResultsCard.style.display = 'block'; return; }

  dom.evalBtn.classList.add('loading');
  dom.evalResultsCard.style.display = 'block';
  dom.evalOutput.textContent = 'Running RAGAS evaluation... This may take a moment.';

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples: payload }),
    });
    const data = await res.json();
    if (!res.ok) { dom.evalOutput.textContent = `Error: ${data.detail}`; return; }

    dom.evalOutput.textContent = JSON.stringify(data.scores, null, 2);
    updateMetricRings(data.scores);
    addToHistory(data.scores);
  } catch (err) {
    dom.evalOutput.textContent = `Network error: ${err.message}`;
  } finally {
    dom.evalBtn.classList.remove('loading');
  }
});

function updateMetricRings(scores) {
  const circumference = 2 * Math.PI * 34; // r=34
  Object.entries(scores).forEach(([key, val]) => {
    const ring = qs(`[data-ring="${key}"]`);
    const label = qs(`#val-${key}`);
    if (ring) {
      const offset = circumference * (1 - Math.min(val, 1));
      ring.style.strokeDashoffset = offset;
      const hue = val > 0.7 ? 142 : val > 0.4 ? 45 : 0;
      ring.style.stroke = `hsl(${hue}, 70%, 55%)`;
    }
    if (label) label.textContent = (val * 100).toFixed(1) + '%';
  });
}

function addToHistory(scores) {
  evalHistory.unshift({ scores, time: new Date().toISOString() });
  if (evalHistory.length > 20) evalHistory.pop();
  localStorage.setItem('ragasHistory', JSON.stringify(evalHistory));
  renderHistory();
}

function renderHistory() {
  if (!evalHistory.length) { dom.historyCard.style.display = 'none'; return; }
  dom.historyCard.style.display = 'block';
  dom.historyList.innerHTML = evalHistory.map(entry => {
    const time = new Date(entry.time).toLocaleString();
    const scores = Object.entries(entry.scores).map(([k, v]) =>
      `<div class="history-score"><div class="history-score-label">${k.replace(/_/g,' ')}</div><div class="history-score-val">${(v*100).toFixed(1)}%</div></div>`
    ).join('');
    return `<div class="history-item"><div class="history-scores">${scores}</div><span class="history-time">${time}</span></div>`;
  }).join('');
}

/* ── Util ── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

boot();

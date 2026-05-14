const BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, options);
  let data;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export async function getHealth() {
  return request('/api/health');
}

export async function getDocuments() {
  return request('/api/documents');
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  return request('/api/documents/upload', { method: 'POST', body: fd });
}

export async function deleteDocument(id) {
  return request(`/api/documents/${id}`, { method: 'DELETE' });
}

export async function queryRag(question, topK = 6) {
  return request('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK }),
  });
}

export async function runEvaluation(samples) {
  return request('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ samples }),
  });
}

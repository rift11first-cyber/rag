import React, { useState, useEffect } from 'react';
import { Play, Activity, FileText, Trash2, Clock, CheckCircle } from 'lucide-react';
import MetricRing from './MetricRing';
import { runEvaluation } from '../hooks/useApi';

const METRICS = [
  { key: 'faithfulness', label: 'Faithfulness', desc: 'Factual consistency with retrieved context' },
  { key: 'answer_relevancy', label: 'Answer Relevancy', desc: 'Relevance of the answer to the question' },
  { key: 'context_precision', label: 'Context Precision', desc: 'Precision of the retrieved context' },
  { key: 'context_recall', label: 'Context Recall', desc: 'Coverage of reference in retrieved context' },
];

const TEMPLATE = JSON.stringify([{
  question: "What does the document say about X?",
  answer: "The document states that X is ...",
  ground_truth: "X is defined as ...",
  contexts: ["Relevant chunk from the document about X..."]
}], null, 2);

export default function RagasTab() {
  const [input, setInput] = useState(TEMPLATE);
  const [jsonValid, setJsonValid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState(null);
  const [evalOutput, setEvalOutput] = useState('');
  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem('ragasHistory') || '[]')
  );

  useEffect(() => {
    try { JSON.parse(input); setJsonValid(true); }
    catch { setJsonValid(false); }
  }, [input]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload;
    try { payload = JSON.parse(input); }
    catch (err) { setEvalOutput(`Invalid JSON: ${err.message}`); return; }

    setLoading(true);
    setEvalOutput('Running RAGAS evaluation... This may take a moment.');
    try {
      const data = await runEvaluation(payload);
      setScores(data.scores);
      setEvalOutput(JSON.stringify(data.scores, null, 2));
      const newHistory = [{ scores: data.scores, time: new Date().toISOString() }, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('ragasHistory', JSON.stringify(newHistory));
    } catch (err) {
      setEvalOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.setItem('ragasHistory', '[]');
  };

  return (
    <section className="tab-content active">
      <div className="section-header">
        <h2 className="section-title">RAGAS Evaluation</h2>
        <p className="section-desc">Evaluate your RAG pipeline quality using Faithfulness, Answer Relevancy, Context Precision, and Context Recall</p>
      </div>

      {/* Metric Overview */}
      <div className="ragas-overview">
        {METRICS.map(m => (
          <MetricRing key={m.key} label={m.label} description={m.desc} value={scores?.[m.key] ?? null} />
        ))}
      </div>

      {/* Evaluation Input */}
      <div className="ragas-input-section">
        <div className="card">
          <div className="card-header">
            <div className="card-icon ragas-icon"><Activity size={20} /></div>
            <h3>Evaluation Samples</h3>
          </div>
          <p className="ragas-instructions">
            Provide evaluation samples as a JSON array. Each sample requires: <code>question</code>, <code>answer</code>, <code>ground_truth</code>, and <code>contexts</code> (array of strings).
          </p>
          <div className="ragas-template-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setInput(TEMPLATE); }}>
              <FileText size={14} /> Load Template
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInput('')}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="editor-wrapper">
              <div className="editor-header">
                <span className="editor-lang">JSON</span>
                <span className={`editor-hint ${jsonValid ? 'valid' : 'invalid'}`}>
                  {jsonValid ? '✓ Valid JSON' : '✗ Invalid JSON'}
                </span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={14}
                spellCheck={false}
                id="eval-input"
              />
            </div>
            <div className="eval-actions">
              <button type="submit" className={`btn btn-primary btn-eval ${loading ? 'loading' : ''}`} disabled={loading}>
                <Play size={16} />
                {loading ? 'Evaluating...' : 'Run RAGAS Evaluation'}
              </button>
            </div>
          </form>
        </div>

        {evalOutput && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon results-icon"><CheckCircle size={20} /></div>
              <h3>Evaluation Results</h3>
            </div>
            <pre className="console-output" style={{ display: 'block' }}>{evalOutput}</pre>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card ragas-history-card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-icon history-icon"><Clock size={20} /></div>
            <h3>Evaluation History</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear All</button>
          </div>
          <div className="history-list">
            {history.map((entry, i) => (
              <div className="history-item" key={i}>
                <div className="history-scores">
                  {Object.entries(entry.scores).map(([k, v]) => (
                    <div className="history-score" key={k}>
                      <div className="history-score-label">{k.replace(/_/g, ' ')}</div>
                      <div className="history-score-val">{(v * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
                <span className="history-time">{new Date(entry.time).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

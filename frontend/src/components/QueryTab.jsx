import React, { useState } from 'react';
import { Send, MessageSquare, Monitor } from 'lucide-react';
import { queryRag } from '../hooks/useApi';

export default function QueryTab() {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(6);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [contexts, setContexts] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('Retrieving and generating...');
    setContexts([]);
    try {
      const data = await queryRag(question.trim(), topK);
      setAnswer(data.answer);
      setContexts(data.contexts || []);
    } catch (err) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tab-content active">
      <div className="section-header">
        <h2 className="section-title">Semantic Query</h2>
        <p className="section-desc">Ask questions against your indexed knowledge base</p>
      </div>

      <div className="query-layout">
        <div className="card card-query">
          <form onSubmit={handleSubmit} className="query-form">
            <div className="query-input-group">
              <textarea
                rows={3}
                placeholder="Ask a question about your uploaded documents..."
                className="query-textarea"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <div className="query-controls">
                <div className="topk-group">
                  <label htmlFor="top-k-input">Top-K</label>
                  <input
                    id="top-k-input"
                    type="number"
                    min={1}
                    max={20}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="topk-input"
                  />
                </div>
                <button type="submit" className={`btn btn-primary btn-query ${loading ? 'loading' : ''}`} disabled={loading}>
                  <Send size={16} />
                  {loading ? 'Querying...' : 'Run Query'}
                </button>
              </div>
            </div>
          </form>

          {answer !== null && (
            <div className="answer-section">
              <div className="answer-header">
                <MessageSquare size={18} />
                <h3>Answer</h3>
              </div>
              <article className="answer-content">{answer}</article>
            </div>
          )}
        </div>

        {contexts.length > 0 && (
          <div className="card card-context">
            <div className="card-header">
              <div className="card-icon context-icon"><Monitor size={20} /></div>
              <h3>Retrieved Context</h3>
              <span className="context-count">{contexts.length} chunks</span>
            </div>
            <div className="context-list">
              {contexts.map((c, i) => (
                <div className="context-item" key={i}>
                  <div className="context-item-header">
                    <span className="context-item-rank">#{i + 1}</span>
                    <span className="context-item-source">{c.document_id}</span>
                  </div>
                  <p className="context-item-text">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

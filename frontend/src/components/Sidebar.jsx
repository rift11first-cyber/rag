import React from 'react';
import { Layers, FileText, Search, BarChart3 } from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, health }) {
  const navItems = [
    { key: 'workspace', label: 'Workspace', icon: FileText },
    { key: 'query', label: 'Query', icon: Search },
    { key: 'ragas', label: 'RAGAS', icon: BarChart3 },
  ];

  const isOnline = health?.status === 'ok';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Layers size={28} />
        </div>
        <span className="brand-name">
          RAG<span className="brand-dot">.</span>workspace
        </span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className={`status-dot ${isOnline ? 'online' : health === null ? '' : 'offline'}`} />
          <div className="status-text">
            <span>{isOnline ? 'System Online' : health === null ? 'Connecting...' : 'System Offline'}</span>
            <span className="status-sub">
              {isOnline ? `${health.embedding_model} · ${health.llm_model}` : ''}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import { Menu, Settings } from 'lucide-react';

const TITLES = {
  workspace: 'Workspace',
  query: 'Semantic Query',
  ragas: 'RAGAS Evaluation',
};

export default function Topbar({ activeTab, health, onToggleSidebar }) {
  const configText = health?.status === 'ok'
    ? `${health.llm_model} · ${health.collection}`
    : 'Loading...';

  return (
    <header className="topbar">
      <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Menu size={20} />
      </button>
      <h1 className="page-title">{TITLES[activeTab] || activeTab}</h1>
      <div className="topbar-actions">
        <div className="config-pill" title="Current configuration">
          <Settings size={14} />
          <span>{configText}</span>
        </div>
      </div>
    </header>
  );
}

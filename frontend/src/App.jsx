import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import WorkspaceTab from './components/WorkspaceTab';
import QueryTab from './components/QueryTab';
import RagasTab from './components/RagasTab';
import { getHealth } from './hooks/useApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [health, setHealth] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        health={health}
      />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Topbar
          activeTab={activeTab}
          health={health}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="tab-container">
          {activeTab === 'workspace' && <WorkspaceTab />}
          {activeTab === 'query' && <QueryTab />}
          {activeTab === 'ragas' && <RagasTab />}
        </div>
      </main>
    </>
  );
}

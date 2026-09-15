import React from 'react';
import { Icons } from './Icons';
import { ui } from '../styles';

export type TabType = 'orchestrator' | 'servers' | 'traces' | 'assertions' | 'logs';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  serversCount: number;
  tracesCount: number;
  logsCount: number;
  isRunning: boolean;
  concurrency: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  serversCount,
  tracesCount,
  logsCount,
  isRunning,
  concurrency
}) => {
  return (
    <aside style={ui.sidebar}>
      <div style={ui.sidebarNavGroup}>
        <span style={ui.sidebarSectionLabel}>Control Planes</span>

        <button
          onClick={() => setActiveTab('orchestrator')}
          style={activeTab === 'orchestrator' ? ui.navItemActive : ui.navItem}
        >
          <Icons.Sliders />
          <span>Test Orchestrator</span>
        </button>

        <button
          onClick={() => setActiveTab('servers')}
          style={activeTab === 'servers' ? ui.navItemActive : ui.navItem}
        >
          <Icons.Server />
          <span>Fleet Infrastructure ({serversCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('traces')}
          style={activeTab === 'traces' ? ui.navItemActive : ui.navItem}
        >
          <Icons.Layers />
          <span>Request Traces ({tracesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('assertions')}
          style={activeTab === 'assertions' ? ui.navItemActive : ui.navItem}
        >
          <Icons.CheckCircle />
          <span>SLA Assertions</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={activeTab === 'logs' ? ui.navItemActive : ui.navItem}
        >
          <Icons.Terminal />
          <span>System Output ({logsCount})</span>
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#141416', border: '1px solid #27272a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Engine Status</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: isRunning ? '#06b6d4' : '#a1a1aa' }}>
            {isRunning ? 'ACTIVE RUN' : 'STANDBY'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '4px' }}>
          Threads: {concurrency} VUs
        </div>
      </div>
    </aside>
  );
};
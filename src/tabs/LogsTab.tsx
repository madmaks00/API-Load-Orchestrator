import React from 'react';
import type { ExecutionLog } from '../types/benchmark';
import { ui } from '../styles';

interface LogsTabProps {
  logs: ExecutionLog[];
  setLogs: React.Dispatch<React.SetStateAction<ExecutionLog[]>>;
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs, setLogs }) => {
  return (
    <div style={ui.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={ui.cardTitle}>Structured System Console</div>
        <button onClick={() => setLogs([])} style={ui.secondaryBtn}>Clear Buffer</button>
      </div>
      <div style={ui.terminalContainer}>
        {logs.length === 0 ? (
          <div style={{ color: '#52525b' }}>System output buffer empty. Trigger a benchmark run.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={ui.terminalLine}>
              <span style={{ color: '#52525b' }}>[{log.timestamp}]</span>
              <span style={{
                color: log.level === 'error' ? '#f43f5e' : log.level === 'warn' ? '#eab308' : log.level === 'success' ? '#10b981' : '#38bdf8',
                textTransform: 'uppercase', fontWeight: 600, width: '60px'
              }}>
                {log.level}
              </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
// src/tabs/TracesTab.tsx
import React, { useState, useMemo } from 'react';
import type { RequestTrace } from '../types/benchmark';
import { ui } from '../styles';

interface TracesTabProps {
  traces: RequestTrace[];
}

export const TracesTab: React.FC<TracesTabProps> = ({ traces }) => {
  const [traceFilter, setTraceFilter] = useState<'all' | 'errors' | '429'>('all');

  const filteredTraces = useMemo(() => {
    if (traceFilter === 'errors') return traces.filter(t => t.isError);
    if (traceFilter === '429') return traces.filter(t => t.statusCode === 429);
    return traces;
  }, [traces, traceFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTraceFilter('all')}
            style={{
              ...ui.segmentBtn,
              backgroundColor: traceFilter === 'all' ? '#27272a' : 'transparent'
            }}
          >
            All Calls ({traces.length})
          </button>
          <button
            onClick={() => setTraceFilter('errors')}
            style={{
              ...ui.segmentBtn,
              backgroundColor: traceFilter === 'errors' ? '#27272a' : 'transparent'
            }}
          >
            Errors ({traces.filter(t => t.isError).length})
          </button>
          <button
            onClick={() => setTraceFilter('429')}
            style={{
              ...ui.segmentBtn,
              backgroundColor: traceFilter === '429' ? '#27272a' : 'transparent'
            }}
          >
            HTTP 429 ({traces.filter(t => t.statusCode === 429).length})
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#71717a' }}>
          Showing {filteredTraces.length} traces
        </div>
      </div>

      <div style={ui.tableWrapper}>
        <table style={ui.table}>
          <thead>
            <tr>
              <th style={ui.th}>#ID</th>
              <th style={ui.th}>Status</th>
              <th style={ui.th}>Method</th>
              <th style={ui.th}>Latency</th>
              <th style={ui.th}>Bytes</th>
              <th style={ui.th}>Target URL</th>
              <th style={ui.th}>SLA Verdict</th>
            </tr>
          </thead>
          <tbody>
            {filteredTraces.slice(-100).map(trace => {
              const is2xx = trace.statusCode >= 200 && trace.statusCode < 300;
              return (
                <tr key={trace.id} style={ui.tr}>
                  <td style={ui.tdMono}>#{trace.id}</td>
                  <td style={ui.td}>
                    <span
                      style={{
                        ...ui.statusBadge,
                        backgroundColor: is2xx
                          ? '#064e3b'
                          : trace.statusCode === 429
                          ? '#831843'
                          : '#7f1d1d',
                        color: is2xx
                          ? '#34d399'
                          : trace.statusCode === 429
                          ? '#f472b6'
                          : '#f87171'
                      }}
                    >
                      {trace.statusCode === 0 ? 'NET_FAIL' : trace.statusCode}
                    </span>
                  </td>
                  <td style={ui.tdMono}>{trace.method}</td>
                  <td
                    style={{
                      ...ui.tdMono,
                      color: trace.durationMs > 200 ? '#f43f5e' : '#f4f4f5'
                    }}
                  >
                    {trace.durationMs} ms
                  </td>
                  <td style={ui.tdMono}>{trace.responseBytes} B</td>
                  <td
                    style={{
                      ...ui.td,
                      maxWidth: '280px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {trace.url}
                  </td>
                  <td style={ui.td}>
                    <span
                      style={{
                        color: trace.assertionPassed ? '#10b981' : '#f43f5e',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      {trace.assertionPassed ? 'PASS' : 'VIOLATED'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
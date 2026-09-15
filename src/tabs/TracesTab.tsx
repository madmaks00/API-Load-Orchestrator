import { useState, useMemo } from 'react';
import type { RequestTrace } from '../types/benchmark';
import { ui } from '../styles';

interface TracesTabProps {
  traces: RequestTrace[];
}

export const TracesTab = ({ traces }: TracesTabProps) => {
  const [traceFilter, setTraceFilter] = useState<'all' | 'errors' | '429'>('all');
  const [selectedTrace, setSelectedTrace] = useState<RequestTrace | null>(null);
  const [copied, setCopied] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'response' | 'headers' | 'timing'>('response');

  const filteredTraces = useMemo(() => {
    if (traceFilter === 'errors') return traces.filter(t => t.isError);
    if (traceFilter === '429') return traces.filter(t => t.statusCode === 429);
    return traces;
  }, [traces, traceFilter]);

  const generateCurl = (t: RequestTrace) => {
    let curl = `curl -X ${t.method} "${t.url}"`;
    if (t.requestHeaders) {
      for (const [key, val] of Object.entries(t.requestHeaders)) {
        curl += ` \\\n  -H "${key}: ${val}"`;
      }
    }
    if (t.requestBody && t.method !== 'GET' && t.method !== 'HEAD') {
      curl += ` \\\n  --data-raw '${t.requestBody.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const copyCurlToClipboard = async (t: RequestTrace) => {
    try {
      const curl = generateCurl(t);
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const curl = generateCurl(t);
      window.prompt('Copy cURL Command:', curl);
    }
  };

  const formatResponseBody = (body?: string) => {
    if (!body) return 'Empty response body';
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
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
          Showing {filteredTraces.length} traces (click row to inspect)
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
              <th style={ui.th}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filteredTraces.slice(-100).map(trace => {
              const is2xx = trace.statusCode >= 200 && trace.statusCode < 300;
              return (
                <tr
                  key={trace.id}
                  onClick={() => {
                    setSelectedTrace(trace);
                    setDrawerTab('response');
                  }}
                  style={{
                    ...ui.tr,
                    cursor: 'pointer',
                    backgroundColor: selectedTrace?.id === trace.id ? '#18181b' : 'transparent'
                  }}
                >
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
                      maxWidth: '260px',
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
                  <td style={ui.td}>
                    <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>
                      View →
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTrace && (
        <div
          onClick={() => setSelectedTrace(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 900
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '560px',
          height: '100vh',
          backgroundColor: '#0d0e12',
          borderLeft: '1px solid #27272a',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transform: selectedTrace ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
      >
        {selectedTrace && (
          <>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #27272a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>
                  Trace #{selectedTrace.id}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      selectedTrace.statusCode >= 200 && selectedTrace.statusCode < 300
                        ? '#064e3b'
                        : '#7f1d1d',
                    color:
                      selectedTrace.statusCode >= 200 && selectedTrace.statusCode < 300
                        ? '#34d399'
                        : '#fca5a5'
                  }}
                >
                  {selectedTrace.statusCode === 0 ? 'NETWORK_FAILED' : `${selectedTrace.statusCode} ${selectedTrace.statusText}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => copyCurlToClipboard(selectedTrace)}
                  style={{
                    ...ui.secondaryBtn,
                    fontSize: '11px',
                    borderColor: copied ? '#10b981' : '#27272a',
                    color: copied ? '#10b981' : '#f4f4f5'
                  }}
                >
                  {copied ? '✓ cURL Copied' : 'Copy as cURL'}
                </button>
                <button
                  onClick={() => setSelectedTrace(null)}
                  style={{ ...ui.iconBtn, fontSize: '16px', color: '#a1a1aa' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 20px', backgroundColor: '#121316', borderBottom: '1px solid #1f1f23' }}>
              <div style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
                Request Endpoint
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#38bdf8',
                  marginTop: '4px',
                  wordBreak: 'break-all'
                }}
              >
                <strong>{selectedTrace.method}</strong> {selectedTrace.url}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f1f23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                  Network Waterfall Timings
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#f4f4f5' }}>
                  Total: {selectedTrace.durationMs} ms
                </span>
              </div>

              {selectedTrace.timing ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      height: '10px',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      backgroundColor: '#1f1f23'
                    }}
                  >
                    <div
                      title={`DNS & Connect: ${selectedTrace.timing.dnsMs}ms`}
                      style={{
                        width: `${Math.max((selectedTrace.timing.dnsMs / selectedTrace.durationMs) * 100, 4)}%`,
                        backgroundColor: '#a855f7'
                      }}
                    />
                    <div
                      title={`TTFB (Server Processing): ${selectedTrace.timing.ttfbMs}ms`}
                      style={{
                        width: `${Math.max((selectedTrace.timing.ttfbMs / selectedTrace.durationMs) * 100, 6)}%`,
                        backgroundColor: '#06b6d4'
                      }}
                    />
                    <div
                      title={`Content Download: ${selectedTrace.timing.downloadMs}ms`}
                      style={{
                        flex: 1,
                        backgroundColor: '#10b981'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginTop: '10px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div>
                      <span style={{ color: '#a855f7' }}>●</span> DNS/Connect: {selectedTrace.timing.dnsMs}ms
                    </div>
                    <div>
                      <span style={{ color: '#06b6d4' }}>●</span> TTFB: {selectedTrace.timing.ttfbMs}ms
                    </div>
                    <div>
                      <span style={{ color: '#10b981' }}>●</span> Download: {selectedTrace.timing.downloadMs}ms
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '11px', color: '#71717a' }}>Latency: {selectedTrace.durationMs} ms</div>
              )}
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #27272a', padding: '0 20px' }}>
              <button
                onClick={() => setDrawerTab('response')}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: drawerTab === 'response' ? '2px solid #06b6d4' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: drawerTab === 'response' ? '#f4f4f5' : '#71717a',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Response Body ({selectedTrace.responseBytes} B)
              </button>
              <button
                onClick={() => setDrawerTab('headers')}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: drawerTab === 'headers' ? '2px solid #06b6d4' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: drawerTab === 'headers' ? '#f4f4f5' : '#71717a',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Headers ({Object.keys(selectedTrace.requestHeaders || {}).length} / {Object.keys(selectedTrace.responseHeaders || {}).length})
              </button>
              {selectedTrace.requestBody && (
                <button
                  onClick={() => setDrawerTab('timing')}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: drawerTab === 'timing' ? '2px solid #06b6d4' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: drawerTab === 'timing' ? '#f4f4f5' : '#71717a',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Payload
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {drawerTab === 'response' && (
                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: '#050506',
                    border: '1px solid #1f1f23',
                    color: selectedTrace.isError ? '#fca5a5' : '#34d399',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '440px',
                    overflowY: 'auto'
                  }}
                >
                  {formatResponseBody(selectedTrace.responseBody)}
                </pre>
              )}

              {drawerTab === 'headers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
                      Outgoing Request Headers
                    </div>
                    <div style={{ backgroundColor: '#050506', border: '1px solid #1f1f23', borderRadius: '6px', padding: '8px 12px' }}>
                      {Object.entries(selectedTrace.requestHeaders || {}).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', fontSize: '11px', fontFamily: 'monospace', padding: '3px 0' }}>
                          <span style={{ color: '#06b6d4', width: '150px', flexShrink: 0 }}>{key}:</span>
                          <span style={{ color: '#e4e4e7', wordBreak: 'break-all' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
                      Incoming Response Headers
                    </div>
                    <div style={{ backgroundColor: '#050506', border: '1px solid #1f1f23', borderRadius: '6px', padding: '8px 12px' }}>
                      {Object.keys(selectedTrace.responseHeaders || {}).length === 0 ? (
                        <span style={{ fontSize: '11px', color: '#71717a' }}>No response headers captured</span>
                      ) : (
                        Object.entries(selectedTrace.responseHeaders || {}).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', fontSize: '11px', fontFamily: 'monospace', padding: '3px 0' }}>
                            <span style={{ color: '#a855f7', width: '150px', flexShrink: 0 }}>{key}:</span>
                            <span style={{ color: '#e4e4e7', wordBreak: 'break-all' }}>{val}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'timing' && selectedTrace.requestBody && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
                    JSON Request Payload
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      borderRadius: '6px',
                      backgroundColor: '#050506',
                      border: '1px solid #1f1f23',
                      color: '#f4f4f5',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {formatResponseBody(selectedTrace.requestBody)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
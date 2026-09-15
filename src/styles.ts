import type React from 'react';

export const ui: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#09090b',
    color: '#f4f4f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif',
    overflow: 'hidden'
  },
  workspace: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '260px', backgroundColor: '#0c0c0e', borderRight: '1px solid #27272a',
    padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '16px'
  },
  sidebarNavGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sidebarSectionLabel: {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#52525b', letterSpacing: '0.06em', padding: '6px 8px'
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px',
    border: 'none', backgroundColor: 'transparent', color: '#a1a1aa', fontSize: '12px', fontWeight: 500, cursor: 'pointer', textAlign: 'left'
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px',
    border: 'none', backgroundColor: '#18181b', color: '#f4f4f5', fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'left', boxShadow: 'inset 0 0 0 1px #27272a'
  },
  contentArea: { flex: 1, padding: '20px', overflowY: 'auto' },
  card: { backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '8px', padding: '16px' },
  cardTitle: { fontSize: '13px', fontWeight: 600, color: '#f4f4f5' },
  urlComposerRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  methodSelect: {
    backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px',
    color: '#f4f4f5', fontSize: '12px', fontWeight: 600, padding: '0 12px', height: '36px', outline: 'none'
  },
  urlInput: {
    flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px',
    color: '#f4f4f5', fontSize: '12px', fontFamily: 'monospace', padding: '0 12px', height: '36px', outline: 'none'
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#0284c7',
    color: '#fff', border: 'none', borderRadius: '6px', padding: '0 14px', height: '34px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
  },
  secondaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#18181b',
    color: '#e4e4e7', border: '1px solid #27272a', borderRadius: '6px', padding: '0 12px', height: '34px',
    fontSize: '12px', fontWeight: 500, cursor: 'pointer'
  },
  dangerBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#e11d48',
    color: '#fff', border: 'none', borderRadius: '6px', padding: '0 14px', height: '34px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  kpiCard: { backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '8px', padding: '14px' },
  kpiLabel: { fontSize: '11px', fontWeight: 500, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' },
  kpiNumber: { fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  kpiUnit: { fontSize: '11px', color: '#71717a' },
  kpiFooter: { display: 'block', fontSize: '10px', color: '#52525b', marginTop: '6px' },
  graphCard: { backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '8px', padding: '14px' },
  graphHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  graphTitle: { fontSize: '12px', fontWeight: 600, color: '#e4e4e7' },
  graphMeta: { fontSize: '10px', color: '#71717a' },
  emptyGraph: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#52525b' },
  miniMetricBox: { backgroundColor: '#09090b', padding: '10px', borderRadius: '6px', border: '1px solid #1f1f23' },
  miniMetricLabel: { fontSize: '10px', color: '#71717a', textTransform: 'uppercase' },
  miniMetricVal: { fontSize: '16px', fontWeight: 700, marginTop: '4px', fontVariantNumeric: 'tabular-nums' },
  miniUnit: { fontSize: '11px', color: '#71717a' },
  miniMetricSub: { fontSize: '10px', color: '#52525b', marginTop: '2px' },
  matrixGrid: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px', marginTop: '10px' },
  matrixCell: { backgroundColor: '#09090b', padding: '10px 8px', borderRadius: '6px', border: '1px solid #1f1f23', textAlign: 'center' },
  matrixHeader: { display: 'block', fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 },
  matrixVal: { display: 'block', fontSize: '13px', fontWeight: 700, marginTop: '4px', fontVariantNumeric: 'tabular-nums' },
  bandwidthCell: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' },
  bwLabel: { color: '#71717a' },
  bwVal: { fontFamily: 'monospace', color: '#06b6d4' },
  serverCard: { backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' },
  inputLabel: { display: 'block', fontSize: '11px', fontWeight: 500, color: '#71717a', marginBottom: '6px' },
  formInput: {
    width: '100%', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px',
    padding: '8px 10px', fontSize: '12px', color: '#f4f4f5', outline: 'none', boxSizing: 'border-box'
  },
  formSelect: {
    width: '100%', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px',
    padding: '8px 10px', fontSize: '12px', color: '#f4f4f5', outline: 'none'
  },
  segmentBtn: { padding: '4px 10px', borderRadius: '4px', border: '1px solid #27272a', fontSize: '11px', fontWeight: 500, cursor: 'pointer', color: '#a1a1aa' },
  codeTextArea: {
    width: '100%', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px',
    padding: '8px 10px', fontSize: '11px', fontFamily: 'monospace', color: '#f4f4f5', outline: 'none', boxSizing: 'border-box'
  },
  tableWrapper: { border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' },
  th: { backgroundColor: '#111215', padding: '10px 14px', color: '#71717a', fontWeight: 600, fontSize: '11px', borderBottom: '1px solid #27272a' },
  tr: { borderBottom: '1px solid #18181b' },
  td: { padding: '10px 14px', color: '#e4e4e7' },
  tdMono: { padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', fontVariantNumeric: 'tabular-nums' },
  statusBadge: { display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' },
  assertionRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px' },
  ruleSelect: { backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '4px', color: '#f4f4f5', fontSize: '11px', padding: '4px 8px', outline: 'none' },
  iconBtn: { background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  modalCard: {
    backgroundColor: '#111215', border: '1px solid #27272a', borderRadius: '8px',
    padding: '20px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  terminalContainer: {
    height: '380px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px',
    padding: '12px', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
  },
  terminalLine: { display: 'flex', gap: '10px', lineHeight: 1.4 }
};
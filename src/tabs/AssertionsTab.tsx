import React from 'react';
import { Icons } from '../components/Icons';
import { ui } from '../styles';
import type { LoadEngineSettings } from '../types/benchmark';

interface AssertionsTabProps {
  engineSettings: LoadEngineSettings;
  setEngineSettings: React.Dispatch<React.SetStateAction<LoadEngineSettings>>;
}

export const AssertionsTab: React.FC<AssertionsTabProps> = ({ engineSettings, setEngineSettings }) => {
  const handleAddRule = () => {
    setEngineSettings({
      ...engineSettings,
      assertions: [
        ...engineSettings.assertions,
        {
          id: Math.random().toString(36).substring(2, 7),
          field: 'duration',
          operator: 'lt',
          targetValue: '500',
          enabled: true
        }
      ]
    });
  };

  const handleToggleRule = (id: string, enabled: boolean) => {
    const next = engineSettings.assertions.map(r => (r.id === id ? { ...r, enabled } : r));
    setEngineSettings({ ...engineSettings, assertions: next });
  };

  const handleFieldChange = (id: string, field: 'status' | 'duration' | 'body') => {
    const next = engineSettings.assertions.map(r => (r.id === id ? { ...r, field } : r));
    setEngineSettings({ ...engineSettings, assertions: next });
  };

  const handleOperatorChange = (id: string, operator: any) => {
    const next = engineSettings.assertions.map(r => (r.id === id ? { ...r, operator } : r));
    setEngineSettings({ ...engineSettings, assertions: next });
  };

  const handleTargetValueChange = (id: string, targetValue: string) => {
    const next = engineSettings.assertions.map(r => (r.id === id ? { ...r, targetValue } : r));
    setEngineSettings({ ...engineSettings, assertions: next });
  };

  const handleDeleteRule = (id: string) => {
    setEngineSettings({
      ...engineSettings,
      assertions: engineSettings.assertions.filter(r => r.id !== id)
    });
  };

  return (
    <div style={ui.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={ui.cardTitle}>SLA Thresholds & Failure Criteria</div>
          <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
            Automated quality evaluation rules evaluated against every response
          </div>
        </div>
        <button onClick={handleAddRule} style={ui.secondaryBtn}>
          <Icons.Plus />
          <span>Add Rule</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {engineSettings.assertions.map(rule => (
          <div key={rule.id} style={ui.assertionRow}>
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={e => handleToggleRule(rule.id, e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>ASSERT</span>
            <select
              value={rule.field}
              onChange={e => handleFieldChange(rule.id, e.target.value as any)}
              style={ui.ruleSelect}
            >
              <option value="status">HTTP Status</option>
              <option value="duration">Latency (ms)</option>
              <option value="body">Response Body</option>
            </select>
            <select
              value={rule.operator}
              onChange={e => handleOperatorChange(rule.id, e.target.value)}
              style={ui.ruleSelect}
            >
              <option value="lt">&lt; (Less Than)</option>
              <option value="lte">&lt;= (Less Or Equal)</option>
              <option value="gt">&gt; (Greater Than)</option>
              <option value="gte">&gt;= (Greater Or Equal)</option>
              <option value="equals">== (Equals)</option>
              <option value="contains">Contains (Substr)</option>
            </select>
            <input
              type="text"
              value={rule.targetValue}
              onChange={e => handleTargetValueChange(rule.id, e.target.value)}
              style={{ ...ui.formInput, width: '140px' }}
            />
            <button className="delete-btn" onClick={() => handleDeleteRule(rule.id)} style={ui.iconBtn}>
              <Icons.Trash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
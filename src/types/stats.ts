// src/utils/stats.ts
import type { AssertionRule } from '../types/benchmark';

export function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[idx] ?? 0;
}

export function computeStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance));
}

export function evaluateAssertions(
  rules: AssertionRule[],
  status: number,
  duration: number,
  bodyText: string
): boolean {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.field === 'status') {
      const val = Number(rule.targetValue);
      if (rule.operator === 'equals' && status !== val) return false;
      if (rule.operator === 'lt' && !(status < val)) return false;
      if (rule.operator === 'lte' && !(status <= val)) return false;
      if (rule.operator === 'gt' && !(status > val)) return false;
      if (rule.operator === 'gte' && !(status >= val)) return false;
    } else if (rule.field === 'duration') {
      const val = Number(rule.targetValue);
      if (rule.operator === 'lt' && !(duration < val)) return false;
      if (rule.operator === 'lte' && !(duration <= val)) return false;
      if (rule.operator === 'gt' && !(duration > val)) return false;
      if (rule.operator === 'gte' && !(duration >= val)) return false;
      if (rule.operator === 'equals' && duration !== val) return false;
    } else if (rule.field === 'body') {
      if (rule.operator === 'contains' && !bodyText.includes(rule.targetValue)) return false;
    }
  }
  return true;
}
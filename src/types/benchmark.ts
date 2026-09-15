export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type LoadProfileType = 'constant' | 'ramp_up' | 'spike';

export interface RampStage {
  id: string;
  durationSeconds: number;
  targetVUs: number;
}

export interface SpikeProfileSettings {
  baseVUs: number;
  spikeVUs: number;
  preSpikeSeconds: number;
  spikeDurationSeconds: number;
  postSpikeSeconds: number;
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AssertionRule {
  id: string;
  field: 'status' | 'duration' | 'body';
  operator: 'equals' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';
  targetValue: string;
  enabled: boolean;
}

export interface ServerNode {
  id: string;
  name: string;
  baseUrl: string;
  healthPath: string;
  environment: 'development' | 'staging' | 'production';
  status: 'healthy' | 'degraded' | 'offline' | 'probing';
  latencyMs: number | null;
  uptimePercent: number;
  lastChecked: string;
  history: number[];
  tags: string[];
}

export interface ServerProcessTelemetry {
  cpuUsagePercent?: number;
  allocatedMemoryMb: number;
  lohSizeMb?: number;
  pohSizeMb?: number;
  workingSetMb: number;
  threadCount: number;
  pendingWorkItemCount?: number;
  cpuTimeMs: number;
  gen0: number;
  gen1: number;
  gen2: number;
  timestamp: string;
}

export interface PerformanceBaseline {
  id: string;
  savedAt: string;
  scenarioName: string;
  targetUrl: string;
  metrics: {
    currentRps: number;
    p50: number;
    p90: number;
    p99: number;
    avgDurationMs: number;
    errorRatePercent: number;
    totalBytes: number;
    completed: number;
  };
  apm?: {
    workingSetMb?: number;
    allocatedMemoryMb?: number;
    threadCount?: number;
    cpuUsagePercent?: number;
  };
}

export interface ScenarioConfiguration {
  id: string;
  name: string;
  description: string;
  targetUrl: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  authType: 'none' | 'bearer' | 'basic' | 'apiKey';
  authToken?: string;
  bodyContent: string;
  timeoutMs: number;
}

export interface LoadEngineSettings {
  profile: LoadProfileType;
  concurrency: number;
  totalRequests: number;
  durationSeconds: number;
  rateLimitRps: number;
  assertions: AssertionRule[];
  stages: RampStage[];
  spikeSettings?: SpikeProfileSettings;
}

export interface RequestTraceTiming {
  dnsMs: number;
  ttfbMs: number;
  downloadMs: number;
  totalMs: number;
}

export interface RequestTrace {
  id: number;
  timestamp: number;
  method: HttpMethod;
  url: string;
  durationMs: number;
  statusCode: number;
  statusText: string;
  responseBytes: number;
  isError: boolean;
  assertionPassed: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  timing?: RequestTraceTiming;
}

export interface TelemetryBucket {
  timestamp: number;
  rps: number;
  avgLatency: number;
  errorCount: number;
  activeVUs: number;
}

export interface AggregatedMetrics {
  totalSent: number;
  completed: number;
  successCount: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status429: number;
  status5xx: number;
  networkErrors: number;
  totalBytes: number;
  throughputKbps: number;
  avgBytes: number;
  currentRps: number;
  activeVUs: number;
  elapsedSeconds: number;
  avgDurationMs: number;
  stdDev: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  errorRatePercent: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}
import type { ServerNode, ScenarioConfiguration } from './types/benchmark';

export const INITIAL_SERVERS: ServerNode[] = [
  {
    id: 'srv-kestrel-local',
    name: 'Kestrel Core Gateway (Active)',
    baseUrl: 'http://localhost:5114',
    healthPath: '/api/test',
    environment: 'development',
    status: 'healthy',
    latencyMs: 5,
    uptimePercent: 100.0,
    lastChecked: 'Just now',
    history: [6, 5, 4, 7, 5, 5, 8, 5, 6, 4, 5, 5],
    tags: ['C# Runtime', 'PostgreSQL', 'Port: 5114']
  },
  {
    id: 'srv-kestrel-ssl',
    name: 'Kestrel TLS Edge Gateway',
    baseUrl: 'https://localhost:7214',
    healthPath: '/api/test',
    environment: 'development',
    status: 'probing',
    latencyMs: null,
    uptimePercent: 99.4,
    lastChecked: 'Pending verify',
    history: [12, 10, 15, 11, 9, 14, 10, 12, 11],
    tags: ['HTTPS', 'SSL Self-Signed', 'Port: 7214']
  },
  {
    id: 'srv-public-mock',
    name: 'Public Verification Node (HttpBin)',
    baseUrl: 'https://httpbin.org',
    healthPath: '/status/200',
    environment: 'production',
    status: 'healthy',
    latencyMs: 140,
    uptimePercent: 99.98,
    lastChecked: '12s ago',
    history: [130, 145, 138, 142, 150, 139, 141, 136],
    tags: ['Edge', 'AWS US-East', 'Public']
  }
];

export const DEFAULT_PRESETS: ScenarioConfiguration[] = [
  {
    id: 'kestrel_ping',
    name: 'Kestrel Local Endpoint (/api/test)',
    description: 'Direct high-speed ping against active ASP.NET Core process',
    targetUrl: 'http://localhost:5114/api/test',
    method: 'GET',
    headers: [],
    queryParams: [],
    authType: 'none',
    bodyContent: '',
    timeoutMs: 4000
  },
  {
    id: 'universal_mock',
    name: 'Universal Ping / Health Probe',
    description: 'Zero-allocation latency baseline via public edge',
    targetUrl: 'https://httpbin.org/status/200',
    method: 'GET',
    headers: [],
    queryParams: [],
    authType: 'none',
    bodyContent: '',
    timeoutMs: 4000
  }
];
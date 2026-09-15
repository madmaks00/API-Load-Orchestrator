import { useState, useRef, useMemo, useEffect } from 'react';
import { computePercentile, computeStdDev, evaluateAssertions } from '../utils/stats';
import type {
  ScenarioConfiguration,
  LoadEngineSettings,
  RequestTrace,
  TelemetryBucket,
  AggregatedMetrics,
  ExecutionLog
} from '../types/benchmark';

// Функция расчета желаемого количества VU на конкретной секунде теста
function calculateDesiredVUs(
  elapsedSeconds: number,
  settings: LoadEngineSettings
): { desiredVUs: number; isCompleted: boolean } {
  if (settings.profile === 'constant') {
    return { desiredVUs: settings.concurrency, isCompleted: false };
  }

  if (settings.profile === 'ramp_up') {
    const stages = settings.stages || [];
    if (stages.length === 0) {
      return { desiredVUs: settings.concurrency, isCompleted: false };
    }

    let accumulatedTime = 0;
    let prevTarget = 0;

    for (const stage of stages) {
      const stageEnd = accumulatedTime + stage.durationSeconds;
      if (elapsedSeconds <= stageEnd) {
        const stageElapsed = elapsedSeconds - accumulatedTime;
        const progress = stage.durationSeconds > 0 ? stageElapsed / stage.durationSeconds : 1;
        const currentVUs = Math.round(prevTarget + progress * (stage.targetVUs - prevTarget));
        return { desiredVUs: Math.max(currentVUs, 0), isCompleted: false };
      }
      accumulatedTime = stageEnd;
      prevTarget = stage.targetVUs;
    }

    // Если все этапы пройдены — тест завершен
    return { desiredVUs: 0, isCompleted: true };
  }

  return { desiredVUs: settings.concurrency, isCompleted: false };
}

export function useLoadEngine(
  scenario: ScenarioConfiguration,
  engineSettings: LoadEngineSettings,
  addLog: (level: ExecutionLog['level'], message: string) => void
) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentActiveVUs, setCurrentActiveVUs] = useState<number>(0);
  const [traces, setTraces] = useState<RequestTrace[]>([]);
  const [telemetryBuckets, setTelemetryBuckets] = useState<TelemetryBucket[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const liveTracesRef = useRef<RequestTrace[]>([]);
  const bucketTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (bucketTimerRef.current) clearInterval(bucketTimerRef.current);
    };
  }, []);

  const startLoadEngine = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTraces([]);
    setTelemetryBuckets([]);
    liveTracesRef.current = [];

    const controller = new AbortController();
    abortControllerRef.current = controller;
    startTimeRef.current = performance.now();

    // Определяем максимальный потолок воркеров
    const maxVUs =
      engineSettings.profile === 'ramp_up'
        ? Math.max(...(engineSettings.stages || []).map(s => s.targetVUs), 1)
        : engineSettings.concurrency;

    const totalRampTime =
      engineSettings.profile === 'ramp_up'
        ? (engineSettings.stages || []).reduce((acc, s) => acc + s.durationSeconds, 0)
        : 0;

    addLog(
      'info',
      `Benchmark started: ${scenario.targetUrl} [Profile: ${engineSettings.profile.toUpperCase()}, Max VUs: ${maxVUs}]`
    );

    let sentCounter = 0;
    const maxRequests = engineSettings.totalRequests > 0 ? engineSettings.totalRequests : Infinity;
    const maxDurationMs =
      engineSettings.profile === 'ramp_up' && totalRampTime > 0
        ? totalRampTime * 1000
        : engineSettings.durationSeconds > 0
        ? engineSettings.durationSeconds * 1000
        : Infinity;

    const sampleRateMs = 200;
    let lastDone = 0;

    const bucketInterval = window.setInterval(() => {
      const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
      const { desiredVUs } = calculateDesiredVUs(elapsedSec, engineSettings);
      setCurrentActiveVUs(desiredVUs);

      const currentDone = liveTracesRef.current.length;
      const delta = currentDone - lastDone;
      lastDone = currentDone;

      const currentRps = Math.round((delta / sampleRateMs) * 1000);
      const recent = liveTracesRef.current.slice(-Math.max(delta, 1));
      const avgLat = recent.length ? recent.reduce((a, b) => a + b.durationMs, 0) / recent.length : 0;

      setTelemetryBuckets(prev => [
        ...prev.slice(-35),
        {
          timestamp: Date.now(),
          rps: currentRps,
          avgLatency: Math.round(avgLat),
          errorCount: recent.filter(i => i.isError).length,
          activeVUs: desiredVUs
        }
      ]);
    }, sampleRateMs);
    bucketTimerRef.current = bucketInterval;

    const runWorker = async (vuId: number) => {
      while (!controller.signal.aborted) {
        const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
        const elapsedMs = elapsedSec * 1000;

        // Проверяем лимиты времени и количества запросов
        if (elapsedMs >= maxDurationMs || sentCounter >= maxRequests) break;

        const { desiredVUs, isCompleted } = calculateDesiredVUs(elapsedSec, engineSettings);
        if (isCompleted) break;

        // Если текущему воркеру не выделен слот (разгон еще не дошел до него) — ожидаем
        if (vuId >= desiredVUs) {
          await new Promise(r => setTimeout(r, 100));
          continue;
        }

        const reqId = ++sentCounter;

        if (engineSettings.rateLimitRps > 0) {
          await new Promise(r => setTimeout(r, 1000 / engineSettings.rateLimitRps));
        }

        const virtualIp = `192.168.${(vuId % 20) + 1}.${(reqId % 250) + 1}`;

        const headers: Record<string, string> = {
          'X-Forwarded-For': virtualIp,
          'X-Real-IP': virtualIp,
          'X-User-Id': `user_${vuId + 1}`
        };

        if (scenario.authType === 'bearer' && scenario.authToken) {
          headers['Authorization'] = `Bearer ${scenario.authToken}`;
        }
        if (scenario.method !== 'GET' && scenario.method !== 'HEAD' && scenario.bodyContent) {
          headers['Content-Type'] = 'application/json';
        }

        const reqInit: RequestInit = {
          method: scenario.method,
          headers,
          signal: controller.signal
        };

        if (scenario.method !== 'GET' && scenario.method !== 'HEAD' && scenario.bodyContent) {
          reqInit.body = scenario.bodyContent;
        }

        const tStart = performance.now();
        let trace: RequestTrace;

        try {
          const res = await fetch(scenario.targetUrl, reqInit);
          const tEnd = performance.now();
          const duration = Math.round(tEnd - tStart);
          const bodyText = await res.text();
          const bytes = new Blob([bodyText]).size;

          const pass = evaluateAssertions(engineSettings.assertions, res.status, duration, bodyText);

          trace = {
            id: reqId,
            timestamp: Date.now(),
            method: scenario.method,
            url: scenario.targetUrl,
            durationMs: duration,
            statusCode: res.status,
            statusText: res.statusText || 'OK',
            responseBytes: bytes,
            isError: !res.ok || !pass,
            assertionPassed: pass
          };
        } catch {
          if (controller.signal.aborted) break;
          trace = {
            id: reqId,
            timestamp: Date.now(),
            method: scenario.method,
            url: scenario.targetUrl,
            durationMs: Math.round(performance.now() - tStart),
            statusCode: 0,
            statusText: 'ERR_FAILED',
            responseBytes: 0,
            isError: true,
            assertionPassed: false
          };
        }

        liveTracesRef.current.push(trace);

        if (reqId % 10 === 0 || reqId === maxRequests) {
          setTraces([...liveTracesRef.current]);
        }
      }
    };

    const workers = Array.from({ length: maxVUs }, (_, i) => runWorker(i));
    await Promise.all(workers);

    if (bucketTimerRef.current) clearInterval(bucketTimerRef.current);
    setCurrentActiveVUs(0);
    setTraces([...liveTracesRef.current]);
    setIsRunning(false);
    abortControllerRef.current = null;
    addLog('success', `Benchmark finished: executed ${liveTracesRef.current.length} calls.`);
  };

  const stopLoadEngine = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      if (bucketTimerRef.current) clearInterval(bucketTimerRef.current);
      setCurrentActiveVUs(0);
      setIsRunning(false);
      addLog('warn', 'Execution halted by operator.');
    }
  };

  const metrics: AggregatedMetrics = useMemo(() => {
    const total = traces.length;
    if (total === 0) {
      return {
        totalSent: 0, completed: 0, successCount: 0, status2xx: 0, status3xx: 0,
        status4xx: 0, status429: 0, status5xx: 0, networkErrors: 0, totalBytes: 0,
        throughputKbps: 0, avgBytes: 0, currentRps: 0, activeVUs: currentActiveVUs, elapsedSeconds: 0,
        avgDurationMs: 0, stdDev: 0, minDurationMs: 0, maxDurationMs: 0,
        p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, p999: 0, errorRatePercent: 0
      };
    }

    const elapsed = Math.max((performance.now() - startTimeRef.current) / 1000, 0.2);
    const durations = traces.map(t => t.durationMs).sort((a, b) => a - b);
    const sumDuration = durations.reduce((a, b) => a + b, 0);
    const avgDuration = Math.round(sumDuration / total);

    let s2xx = 0, s3xx = 0, s4xx = 0, s429 = 0, s5xx = 0, netErr = 0, bytes = 0;

    for (const t of traces) {
      bytes += t.responseBytes;
      if (t.statusCode >= 200 && t.statusCode < 300) s2xx++;
      else if (t.statusCode >= 300 && t.statusCode < 400) s3xx++;
      else if (t.statusCode === 429) { s429++; s4xx++; }
      else if (t.statusCode >= 400 && t.statusCode < 500) s4xx++;
      else if (t.statusCode >= 500) s5xx++;
      else if (t.statusCode === 0) netErr++;
    }

    const failedCount = traces.filter(t => t.isError || !t.assertionPassed).length;

    return {
      totalSent: total,
      completed: total,
      successCount: s2xx,
      status2xx: s2xx,
      status3xx: s3xx,
      status4xx: s4xx,
      status429: s429,
      status5xx: s5xx,
      networkErrors: netErr,
      totalBytes: bytes,
      throughputKbps: Math.round(bytes / (elapsed * 1024)),
      avgBytes: Math.round(bytes / total),
      currentRps: Math.round(total / elapsed),
      activeVUs: currentActiveVUs,
      elapsedSeconds: Number(elapsed.toFixed(1)),
      avgDurationMs: avgDuration,
      stdDev: computeStdDev(durations, avgDuration),
      minDurationMs: durations[0] ?? 0,
      maxDurationMs: durations[durations.length - 1] ?? 0,
      p50: computePercentile(durations, 50),
      p75: computePercentile(durations, 75),
      p90: computePercentile(durations, 90),
      p95: computePercentile(durations, 95),
      p99: computePercentile(durations, 99),
      p999: computePercentile(durations, 99.9),
      errorRatePercent: Number(((failedCount / total) * 100).toFixed(1))
    };
  }, [traces, currentActiveVUs]);

  return {
    isRunning,
    traces,
    telemetryBuckets,
    metrics,
    startLoadEngine,
    stopLoadEngine
  };
}
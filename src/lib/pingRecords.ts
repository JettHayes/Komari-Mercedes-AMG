export interface PingRecord {
  client: string;
  task_id: number;
  time: string;
  value: number;
}

export interface PingTaskInfo {
  id: number;
  name: string;
  interval: number;
  loss: number;
  value?: number;
  p99?: number;
  p50?: number;
  p99_p50_ratio?: number;
  min?: number;
  max?: number;
  avg?: number;
  latest?: number;
  total?: number;
  type?: string;
}

export interface PingRecordsResponse {
  count: number;
  records: PingRecord[];
  tasks: PingTaskInfo[];
  from?: string;
  to?: string;
}

type RPC2Call = <TParams = any, TResult = any>(
  method: string,
  params?: TParams,
  options?: any
) => Promise<TResult>;

type PingRecordsCacheEntry = {
  expiresAt: number;
  data?: PingRecordsResponse;
  promise?: Promise<PingRecordsResponse>;
};

const PING_RECORDS_CACHE_TTL_MS = 60_000;
export const PING_RECORDS_AUTO_REFRESH_MS = 60_000;
const MAX_CONCURRENT_PING_RECORD_REQUESTS = 2;
const pingRecordsCache = new Map<string, PingRecordsCacheEntry>();
let activePingRecordRequests = 0;
const pingRecordRequestQueue: Array<() => void> = [];

const emptyPingRecordsResponse: PingRecordsResponse = {
  count: 0,
  records: [],
  tasks: [],
};

function normalizeUuid(uuid: string | null | undefined): string {
  return typeof uuid === "string" ? uuid.trim() : "";
}

function normalizeHours(hours: number): number {
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function getCacheKey(uuid: string, hours: number): string {
  return `${uuid}:${hours}`;
}

function normalizeResponse(result: Partial<PingRecordsResponse> | null | undefined): PingRecordsResponse {
  const records = [...(result?.records || [])].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  return {
    count: result?.count ?? records.length,
    records,
    tasks: result?.tasks || [],
    from: result?.from,
    to: result?.to,
  };
}

function runWithPingRecordRequestLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activePingRecordRequests++;
      task()
        .then(resolve, reject)
        .finally(() => {
          activePingRecordRequests = Math.max(0, activePingRecordRequests - 1);
          pingRecordRequestQueue.shift()?.();
        });
    };

    if (activePingRecordRequests < MAX_CONCURRENT_PING_RECORD_REQUESTS) {
      run();
      return;
    }

    pingRecordRequestQueue.push(run);
  });
}

export async function fetchPingRecords(
  call: RPC2Call,
  uuid: string | null | undefined,
  hours: number,
  options: { forceRefresh?: boolean } = {}
): Promise<PingRecordsResponse> {
  const normalizedUuid = normalizeUuid(uuid);
  const normalizedHours = normalizeHours(hours);

  if (!normalizedUuid || !normalizedHours) {
    return emptyPingRecordsResponse;
  }

  const now = Date.now();
  const cacheKey = getCacheKey(normalizedUuid, normalizedHours);
  const cached = pingRecordsCache.get(cacheKey);

  if (cached) {
    if (cached.promise) return cached.promise;
    if (!options.forceRefresh && cached.expiresAt > now && cached.data) {
      return cached.data;
    }
  }

  const promise = runWithPingRecordRequestLimit(() =>
    call<any, PingRecordsResponse>("common:getRecords", {
      uuid: normalizedUuid,
      type: "ping",
      hours: normalizedHours,
    })
  )
    .then((result) => {
      const data = normalizeResponse(result);
      pingRecordsCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + PING_RECORDS_CACHE_TTL_MS,
      });
      return data;
    })
    .catch((error) => {
      pingRecordsCache.delete(cacheKey);
      throw error;
    });

  pingRecordsCache.set(cacheKey, {
    promise,
    expiresAt: now + PING_RECORDS_CACHE_TTL_MS,
  });

  return promise;
}

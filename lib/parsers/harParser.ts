import { HarRequest } from '@/types';

export function parseHar(file: File): Promise<HarRequest[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const har = JSON.parse(text);

        if (!har?.log?.entries || !Array.isArray(har.log.entries)) {
          return reject(new Error('Invalid HAR format'));
        }

        const requests: HarRequest[] = har.log.entries.map((entry: any) => {
          // ---- Headers ----
          const reqHeaders: Record<string, string> = {};
          (entry.request?.headers || []).forEach((h: any) => {
            if (h?.name && h?.value) {
              reqHeaders[h.name.toLowerCase()] = h.value;
            }
          });

          const resHeaders: Record<string, string> = {};
          (entry.response?.headers || []).forEach((h: any) => {
            if (h?.name && h?.value) {
              resHeaders[h.name.toLowerCase()] = h.value;
            }
          });

          // ---- Timing ----
          const startTime = new Date(entry.startedDateTime).getTime();
          const duration = typeof entry.time === 'number' ? entry.time : 0;
          const endTime = startTime + duration;

          // ---- Stable ID ----
          const id = [
            entry.request?.method,
            entry.request?.url,
            entry.startedDateTime,
          ]
            .filter(Boolean)
            .join('|');

          // ---- Sizes ----
          const requestSize =
            typeof entry.request?.bodySize === 'number' &&
            entry.request.bodySize >= 0
              ? entry.request.bodySize
              : undefined;

          const responseSize =
            typeof entry.response?.bodySize === 'number' &&
            entry.response.bodySize >= 0
              ? entry.response.bodySize
              : undefined;

          // ---- Resource Type ----
          const resourceType =
            entry._resourceType ||
            entry.response?.content?.mimeType?.split('/')[0] ||
            undefined;

          // ---- Timings ----
          const timings = entry.timings
            ? {
                blocked: entry.timings.blocked,
                dns: entry.timings.dns,
                connect: entry.timings.connect,
                ssl: entry.timings.ssl,
                send: entry.timings.send,
                wait: entry.timings.wait,
                receive: entry.timings.receive,
              }
            : undefined;

          return {
            id,
            method: entry.request?.method ?? 'GET',
            url: entry.request?.url ?? '',
            status: entry.response?.status ?? 0,
            statusText: entry.response?.statusText,
            startTime,
            endTime,
            duration,
            headers: reqHeaders,
            responseHeaders: resHeaders,
            requestSize,
            responseSize,
            resourceType,
            timings,
          };
        });

        resolve(requests);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error parsing HAR'));
      }
    };

    reader.onerror = () =>
      reject(reader.error ?? new Error('Error reading file'));

    reader.readAsText(file);
  });
}

import { HarRequest } from '@/types';
import {
  normalizeTimings,
  parseUrlParts,
  safeMs,
} from '@/lib/utils/har';

export function parseHar(file: File): Promise<HarRequest[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const har = JSON.parse(reader.result as string);

        if (!har?.log?.entries || !Array.isArray(har.log.entries)) {
          return reject(new Error('Invalid HAR format'));
        }

        const requests: HarRequest[] = har.log.entries.map(
          (entry: any, index: number) => {
            /* ---------- Headers ---------- */

            const headers: Record<string, string> = {};
            entry.request?.headers?.forEach((h: any) => {
              if (h?.name && h?.value) {
                headers[h.name.toLowerCase()] = h.value;
              }
            });

            const responseHeaders: Record<string, string> = {};
            entry.response?.headers?.forEach((h: any) => {
              if (h?.name && h?.value) {
                responseHeaders[h.name.toLowerCase()] = h.value;
              }
            });

            /* ---------- Timing ---------- */

            const startTime = new Date(entry.startedDateTime).getTime();
            const duration = safeMs(entry.time);
            const endTime = startTime + duration;
            const timings = normalizeTimings(entry.timings);

            /* ---------- URL ---------- */

            const url = entry.request?.url ?? '';
            const urlParts = parseUrlParts(url);

            /* ---------- Query params ---------- */

            const requestQuery: Record<string, string> = {};
            entry.request?.queryString?.forEach((q: any) => {
              if (q?.name && q?.value != null) {
                requestQuery[q.name] = String(q.value);
              }
            });

            /* ---------- Request body ---------- */

            const postData = entry.request?.postData;
            const requestBody = postData
              ? {
                  text: postData.text,
                  mimeType: postData.mimeType,
                  size:
                    typeof entry.request?.bodySize === 'number'
                      ? entry.request.bodySize
                      : undefined,
                }
              : undefined;

            /* ---------- Response body ---------- */

            const content = entry.response?.content;
            const responseBody = content
              ? {
                  text: content.text,
                  mimeType: content.mimeType,
                  size:
                    typeof content.size === 'number'
                      ? content.size
                      : undefined,
                  encoding: content.encoding,
                }
              : undefined;

            /* ---------- Sizes ---------- */

            const requestBodySize =
              typeof entry.request?.bodySize === 'number' &&
              entry.request.bodySize >= 0
                ? entry.request.bodySize
                : undefined;

            const responseBodySize =
              typeof entry.response?.bodySize === 'number' &&
              entry.response.bodySize >= 0
                ? entry.response.bodySize
                : undefined;

            const sizes = {
              requestHeaders:
                typeof entry.request?.headersSize === 'number'
                  ? entry.request.headersSize
                  : undefined,
              requestBody: requestBodySize,
              requestTotal:
                typeof entry.request?.headersSize === 'number' &&
                typeof requestBodySize === 'number'
                  ? entry.request.headersSize + requestBodySize
                  : undefined,

              responseHeaders:
                typeof entry.response?.headersSize === 'number'
                  ? entry.response.headersSize
                  : undefined,
              responseBody: responseBodySize,
              responseTotal:
                typeof entry.response?.headersSize === 'number' &&
                typeof responseBodySize === 'number'
                  ? entry.response.headersSize + responseBodySize
                  : undefined,
            };

            /* ---------- Metadata ---------- */

            const resourceType =
              entry._resourceType ||
              entry.response?.content?.mimeType?.split('/')[0] ||
              undefined;

            const fromCache = Boolean(entry.response?._fromCache);
            const serverIp =
              typeof entry.serverIPAddress === 'string'
                ? entry.serverIPAddress
                : undefined;

            /* ---------- Stable ID ---------- */

            const id = [
              entry.request?.method ?? 'GET',
              url,
              entry.startedDateTime,
              index,
            ].join('|');

            return {
              id,
              method: entry.request?.method ?? 'GET',
              url,

              protocol: urlParts.protocol,
              domain: urlParts.domain,
              path: urlParts.path,
              query: urlParts.query,

              status: entry.response?.status ?? 0,
              statusText: entry.response?.statusText,

              startTime,
              endTime,
              duration,

              headers,
              responseHeaders,

              requestQuery:
                Object.keys(requestQuery).length > 0
                  ? requestQuery
                  : undefined,

              requestBody,
              responseBody,

              sizes,

              requestSize: requestBodySize,
              responseSize: responseBodySize,

              resourceType,
              serverIp,
              fromCache,

              timings,
            };
          }
        );

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

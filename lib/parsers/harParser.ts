import { HarRequest } from "@/types";

export function parseHar(file: File): Promise<HarRequest[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const har = JSON.parse(text);

        if (!har?.log?.entries) {
          return reject(new Error('Invalid HAR format'));
        }

        const requests: HarRequest[] = har.log.entries.map((entry: any, index: number) => {
          const reqHeaders: Record<string, string> = {};
          entry.request.headers.forEach((h: any) => {
            reqHeaders[h.name.toLowerCase()] = h.value;
          });

          const resHeaders: Record<string, string> = {};
          entry.response.headers.forEach((h: any) => {
            resHeaders[h.name.toLowerCase()] = h.value;
          });

          const start = new Date(entry.startedDateTime).getTime();
          const end = start + entry.time;

          return {
            id: String(index),
              method: entry.request.method,
              url: entry.request.url,
              status: entry.response.status,
              statusText: entry.response.statusText,
              startTime: start,
              endTime: end,
              duration: entry.time,
              headers: reqHeaders,
              responseHeaders: resHeaders,
          };
        });

        resolve(requests);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error parsing HAR'));
      }
    };

    reader.onerror = () => reject(reader.error ?? new Error('Error reading file'));
    reader.readAsText(file);
  });
}

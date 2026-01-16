'use client';

import { Finding, HarRequest } from '@/types';
import { buildFindingsViewModel } from '@/lib/utils/findingsView';
import { getMethodStyle } from '@/lib/utils/filterStyles';
import { useMemo } from 'react';

interface FindingsViewProps {
  findings: Finding[];
  requests: HarRequest[];
  onSelectRequest: (id: string) => void;
}

export default function FindingsView({
  findings,
  requests,
  onSelectRequest,
}: FindingsViewProps) {
  const { topCauses, affectedRequests } = buildFindingsViewModel(
    findings,
    requests
  );
  const reqById = useMemo(
    () => new Map(requests.map((r) => [r.id, r])),
    [requests],
  );

  if (findings.length === 0) {
    return (
      <div className="border border-utility-border p-4 text-[13px] text-utility-muted">
        No findings detected for this analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full p-3">
      {/* Top causes */}
      <div className="space-y-3">
        <div className="utility-label">Top causes</div>
        <div className="space-y-2">
          {topCauses.map((cause) => {
            const sample = cause.sampleRequestId
              ? reqById.get(cause.sampleRequestId)
              : undefined;
            return (
              <button
                key={cause.type}
                onClick={() =>
                  cause.sampleRequestId && onSelectRequest(cause.sampleRequestId)
                }
                className="relative w-full text-left border-b border-utility-border py-2 pl-3"
              >
                <span
                  className={`signal-bar ${
                    cause.severity === 'critical'
                      ? 'bg-utility-error'
                      : cause.severity === 'warning'
                      ? 'bg-utility-warning'
                      : 'bg-utility-border'
                  }`}
                />
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[13px] font-medium text-utility-text">
                    {cause.title}
                  </div>
                  <div className="text-[11px] text-utility-muted font-mono">
                    {cause.count} affected
                  </div>
                </div>
                <div className="text-[11px] text-utility-muted mt-1 break-words">
                  {cause.summary}
                </div>
                {sample && (
                  <div className="text-[11px] font-mono text-utility-muted mt-1 truncate">
                    {sample.method} {sample.status} {sample.path ?? sample.url}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Affected requests */}
      <div className="space-y-3">
        <div className="utility-label">Affected requests</div>
        <div className="space-y-0 w-full max-w-full">
          {affectedRequests.map((item) => (
            <button
              key={item.requestId}
              onClick={() => onSelectRequest(item.requestId)}
              className="relative w-full text-left border-b border-utility-border h-[32px] px-3 flex items-center gap-3 hover:bg-utility-sidebar min-w-0 max-w-full"
            >
              <span
                className={`signal-bar ${
                  item.severity === 'critical'
                    ? 'bg-utility-error'
                    : item.severity === 'warning'
                    ? 'bg-utility-warning'
                    : 'bg-utility-border'
                }`}
              />
              <span className={`text-[13px] font-bold font-mono ${getMethodStyle(item.method).text}`}>
                {item.method}
              </span>
              <span className="text-[13px] font-mono text-utility-text">
                {item.causeTitle}
              </span>
              <span className="truncate text-[11px] font-mono text-utility-muted">
                {item.path ?? item.url}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

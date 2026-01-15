'use client';

import { Finding, HarRequest } from '@/types';
import { buildFindingsViewModel } from '@/lib/utils/findingsView';

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
  const topCauseSlots = Array.from({ length: 4 }, (_, idx) => topCauses[idx]);

  if (findings.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 text-sm text-gray-600 bg-white">
        No findings detected for this analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top causes */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Top causes
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full">
          {topCauseSlots.map((cause, index) =>
            cause ? (
              <button
                key={cause.type}
                onClick={() =>
                  cause.sampleRequestId &&
                  onSelectRequest(cause.sampleRequestId)
                }
                className="text-left border border-gray-200 rounded-xl p-4 bg-white hover:bg-gray-50 w-full min-w-0 max-w-full"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {cause.title}
                </div>
                <div className="text-xs text-gray-600 mt-1 break-words">
                  {cause.summary}
                </div>
                {cause.confidence && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    Confidence: {cause.confidence}
                  </div>
                )}
                {cause.evidence.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 break-words">
                    {cause.evidence.join(' · ')}
                  </div>
                )}
                <div className="mt-3 text-[11px] text-gray-400">
                  {cause.count} affected requests
                </div>
              </button>
            ) : (
              <div
                key={`placeholder-${index}`}
                aria-hidden="true"
                className="border border-gray-200 rounded-xl p-4 bg-white opacity-0 pointer-events-none w-full min-w-0 max-w-full"
              />
            ),
          )}
        </div>
      </div>

      {/* Affected requests */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Affected requests
        </div>
        <div className="space-y-2 w-full max-w-full">
          {affectedRequests.map((item) => (
            <button
              key={item.requestId}
              onClick={() => onSelectRequest(item.requestId)}
              className="w-full text-left border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 min-w-0 max-w-full"
            >
              <div className="text-sm font-medium text-gray-800 break-words">
                <span className="font-method">{item.method}</span>{' '}
                <span className="text-xs text-gray-600">
                  {item.path ?? item.url}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 break-words">
                {item.causeTitle}
              </div>
              {item.evidence.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 break-words">
                  {item.evidence.join(' · ')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

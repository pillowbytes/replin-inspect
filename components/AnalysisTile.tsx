'use client';

import { Finding } from '@/types';
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
} from '@heroicons/react/20/solid';
import { useMemo, useState } from 'react';

interface AnalysisTileProps {
  findings: Finding[];
  onSelectRequest: (id: string) => void;
}

/* ======================
   Helpers
   ====================== */

function extractUrl(description: string): string | null {
  const match = description.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

function truncateMiddle(input: string, max = 64) {
  if (input.length <= max) return input;
  const head = Math.ceil((max - 3) * 0.6);
  const tail = Math.floor((max - 3) * 0.4);
  return `${input.slice(0, head)}...${input.slice(input.length - tail)}`;
}

function cleanMessage(description: string, url: string) {
  let msg = description.replace(url, '').trim();
  msg = msg.replace(/\bon request to\b/gi, '');
  msg = msg.replace(/\brequest to\b/gi, '');
  msg = msg.replace(/\s{2,}/g, ' ').trim();
  msg = msg.replace(/[:\-\s]+$/g, '').trim();
  return msg || 'Issue detected';
}

/* ======================
   Component
   ====================== */

export default function AnalysisTile({
  findings,
  onSelectRequest,
}: AnalysisTileProps) {
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedUrls, setExpandedUrls] = useState<Record<string, boolean>>({});
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [hiddenJson, setHiddenJson] = useState<Record<string, boolean>>({});

  /* ---------- Group: type → url → messageKey ---------- */
  const grouped = useMemo(() => {
    const result: Record<
      string,
      Record<string, Record<string, Finding[]>>
    > = {};

    for (const f of findings) {
      const type = f.type;
      const url = extractUrl(f.description) ?? 'unknown';
      const msg = cleanMessage(f.description, url);
      const key = `${msg}__${f.suggestedAction ?? ''}`;

      result[type] ??= {};
      result[type][url] ??= {};
      result[type][url][key] ??= [];
      result[type][url][key].push(f);
    }

    return result;
  }, [findings]);

  const types = Object.keys(grouped);

  // TODO: Implement scroll to Request Details Sidebar when clicked to see more details.

  if (findings.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 bg-white flex items-center gap-2">
        <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
        <div className="text-sm text-gray-700">
          No issues detected in this analysis.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-900">
          Analysis summary
        </h2>
      </div>

      {/* Types */}
      <div className="space-y-3">
        {types.map((type) => {
          const urls = grouped[type];
          const openType = !!expandedTypes[type];

          const totalCount = Object.values(urls).reduce(
            (s, u) =>
              s +
              Object.values(u).reduce((s2, arr) => s2 + arr.length, 0),
            0,
          );

          return (
            <div key={type} className="space-y-2">
              {/* Type row */}
              <button
                onClick={() =>
                  setExpandedTypes((s) => ({ ...s, [type]: !s[type] }))
                }
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${
                      openType ? 'rotate-180' : ''
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-800 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {totalCount} requests
                </span>
              </button>

              {/* URL groups */}
              {openType && (
                <div className="pl-6 space-y-3">
                  {Object.entries(urls).map(([url, messages]) => {
                    const urlKey = `${type}:${url}`;
                    const openUrl = !!expandedUrls[urlKey];
                    const allGroups = Object.entries(messages);
                    const visible = visibleCounts[urlKey] ?? 5;

                    return (
                      <div key={urlKey} className="space-y-1">
                        {/* URL row */}
                        <button
                          onClick={() =>
                            setExpandedUrls((s) => ({
                              ...s,
                              [urlKey]: !s[urlKey],
                            }))
                          }
                          className="flex items-center justify-between w-full text-left text-sm text-gray-700 hover:text-gray-900"
                          title={url}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 transition-transform ${
                                openUrl ? 'rotate-180' : ''
                              }`}
                            />
                            <span className="font-mono truncate">
                              {truncateMiddle(url)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {allGroups.reduce((s, [, a]) => s + a.length, 0)}
                          </span>
                        </button>

                        {openUrl && (
                          <div className="pl-6 space-y-3">
                            {allGroups.slice(0, visible).map(([key, items]) => {
                              const sample = items[0];
                              const msg = cleanMessage(sample.description, url);

                              return (
                                <div key={key} className="space-y-1">
                                  {/* Message header */}
                                  <div className="flex items-start justify-between text-sm">
                                    <div>
                                      <div className="text-gray-900">
                                        {msg}
                                      </div>
                                      {sample.suggestedAction && (
                                        <div className="text-xs text-gray-500">
                                          {sample.suggestedAction}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {items.length}
                                    </span>
                                  </div>

                                  {/* JSON */}
                                  <button
                                    onClick={() =>
                                      setHiddenJson((s) => ({
                                        ...s,
                                        [key]: !s[key],
                                      }))
                                    }
                                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                                  >
                                    <CodeBracketIcon className="h-3 w-3" />
                                    {hiddenJson[key]
                                      ? 'Show full message'
                                      : 'Hide full message'}
                                  </button>

                                  {!hiddenJson[key] && (
                                    <pre className="bg-gray-50 border border-gray-200 rounded-md p-2 text-[11px] font-mono overflow-x-auto">
{JSON.stringify(
  {
    type: sample.type,
    url,
    message: msg,
    suggestion: sample.suggestedAction,
  },
  null,
  2,
)}
                                    </pre>
                                  )}

                                  {/* Occurrences */}
                                  <div className="pl-4 space-y-1">
                                    {items.map((f, i) => (
                                      <button
                                        key={i}
                                        onClick={() =>
                                          f.relatedRequestId &&
                                          onSelectRequest(f.relatedRequestId)
                                        }
                                        className="block w-full text-left text-xs text-gray-700 hover:text-blue-600"
                                        title={f.description}
                                      >
                                        {msg}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Paging */}
                            {allGroups.length > 5 && (
                              <div className="flex gap-3 text-xs">
                                {visible < allGroups.length && (
                                  <>
                                    <button
                                      onClick={() =>
                                        setVisibleCounts((s) => ({
                                          ...s,
                                          [urlKey]: visible + 5,
                                        }))
                                      }
                                      className="text-blue-600 hover:underline"
                                    >
                                      Show 5 more
                                    </button>
                                    <button
                                      onClick={() =>
                                        setVisibleCounts((s) => ({
                                          ...s,
                                          [urlKey]: allGroups.length,
                                        }))
                                      }
                                      className="text-blue-600 hover:underline"
                                    >
                                      Show all
                                    </button>
                                  </>
                                )}

                                {visible > 5 && (
                                  <button
                                    onClick={() =>
                                      setVisibleCounts((s) => ({
                                        ...s,
                                        [urlKey]: 5,
                                      }))
                                    }
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

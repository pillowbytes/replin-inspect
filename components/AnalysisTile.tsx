'use client';

import { Finding } from '@/types';
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
} from '@heroicons/react/20/solid';
import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AnalysisTileProps {
  findings: Finding[];
  onSelectRequest: (id: string) => void;
  embedded?: boolean;
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
  embedded = false,
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
      <div
        className={`${
          embedded
            ? 'p-0 bg-transparent border-0'
            : 'border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900'
        } flex items-center gap-2`}
      >
        <CheckCircleIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
        <div className="text-sm text-gray-700 dark:text-neutral-300">
          No issues detected in this analysis.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        embedded
          ? 'p-0 bg-transparent border-0'
          : 'border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900'
      } space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-300" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
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
                <span className="text-xs text-gray-500 dark:text-neutral-400">
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
                          className="flex items-center justify-between w-full text-left text-sm text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 transition-transform ${
                                openUrl ? 'rotate-180' : ''
                              }`}
                            />
                            <Tooltip label={url}>
                              <span className="font-mono truncate">
                                {truncateMiddle(url)}
                              </span>
                            </Tooltip>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-neutral-400">
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
                                      <div className="text-gray-900 dark:text-neutral-100">
                                        {msg}
                                      </div>
                                      {sample.confidence && (
                                        <div className="text-[11px] text-gray-500 dark:text-neutral-400">
                                          Confidence: {sample.confidence}
                                        </div>
                                      )}
                                      {sample.suggestedAction && (
                                        <div className="text-xs text-gray-500 dark:text-neutral-400">
                                          {sample.suggestedAction}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-neutral-400">
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
                                    className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                                  >
                                    <CodeBracketIcon className="h-3 w-3" />
                                    {hiddenJson[key]
                                      ? 'Show full message'
                                      : 'Hide full message'}
                                  </button>

                                  {!hiddenJson[key] && (
                                    <pre className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2 text-[11px] font-mono overflow-x-auto text-gray-800 dark:text-neutral-200">
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
                                        className="block w-full text-left text-xs text-gray-700 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-200"
                                      >
                                        <Tooltip label={f.description}>
                                          <span>{msg}</span>
                                        </Tooltip>
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
                                      className="text-blue-600 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
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
                                      className="text-blue-600 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
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
                                    className="text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100"
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

function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  };

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center"
      onMouseEnter={() => {
        updatePosition();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[1000] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-[10px] text-gray-700 dark:text-neutral-200 shadow-sm"
            style={{ left: pos.left, top: pos.top - 8 }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

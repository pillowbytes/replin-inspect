'use client';

import { Finding, HarRequest } from '@/types';
import { getMethodStyle, getStatusText } from '@/lib/utils/filterStyles';
import {
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  ClockIcon,
} from '@heroicons/react/20/solid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ======================
   Types & Props
   ====================== */

interface ResultsTableProps {
  requests: HarRequest[];
  findingsByRequestId?: Record<string, Finding[]>;
  selectedRequestId?: string | null;
  onSelectRequest?: (id: string | null) => void;
  selectedMethods?: Set<HttpMethod>;
  selectedStatusClasses?: Set<StatusClass>;
  selectedResourceTypes?: Set<ResourceTypeFilter>;
  urlQuery?: string;
  issueFilter?: 'all' | 'failures' | 'critical' | 'warning';
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';
type ResourceTypeFilter = 'fetch-xhr' | 'js' | 'css' | 'websocket';
type SortColumn = 'time' | 'duration';

/* ======================
   Helpers
   ====================== */

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toISOString().substring(11, 23);
}

function ms(value?: number) {
  return Math.round(value ?? 0);
}

function statusToClass(status: number): StatusClass {
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  return '2xx';
}

function statusColor(status: number) {
  if (status < 200) return 'text-utility-text';
  return getStatusText(statusToClass(status));
}

function durationBarColor(ms: number) {
  if (ms > 1500) return 'bg-red-500';
  if (ms > 500) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function sizeLabel(bytes?: number) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function matchesResourceType(
  resourceType: string,
  selected: Set<ResourceTypeFilter>
) {
  if (selected.has('fetch-xhr') && (resourceType === 'fetch' || resourceType === 'xhr')) {
    return true;
  }
  if (selected.has('js') && (resourceType === 'script' || resourceType === 'javascript')) {
    return true;
  }
  if (selected.has('css') && (resourceType === 'stylesheet' || resourceType === 'css')) {
    return true;
  }
  if (selected.has('websocket') && resourceType === 'websocket') {
    return true;
  }
  return false;
}

const TIMING_COLORS: Record<
  'blocked' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'receive',
  string
> = {
  blocked: 'bg-utility-muted',
  dns: 'bg-utility-dns',
  connect: 'bg-utility-warning',
  ssl: 'bg-utility-muted',
  send: 'bg-utility-muted',
  wait: 'bg-utility-waiting',
  receive: 'bg-utility-receiving',
};

function normalizeTimings(timings?: HarRequest['timings']) {
  if (!timings) return [];
  return Object.entries(timings)
    .map(([key, value]) => ({
      key: key as keyof typeof TIMING_COLORS,
      value: value != null && value >= 0 ? Math.round(value) : 0,
    }))
    .filter((t) => t.value > 0);
}

function totalRequestSize(req: HarRequest) {
  return (
    req.sizes?.requestTotal ??
    req.requestSize ??
    req.requestBody?.size ??
    req.sizes?.requestBody
  );
}

function totalResponseSize(req: HarRequest) {
  return (
    req.sizes?.responseTotal ??
    req.responseSize ??
    req.responseBody?.size ??
    req.sizes?.responseBody
  );
}

function totalTransferSize(req: HarRequest) {
  const requestBytes = totalRequestSize(req);
  const responseBytes = totalResponseSize(req);
  if (requestBytes == null && responseBytes == null) return undefined;
  return (requestBytes ?? 0) + (responseBytes ?? 0);
}

/* ======================
   Component
   ====================== */

export default function ResultsTable({
  requests,
  findingsByRequestId = {},
  selectedRequestId,
  onSelectRequest,
  selectedMethods = new Set<HttpMethod>(),
  selectedStatusClasses = new Set<StatusClass>(),
  selectedResourceTypes = new Set<ResourceTypeFilter>(),
  urlQuery = '',
  issueFilter = 'all',
}: ResultsTableProps) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortColumn, setSortColumn] = useState<SortColumn>('duration');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Filtering & sorting ---------- */
  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        const findings = findingsByRequestId[r.id] ?? [];
        const issueOk =
          issueFilter === 'all' ||
          (issueFilter === 'failures' && r.status >= 400) ||
          (issueFilter === 'critical' &&
            findings.some((f) => f.severity === 'critical')) ||
          (issueFilter === 'warning' &&
            findings.some((f) => f.severity === 'warning'));

        if (!issueOk) return false;

        const methodOk =
          selectedMethods.size === 0 || selectedMethods.has(r.method as HttpMethod);
        const statusOk =
          selectedStatusClasses.size === 0 ||
          selectedStatusClasses.has(statusToClass(r.status));
        const urlOk =
          urlQuery.trim() === '' ||
          r.url.toLowerCase().includes(urlQuery.toLowerCase());
        const resourceOk =
          selectedResourceTypes.size === 0 ||
          matchesResourceType((r.resourceType ?? '').toLowerCase(), selectedResourceTypes);

        return methodOk && statusOk && urlOk && resourceOk;
      })
      .sort((a, b) => {
        const delta =
          sortColumn === 'time'
            ? a.startTime - b.startTime
            : ms(a.duration) - ms(b.duration);
        return sortDir === 'asc' ? delta : -delta;
      });
  }, [
    requests,
    findingsByRequestId,
    issueFilter,
    selectedMethods,
    selectedStatusClasses,
    urlQuery,
    sortDir,
    sortColumn,
  ]);


  /* ---------- Auto-select first visible ---------- */
  useEffect(() => {
    if (!onSelectRequest || filtered.length === 0) return;

    const stillVisible = filtered.some((r) => r.id === selectedRequestId);
    if (!selectedRequestId || !stillVisible) {
      onSelectRequest(filtered[0].id);
    }
  }, [filtered, selectedRequestId, onSelectRequest]);

  /* ---------- Keyboard navigation (scoped) ---------- */
  useEffect(() => {
    if (!onSelectRequest || filtered.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (!selectedRequestId) return;

      const idx = filtered.findIndex((r) => r.id === selectedRequestId);
      if (idx === -1) return;

      if (e.key === 'ArrowDown' && idx < filtered.length - 1) {
        e.preventDefault();
        onSelectRequest(filtered[idx + 1].id);
      }

      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        onSelectRequest(filtered[idx - 1].id);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectRequest(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selectedRequestId, onSelectRequest]);

  useEffect(() => {
    if (!selectedRequestId) return;
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector(
      `[data-request-id="${selectedRequestId}"]`
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
  }, [selectedRequestId]);

  if (!requests.length) return null;

  return (
    <div className="flex flex-col min-h-0 h-full" ref={containerRef}>
      {/* Rows */}
      <div className="overflow-hidden flex-1 min-h-0 bg-utility-main">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain no-scrollbar"
        >
          <div
            className="sticky top-0 z-10 bg-utility-main grid grid-cols-[110px_70px_70px_minmax(0,1fr)_80px_90px_200px] items-center px-3 utility-table-header"
          >
            <button
              onClick={() => {
                setSortColumn('time');
                setSortDir((d) =>
                  sortColumn === 'time' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
                );
              }}
              className="flex items-center gap-1 text-left hover:text-utility-text"
            >
              <ClockIcon className="h-3 w-3" />
              Time
              {sortColumn === 'time' &&
                (sortDir === 'asc' ? (
                  <BarsArrowUpIcon className="h-3 w-3" />
                ) : (
                  <BarsArrowDownIcon className="h-3 w-3" />
                ))}
            </button>
            <div>Method</div>
            <div>Status</div>
            <div>Path</div>
            <div>Type</div>
            <div>Size</div>
            <button
              onClick={() => {
                setSortColumn('duration');
                setSortDir((d) =>
                  sortColumn === 'duration' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'
                );
              }}
              className="flex items-center justify-end gap-1 text-right hover:text-utility-text"
            >
              Timeline
              {sortColumn === 'duration' &&
                (sortDir === 'asc' ? (
                  <BarsArrowUpIcon className="h-3 w-3" />
                ) : (
                  <BarsArrowDownIcon className="h-3 w-3" />
                ))}
            </button>
          </div>

          <div>
        {filtered.map((req) => {
          const selected = selectedRequestId === req.id;
          const durationMs = ms(req.duration);
          const timingItems = normalizeTimings(req.timings);
          const timingTotal =
            timingItems.reduce((s, t) => s + t.value, 0) || durationMs;
          const requestSizeLabel = sizeLabel(totalRequestSize(req));
          const responseSizeLabel = sizeLabel(totalResponseSize(req));

          return (
            <div
              key={req.id}
              data-request-id={req.id}
              tabIndex={0}
              aria-selected={selected}
              onClick={() => onSelectRequest?.(req.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRequest?.(req.id);
                }
              }}
              className={`grid grid-cols-[110px_70px_70px_minmax(0,1fr)_80px_90px_200px] items-center px-3 utility-table-row cursor-pointer focus:outline-none ${
                selected
                  ? 'bg-utility-selection outline outline-1 outline-utility-border -outline-offset-1'
                  : ''
              }`}
            >
              {/* Time */}
              <div className="text-[11px] text-utility-muted font-mono">
                {formatTime(req.startTime)}
              </div>

              {/* Method */}
              <div className={`text-[13px] font-bold font-mono ${getMethodStyle(req.method).text}`}>
                {req.method}
              </div>

              {/* Status */}
              <Tooltip label="HTTP status code from the response.">
                <div className={`text-[13px] font-mono ${statusColor(req.status)}`}>
                  {req.status}
                </div>
              </Tooltip>

              {/* Path / Domain */}
              <div className="min-w-0 flex items-center gap-2">
                <span className="truncate font-mono text-[12px] text-utility-text">
                  {req.path ?? req.url}
                </span>
                {req.domain && (
                  <span className="truncate font-mono text-[11px] text-utility-muted">
                    {req.domain}
                  </span>
                )}
              </div>

              {/* Type */}
              <div className="text-[11px] font-bold uppercase text-utility-muted">
                {(req.resourceType ?? 'request').toUpperCase()}
              </div>

              {/* Size */}
              <Tooltip
                label={`Request ${
                  requestSizeLabel === '—' ? 'N/A' : requestSizeLabel
                } · Response ${responseSizeLabel === '—' ? 'N/A' : responseSizeLabel}`}
              >
                <div className="text-[11px] font-mono text-utility-text">
                  {sizeLabel(totalTransferSize(req))}
                </div>
              </Tooltip>

              {/* Timing */}
              <div className="flex items-center justify-end">
                {timingItems.length > 0 ? (
                  <div className="h-2 w-full bg-utility-border flex overflow-hidden">
                    {timingItems.map((t) => {
                      const label = `${t.key} (${t.value} ms)`;
                      const width = Math.max(1, (t.value / timingTotal) * 100);
                      return (
                        <Tooltip
                          key={t.key}
                          label={label}
                          className={`${TIMING_COLORS[t.key]} h-full`}
                          style={{ width: `${width}%` }}
                        >
                          <span className="sr-only">{label}</span>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  <Tooltip label="Timing data not available in this HAR entry.">
                    <div className="h-2 w-full border border-dashed border-utility-border" />
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-utility-muted">
            No requests match the selected filters.
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================
   Small UI helpers
   ====================== */

function Tooltip({
  label,
  children,
  className,
  style,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const shouldFlip = rect.top < 48;
    setPlacement(shouldFlip ? 'bottom' : 'top');
    setPos({
      left: rect.left + rect.width / 2,
      top: shouldFlip ? rect.bottom : rect.top,
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
      className={`inline-flex items-center ${className ?? ''}`}
      style={style}
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
            className={`pointer-events-none fixed z-[1000] -translate-x-1/2 whitespace-nowrap rounded-none bg-black dark:bg-neutral-800 px-2 py-1 text-[11px] font-mono text-white dark:text-neutral-100 ${
              placement === 'top' ? '-translate-y-full' : 'translate-y-0'
            }`}
            style={{ left: pos.left, top: placement === 'top' ? pos.top - 8 : pos.top + 8 }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

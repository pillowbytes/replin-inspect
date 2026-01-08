'use client';

import { Finding, HarRequest } from '@/types';
import { SLOW_REQUEST_MS, VERY_SLOW_REQUEST_MS } from '@/lib/rules/networkRules';
import {
  ArrowsRightLeftIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CodeBracketIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PhotoIcon,
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
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';
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
  if (status >= 500) return 'text-red-600';
  if (status >= 400) return 'text-amber-600';
  if (status >= 300) return 'text-blue-600';
  return 'text-gray-900';
}

function durationBarColor(ms: number) {
  if (ms > 1500) return 'bg-red-500';
  if (ms > 500) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function durationTextStyle(ms: number) {
  if (ms >= VERY_SLOW_REQUEST_MS) {
    return 'text-red-600 font-semibold';
  }
  if (ms >= SLOW_REQUEST_MS) {
    return 'text-amber-600 font-semibold';
  }
  return 'text-emerald-600';
}

function sizeLabel(bytes?: number) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const TIMING_COLORS: Record<
  'blocked' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'receive',
  string
> = {
  blocked: 'bg-gray-400',
  dns: 'bg-purple-500',
  connect: 'bg-blue-500',
  ssl: 'bg-indigo-500',
  send: 'bg-slate-500',
  wait: 'bg-amber-500',
  receive: 'bg-emerald-500',
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

/* ======================
   Component
   ====================== */

export default function ResultsTable({
  requests,
  findingsByRequestId = {},
  selectedRequestId,
  onSelectRequest,
}: ResultsTableProps) {
  const [selectedMethods, setSelectedMethods] = useState<Set<HttpMethod>>(new Set());
  const [selectedStatusClasses, setSelectedStatusClasses] = useState<Set<StatusClass>>(new Set());
  const [urlQuery, setUrlQuery] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortColumn, setSortColumn] = useState<SortColumn>('duration');
  const [openDropdown, setOpenDropdown] = useState<'method' | 'status' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [topBump, setTopBump] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bumpTimerRef = useRef<number | null>(null);

  /* ---------- Outside click: close dropdown ---------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSetValue = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  };

  /* ---------- Filtering & sorting ---------- */
  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        const methodOk =
          selectedMethods.size === 0 || selectedMethods.has(r.method as HttpMethod);
        const statusOk =
          selectedStatusClasses.size === 0 ||
          selectedStatusClasses.has(statusToClass(r.status));
        const urlOk =
          urlQuery.trim() === '' ||
          r.url.toLowerCase().includes(urlQuery.toLowerCase());

        return methodOk && statusOk && urlOk;
      })
      .sort((a, b) => {
        const delta =
          sortColumn === 'time'
            ? a.startTime - b.startTime
            : ms(a.duration) - ms(b.duration);
        return sortDir === 'asc' ? delta : -delta;
      });
  }, [requests, selectedMethods, selectedStatusClasses, urlQuery, sortDir, sortColumn]);

  const maxDuration = useMemo(
    () => Math.max(1, ...filtered.map((r) => ms(r.duration))),
    [filtered],
  );

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

  if (!requests.length) return null;

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Controls */}
      <div
        className="flex items-center justify-between gap-4 text-sm"
        ref={dropdownRef}
      >
        <div className="flex items-center gap-3">
          {/* URL search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={urlQuery}
              onChange={(e) => setUrlQuery(e.target.value)}
              placeholder="Filter URL"
              className="pl-8 pr-2 py-1.5 w-48 border border-gray-200 rounded-md"
            />
          </div>

          <Dropdown
            label="Method"
            isOpen={openDropdown === 'method'}
            onToggle={() =>
              setOpenDropdown(openDropdown === 'method' ? null : 'method')
            }
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(
              (m) => (
                <DropdownOption
                  key={m}
                  active={selectedMethods.has(m)}
                  onClick={() =>
                    setSelectedMethods((s) => toggleSetValue(s, m))
                  }
                >
                  {m}
                </DropdownOption>
              ),
            )}
          </Dropdown>

          <Dropdown
            label="Status"
            isOpen={openDropdown === 'status'}
            onToggle={() =>
              setOpenDropdown(openDropdown === 'status' ? null : 'status')
            }
          >
            {(['2xx', '3xx', '4xx', '5xx'] as StatusClass[]).map((s) => (
              <DropdownOption
                key={s}
                active={selectedStatusClasses.has(s)}
                onClick={() =>
                  setSelectedStatusClasses((c) => toggleSetValue(c, s))
                }
              >
                {s}
              </DropdownOption>
            ))}
          </Dropdown>
        </div>

        <div />
      </div>

      {/* Rows */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={() => {
            const top = scrollRef.current?.scrollTop ?? 0;
            setIsAtTop(top <= 0);
          }}
          onWheel={(e) => {
            const top = scrollRef.current?.scrollTop ?? 0;
            if (top <= 0 && e.deltaY < 0) {
              setTopBump(true);
              if (bumpTimerRef.current) {
                window.clearTimeout(bumpTimerRef.current);
              }
              bumpTimerRef.current = window.setTimeout(
                () => setTopBump(false),
                160,
              );
            }
          }}
          className="h-[837px] overflow-y-auto overscroll-contain"
        >
          <div
            className={`sticky top-0 z-10 bg-white border-b border-gray-200 grid grid-cols-[120px_1fr_240px] items-center px-3 py-2 text-xs text-gray-500 uppercase tracking-wide ${
              isAtTop ? '' : 'shadow-sm'
            } ${topBump ? '-translate-y-0.5 scale-y-105' : ''} origin-top transition-transform`}
          >
            <button
              onClick={() => {
                setSortColumn('time');
                setSortDir((d) =>
                  sortColumn === 'time' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
                );
              }}
              className="flex items-center gap-1 text-left hover:text-gray-700"
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
            <div className="space-y-1">
              <div>Request</div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 normal-case tracking-normal">
                <span>Status</span>
                <span>Type</span>
                <span>Size sent → recv</span>
                <span>Findings</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSortColumn('duration');
                setSortDir((d) =>
                  sortColumn === 'duration' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'
                );
              }}
              className="flex items-center justify-end gap-1 text-right hover:text-gray-700"
            >
              Timing
              {sortColumn === 'duration' &&
                (sortDir === 'asc' ? (
                  <BarsArrowUpIcon className="h-3 w-3" />
                ) : (
                  <BarsArrowDownIcon className="h-3 w-3" />
                ))}
            </button>
          </div>

          <div className="divide-y">
        {filtered.map((req) => {
          const findings = findingsByRequestId[req.id] ?? [];
          const selected = selectedRequestId === req.id;
          const durationMs = ms(req.duration);
          const barWidth = Math.max(
            4,
            Math.round((durationMs / maxDuration) * 100),
          );
          const timingItems = normalizeTimings(req.timings);
          const timingTotal =
            timingItems.reduce((s, t) => s + t.value, 0) || durationMs;
          const requestSizeLabel = sizeLabel(totalRequestSize(req));
          const responseSizeLabel = sizeLabel(totalResponseSize(req));

          return (
            <div
              key={req.id}
              tabIndex={0}
              aria-selected={selected}
              onClick={() => onSelectRequest?.(req.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRequest?.(req.id);
                }
              }}
              className={`grid grid-cols-[120px_1fr_240px] items-center px-3 py-3 cursor-pointer hover:bg-gray-50 focus:outline-none ${
                selected
                  ? 'bg-white ring-1 ring-slate-300 border-l-4 border-blue-500 shadow-sm'
                  : ''
              }`}
            >
              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3 shrink-0" />
                <span>{formatTime(req.startTime)}</span>
              </div>

              {/* Request info */}
              <div className="space-y-1 overflow-hidden">
                <div className="truncate text-sm font-medium">
                  <span className="font-mono mr-2">{req.method}</span>
                  {req.url}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <Tooltip label="HTTP status code from the response.">
                    <span className={statusColor(req.status)}>
                      {req.status}
                    </span>
                  </Tooltip>
                  <ResourceTypeIcon type={req.resourceType} />
                  <span className="flex items-center gap-1">
                    <Tooltip
                      label={`Request Size ${
                        requestSizeLabel === '—' ? 'Not available' : requestSizeLabel
                      }`}
                    >
                      <span>{requestSizeLabel}</span>
                    </Tooltip>
                    <span>→</span>
                    <Tooltip
                      label={`Response Size ${
                        responseSizeLabel === '—' ? 'Not available' : responseSizeLabel
                      }`}
                    >
                      <span>{responseSizeLabel}</span>
                    </Tooltip>
                  </span>

                  {findings.length > 0 && (
                    <Tooltip label="Issues detected for this request.">
                      <span className="flex items-center gap-1 text-amber-600">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        {findings.length}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="flex items-center gap-2">
                {timingItems.length > 0 ? (
                  <>
                    <div className="h-3 w-[70%] bg-gray-200 rounded-full flex overflow-visible">
                      {timingItems.map((t) => {
                        const label = `${t.key} (${t.value} ms)`;
                        return (
                          <Tooltip
                            key={t.key}
                            label={label}
                            className={`${TIMING_COLORS[t.key]} h-full first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${(t.value / timingTotal) * 100}%` }}
                          >
                            <span className="sr-only">{label}</span>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <div className={`text-xs w-16 text-right ${durationTextStyle(durationMs)}`}>
                      {durationMs} ms
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full text-xs text-gray-400">
                    <div className="h-3 w-[70%] rounded-full border border-dashed border-gray-300" />
                    <Tooltip label="Timing data not available in this HAR entry.">
                      <span className="ml-2 w-16 text-right">No timing</span>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
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

function Dropdown({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-md hover:text-gray-900"
      >
        {label}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownOption({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
    >
      <span>{children}</span>
      {active && <CheckIcon className="h-4 w-4" />}
    </div>
  );
}

function ResourceTypeIcon({ type }: { type?: string }) {
  const key = (type ?? 'request').toLowerCase();
  const mapping: Record<string, { label: string; icon: any }> = {
    document: { label: 'Document', icon: DocumentTextIcon },
    script: { label: 'Script', icon: CodeBracketIcon },
    stylesheet: { label: 'Stylesheet', icon: PaintBrushIcon },
    image: { label: 'Image', icon: PhotoIcon },
    media: { label: 'Media', icon: FilmIcon },
    font: { label: 'Font', icon: CubeIcon },
    xhr: { label: 'XHR', icon: ArrowsRightLeftIcon },
    fetch: { label: 'Fetch', icon: ArrowsRightLeftIcon },
  };

  const item = mapping[key] ?? { label: type ?? 'Request', icon: GlobeAltIcon };
  const Icon = item.icon;
  const label = `Request resource type: ${item.label}`;

  return (
    <Tooltip label={label}>
      <span className="inline-flex items-center text-gray-600">
        <Icon className="h-4 w-4" />
      </span>
    </Tooltip>
  );
}

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
            className="pointer-events-none fixed z-[1000] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-700 shadow-sm"
            style={{ left: pos.left, top: pos.top - 8 }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

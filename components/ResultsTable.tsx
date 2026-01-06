'use client';

import { Finding, HarRequest } from '@/types';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronDownIcon,
  CheckIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { useEffect, useMemo, useRef, useState } from 'react';

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

/* ======================
   Helpers
   ====================== */

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toISOString().substring(11, 23); // HH:mm:ss.ms
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

function sizeLabel(bytes?: number) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
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
  const [openDropdown, setOpenDropdown] = useState<'method' | 'status' | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Close dropdown on outside click ---------- */
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
        const delta = ms(a.duration) - ms(b.duration);
        return sortDir === 'asc' ? delta : -delta;
      });
  }, [requests, selectedMethods, selectedStatusClasses, urlQuery, sortDir]);

  /* ---------- STEP 2: auto-select first visible request ---------- */
  useEffect(() => {
    if (!onSelectRequest) return;

    if (!selectedRequestId && filtered.length > 0) {
      onSelectRequest(filtered[0].id);
    }
  }, [filtered, selectedRequestId, onSelectRequest]);

  /* ---------- STEP 2: keyboard navigation ---------- */
  useEffect(() => {
    if (!onSelectRequest || filtered.length === 0) return;

      const handler = (e: KeyboardEvent) => {
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
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 text-sm" ref={dropdownRef}>
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

        {/* Sort */}
        <button
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          Duration
          {sortDir === 'asc' ? (
            <BarsArrowUpIcon className="h-4 w-4" />
          ) : (
            <BarsArrowDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[120px_1fr_200px] px-3 text-xs text-gray-500 uppercase tracking-wide">
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          Time
        </div>
        <div>Request</div>
        <div className="text-right">Timing</div>
      </div>

      {/* Rows */}
      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y">
        {filtered.map((req) => {
          const findings = findingsByRequestId[req.id] ?? [];
          const selected = selectedRequestId === req.id;
          const durationMs = ms(req.duration);

          return (
            <div
              key={req.id}
              onClick={() => onSelectRequest?.(req.id)}
              className={`grid grid-cols-[120px_1fr_200px] items-center px-3 py-3 cursor-pointer hover:bg-gray-50 ${
                selected ? 'bg-blue-50 ring-1 ring-blue-200' : ''
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
                  <span className={statusColor(req.status)}>
                    {req.status}
                  </span>
                  <span>{req.resourceType ?? 'request'}</span>
                  <span>
                    {sizeLabel(req.requestSize)} → {sizeLabel(req.responseSize)}
                  </span>

                  {findings.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {findings.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${durationBarColor(durationMs)}`}
                    style={{ width: '60%' }}
                  />
                </div>
                <div className="text-xs text-gray-600 w-14 text-right">
                  {durationMs} ms
                </div>
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

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full bg-gray-50">
      <span>{label}</span>
      <button onClick={onRemove} className="text-gray-500 hover:text-gray-900">
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

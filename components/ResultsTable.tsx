'use client';

import { Finding, HarRequest } from '@/types';
import {
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ResultsTableProps {
  requests: HarRequest[];
  findingsByRequestId?: Record<string, Finding[]>;
  selectedRequestId?: string | null;
  onSelectRequest?: (id: string | null) => void;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';

export default function ResultsTable({
  requests,
  findingsByRequestId = {},
  selectedRequestId = null,
  onSelectRequest,
}: ResultsTableProps) {
  const [selectedMethods, setSelectedMethods] = useState<Set<HttpMethod>>(new Set());
  const [selectedStatusClasses, setSelectedStatusClasses] =
    useState<Set<StatusClass>>(new Set());
  const [groupByUrl, setGroupByUrl] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openDropdown, setOpenDropdown] =
    useState<'method' | 'status' | null>(null);
  const [urlQuery, setUrlQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  const statusToClass = (status: number): StatusClass => {
    if (status >= 500) return '5xx';
    if (status >= 400) return '4xx';
    if (status >= 300) return '3xx';
    return '2xx';
  };

  const statusColor = (status: number) => {
    if (status >= 500) return 'text-red-600';
    if (status >= 400) return 'text-amber-600';
    if (status >= 300) return 'text-blue-600';
    return 'text-gray-800';
  };

  const durationColor = (ms: number) => {
    if (ms > 1500) return 'text-red-600';
    if (ms > 500) return 'text-amber-600';
    return 'text-gray-800';
  };

  const sizeColor = (bytes?: number) => {
    if (!bytes) return 'text-gray-400';
    if (bytes > 1_000_000) return 'text-red-600';
    if (bytes > 300_000) return 'text-amber-600';
    return 'text-gray-800';
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
        const delta = a.duration - b.duration;
        return sortDir === 'asc' ? delta : -delta;
      });
  }, [
    requests,
    selectedMethods,
    selectedStatusClasses,
    sortDir,
    urlQuery,
  ]);

  const grouped = useMemo(() => {
    if (!groupByUrl) return { All: filtered };

    return filtered.reduce<Record<string, HarRequest[]>>((acc, req) => {
      acc[req.url] = acc[req.url] || [];
      acc[req.url].push(req);
      return acc;
    }, {});
  }, [filtered, groupByUrl]);

  if (!requests.length) return null;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm" ref={dropdownRef}>
          {/* URL search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter URL"
              value={urlQuery}
              onChange={(e) => setUrlQuery(e.target.value)}
              className="pl-8 pr-2 py-1.5 w-48 border border-gray-200 rounded-md text-sm focus:outline-none"
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

        {/* Group toggle */}
        <button
          onClick={() => setGroupByUrl((v) => !v)}
          className="flex items-center gap-3 text-sm"
        >
          <span className="text-gray-600">Group by URL</span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              groupByUrl ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                groupByUrl ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Filter chips */}
      {(selectedMethods.size > 0 ||
        selectedStatusClasses.size > 0 ||
        urlQuery) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {urlQuery && (
            <FilterChip
              label={`URL: ${urlQuery}`}
              onRemove={() => setUrlQuery('')}
            />
          )}
          {[...selectedMethods].map((m) => (
            <FilterChip
              key={m}
              label={`Method: ${m}`}
              onRemove={() =>
                setSelectedMethods((s) => toggleSetValue(s, m))
              }
            />
          ))}
          {[...selectedStatusClasses].map((s) => (
            <FilterChip
              key={s}
              label={`Status: ${s}`}
              onRemove={() =>
                setSelectedStatusClasses((c) => toggleSetValue(c, s))
              }
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2 text-right">Size</th>
              <th
                className="px-3 py-2 text-right cursor-pointer"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              >
                <span className="inline-flex items-center gap-1">
                  Duration
                  {sortDir === 'asc' ? (
                    <BarsArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <BarsArrowDownIcon className="h-4 w-4" />
                  )}
                </span>
              </th>
              <th className="px-3 py-2 text-center">⚠</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(grouped).map(([groupKey, group]) => (
              <FragmentGroup
                key={groupKey}
                groupKey={groupKey}
                group={group}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                selectedRequestId={selectedRequestId}
                onSelectRequest={onSelectRequest}
                findingsByRequestId={findingsByRequestId}
                statusColor={statusColor}
                durationColor={durationColor}
                sizeColor={sizeColor}
              />
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No requests match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Group renderer ---------- */

function FragmentGroup({
  groupKey,
  group,
  expandedGroups,
  setExpandedGroups,
  selectedRequestId,
  onSelectRequest,
  findingsByRequestId,
  statusColor,
  durationColor,
  sizeColor,
}: any) {
  const isGrouped = group.length > 1;
  const expanded = expandedGroups.has(groupKey);

  const toggle = () => {
    const next = new Set(expandedGroups);
    next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
    setExpandedGroups(next);
  };

  return (
    <>
      {isGrouped && (
        <tr className="bg-gray-50 text-xs text-gray-600">
          <td colSpan={6} className="px-3 py-2 cursor-pointer" onClick={toggle}>
            {expanded ? '▼' : '▶'} {groupKey} ({group.length})
          </td>
        </tr>
      )}

      {(expanded || !isGrouped) &&
        group.map((req: HarRequest) => {
          const findings = findingsByRequestId[req.id] ?? [];
          const selected = selectedRequestId === req.id;

          return (
            <tr
              key={req.id}
              onClick={() => onSelectRequest?.(req.id)}
              className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selected ? 'bg-blue-50' : ''
              }`}
            >
              <td className={`px-3 py-2 ${statusColor(req.status)}`}>
                {req.status}
              </td>
              <td className="px-3 py-2 font-mono">{req.method}</td>
              <td className="px-3 py-2 truncate max-w-[420px]">
                {req.url}
              </td>
              <td
                className={`px-3 py-2 text-right ${sizeColor(
                  req.responseSize,
                )}`}
              >
                {req.responseSize
                  ? `${Math.round(req.responseSize / 1024)} KB`
                  : '—'}
              </td>
              <td
                className={`px-3 py-2 text-right ${durationColor(
                  req.duration,
                )}`}
              >
                {req.duration} ms
              </td>
              <td className="px-3 py-2 text-center">
                {findings.length > 0 && (
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                )}
              </td>
            </tr>
          );
        })}
    </>
  );
}

/* ---------- Small helpers ---------- */

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
      {active && <CheckIcon className="h-4 w-4 text-gray-700" />}
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
      <button
        onClick={onRemove}
        className="hover:text-gray-900 text-gray-500"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

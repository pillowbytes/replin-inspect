'use client';

import {
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import { useEffect, useRef, useState } from 'react';
import { getMethodStyle, getStatusStyle, getStatusText } from '@/lib/utils/filterStyles';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';

interface FiltersPanelProps {
  selectedMethods: Set<HttpMethod>;
  setSelectedMethods: (next: Set<HttpMethod>) => void;
  selectedStatusClasses: Set<StatusClass>;
  setSelectedStatusClasses: (next: Set<StatusClass>) => void;
  urlQuery: string;
  setUrlQuery: (next: string) => void;
}

export default function FiltersPanel({
  selectedMethods,
  setSelectedMethods,
  selectedStatusClasses,
  setSelectedStatusClasses,
  urlQuery,
  setUrlQuery,
}: FiltersPanelProps) {
  const [openDropdown, setOpenDropdown] = useState<'method' | 'status' | null>(
    null
  );
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

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white" ref={dropdownRef}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Filters
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={urlQuery}
            onChange={(e) => setUrlQuery(e.target.value)}
            placeholder="Filter URL"
            className="pl-8 pr-2 py-1.5 w-full border border-gray-200 rounded-md"
          />
        </div>

        <div className="flex items-center gap-2">
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
                  variant="method"
                  value={m}
                  onClick={() =>
                    setSelectedMethods(toggleSetValue(selectedMethods, m))
                  }
                >
                  {m}
                </DropdownOption>
              )
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
                variant="status"
                value={s}
                onClick={() =>
                  setSelectedStatusClasses(toggleSetValue(selectedStatusClasses, s))
                }
              >
                {s}
              </DropdownOption>
            ))}
          </Dropdown>
        </div>
        {(selectedMethods.size > 0 ||
          selectedStatusClasses.size > 0 ||
          urlQuery.trim() !== '') && (
          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from(selectedMethods).map((m) => (
              <FilterChip
                key={`method:${m}`}
                label={m}
                variant="method"
                value={m}
                onRemove={() => {
                  const next = new Set(selectedMethods);
                  next.delete(m);
                  setSelectedMethods(next);
                }}
              />
            ))}
            {Array.from(selectedStatusClasses).map((s) => (
              <FilterChip
                key={`status:${s}`}
                label={s}
                variant="status"
                value={s}
                onRemove={() => {
                  const next = new Set(selectedStatusClasses);
                  next.delete(s);
                  setSelectedStatusClasses(next);
                }}
              />
            ))}
            {urlQuery.trim() !== '' && (
              <FilterChip
                key="url"
                label={`URL: ${urlQuery}`}
                variant="url"
                onRemove={() => setUrlQuery('')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-md hover:text-gray-900 text-xs"
      >
        {label}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-36 bg-white border border-gray-200 rounded-md">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownOption({
  children,
  active,
  variant,
  value,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  variant: 'method' | 'status';
  value: string;
  onClick: () => void;
}) {
  const activeStyle =
    variant === 'method'
      ? getMethodStyle(value).text
      : getStatusText(value);
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
    >
      <span className={active ? activeStyle : ''}>{children}</span>
      {active && <CheckIcon className="h-4 w-4" />}
    </div>
  );
}

function FilterChip({
  label,
  variant,
  value,
  onRemove,
}: {
  label: string;
  variant: 'method' | 'status' | 'url';
  value?: string;
  onRemove: () => void;
}) {
  const styles =
    variant === 'method'
      ? getMethodStyle(value ?? '')
      : variant === 'status'
      ? getStatusStyle(value ?? '')
      : { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' };

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${styles.border} ${styles.bg} ${styles.text}`}
    >
      <span className="truncate max-w-[150px] font-semibold">{label}</span>
      <button onClick={onRemove} className="text-current/70 hover:text-current">
        ×
      </button>
    </div>
  );
}

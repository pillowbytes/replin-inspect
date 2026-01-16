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
    <div
      className="border border-utility-border bg-utility-main p-3"
      ref={dropdownRef}
    >
      <div className="utility-label">Filters</div>
      <div className="mt-3 space-y-3 text-[13px]">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-utility-muted" />
          <input
            value={urlQuery}
            onChange={(e) => setUrlQuery(e.target.value)}
            placeholder="Filter URL"
            className="pl-8 pr-2 h-8 w-full border border-utility-border rounded-[4px] bg-utility-main text-utility-text placeholder:text-utility-muted"
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
        className="flex items-center gap-1 h-8 px-3 border border-utility-border rounded-[4px] text-[13px] text-utility-text bg-utility-main hover:bg-utility-sidebar"
      >
        {label}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-36 bg-utility-main border border-utility-border">
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
      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-utility-sidebar text-[13px] text-utility-text"
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
      : {
          border: 'border-emerald-200 dark:border-emerald-400/40',
          bg: 'bg-emerald-50 dark:bg-emerald-400/10',
          text: 'text-emerald-700 dark:text-emerald-200',
        };

  return (
    <div
      className={`flex items-center gap-1 rounded-[4px] border px-2 py-1 text-[11px] font-bold ${styles.border} ${styles.bg} ${styles.text} ${
        variant === 'url' ? 'normal-case' : 'uppercase tracking-wide'
      }`}
    >
      <span className="truncate max-w-[150px]">{label}</span>
      <button onClick={onRemove} className="text-current/70 hover:text-current">
        ×
      </button>
    </div>
  );
}

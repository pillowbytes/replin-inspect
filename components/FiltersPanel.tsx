'use client';

import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { getMethodStyle, getStatusStyle, getStatusText } from '@/lib/utils/filterStyles';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';
type ResourceTypeKey = 'fetch-xhr' | 'js' | 'css' | 'websocket';

interface FiltersPanelProps {
  selectedMethods: Set<HttpMethod>;
  setSelectedMethods: (next: Set<HttpMethod>) => void;
  selectedStatusClasses: Set<StatusClass>;
  setSelectedStatusClasses: (next: Set<StatusClass>) => void;
  selectedResourceTypes: Set<ResourceTypeKey>;
  setSelectedResourceTypes: (next: Set<ResourceTypeKey>) => void;
}

export default function FiltersPanel({
  selectedMethods,
  setSelectedMethods,
  selectedStatusClasses,
  setSelectedStatusClasses,
  selectedResourceTypes,
  setSelectedResourceTypes,
}: FiltersPanelProps) {
  const toggleSetValue = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  };

  return (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-2">
        <div className="utility-label">Resource types</div>
        <div className="space-y-1">
          {([
            { key: 'fetch-xhr', label: 'Fetch/XHR' },
            { key: 'js', label: 'JS Assets' },
            { key: 'css', label: 'Stylesheets' },
            { key: 'websocket', label: 'WebSockets' },
          ] as { key: ResourceTypeKey; label: string }[]).map((item) => {
            const active = selectedResourceTypes.has(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setSelectedResourceTypes(
                    toggleSetValue(selectedResourceTypes, item.key)
                  )
                }
                className="flex items-center gap-2 text-utility-text py-0.5"
              >
                <span
                  className={`h-3 w-3 border border-utility-border flex items-center justify-center ${
                    active ? 'bg-utility-accent' : 'bg-transparent'
                  }`}
                >
                  {active && <CheckIcon className="h-3 w-3 text-white" />}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="utility-label">Network filters</div>
        <div className="flex flex-wrap gap-2">
          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(
            (m) => {
              const active = selectedMethods.has(m);
              const style = getMethodStyle(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setSelectedMethods(toggleSetValue(selectedMethods, m))
                  }
                  className={`inline-flex items-center gap-1 h-7 px-2 border rounded-[2px] text-[12px] uppercase ${
                    active
                      ? `${style.border} ${style.text} bg-utility-selection`
                      : 'border-utility-border text-utility-muted bg-transparent'
                  }`}
                >
                  <span>{m}</span>
                  {active && <XMarkIcon className="h-3 w-3" />}
                </button>
              );
            }
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['2xx', '3xx', '4xx', '5xx'] as StatusClass[]).map((s) => {
            const active = selectedStatusClasses.has(s);
            const style = getStatusStyle(s);
            const statusText = getStatusText(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSelectedStatusClasses(
                    toggleSetValue(selectedStatusClasses, s)
                  )
                }
                className={`inline-flex items-center gap-1 h-7 px-2 border rounded-[2px] text-[12px] uppercase ${
                  active
                    ? `${style.border} ${statusText} bg-utility-selection`
                    : 'border-utility-border text-utility-muted bg-transparent'
                }`}
              >
                <span>{s}</span>
                {active && <XMarkIcon className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

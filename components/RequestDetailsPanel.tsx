'use client';

import { Finding, HarRequest, HarTimings } from '@/types';
import { getMethodStyle, getStatusText } from '@/lib/utils/filterStyles';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ======================
   Types
   ====================== */

type Tab = 'overview' | 'request' | 'response' | 'timing';

interface RequestDetailsPanelProps {
  request: HarRequest;
  findings?: Finding[];
}

/* ======================
   Component
   ====================== */

export default function RequestDetailsPanel({
  request,
  findings = [],
}: RequestDetailsPanelProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [isAtTop, setIsAtTop] = useState(true);
  const [topBump, setTopBump] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bumpTimerRef = useRef<number | null>(null);
  const requestFindings = useMemo(() => findings ?? [], [findings]);
  const findingsByContext = useMemo(
    () => ({
      request: requestFindings.filter((f) => f.context === 'request'),
      response: requestFindings.filter((f) => f.context === 'response'),
      timing: requestFindings.filter((f) => f.context === 'timing'),
    }),
    [requestFindings],
  );
  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview', icon: InformationCircleIcon },
      { id: 'request' as const, label: 'Request', icon: DocumentTextIcon },
      { id: 'response' as const, label: 'Response', icon: ArrowDownTrayIcon },
      { id: 'timing' as const, label: 'Timing', icon: ClockIcon },
    ],
    [],
  );
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <div className="h-full flex border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex-1 min-w-0 flex flex-col">
        <div
          className={`h-10 px-4 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center ${
            isAtTop ? '' : 'shadow-sm'
          } ${topBump ? '-translate-y-0.5 scale-y-105' : ''} origin-top transition-transform`}
        >
          {activeTab.label}
        </div>

        {/* Content */}
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
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6 text-sm"
        >
          {tab === 'overview' && (
            <OverviewTab request={request} findings={requestFindings} />
          )}
          {tab === 'request' && (
            <RequestTab request={request} findings={findingsByContext.request} />
          )}
          {tab === 'response' && (
            <ResponseTab request={request} findings={findingsByContext.response} />
          )}
          {tab === 'timing' && (
            <TimingTab request={request} findings={findingsByContext.timing} />
          )}
        </div>
      </div>

      <div className="flex w-10 flex-col items-center gap-2 border-l border-gray-200 bg-gray-50/60 pt-1 pb-3">
        {tabs.map((item) => (
          <TabRailButton
            key={item.id}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
            icon={item.icon}
            label={item.label}
            side="right"
          />
        ))}
      </div>
    </div>
  );
}

/* ======================
   Overview
   ====================== */

function OverviewTab({
  request,
  findings,
}: {
  request: HarRequest;
  findings: Finding[];
}) {
  return (
    <Section title="Request summary">
      <FindingsBlock title="Findings summary" findings={findings} showSummary />
      <KeyValue
        label="Method"
        value={request.method}
        className={getMethodStyle(request.method).text}
      />
      <KeyValue
        label="Status"
        value={request.status}
        className={
          request.status < 200
            ? 'text-gray-900'
            : getStatusText(statusToClass(request.status))
        }
      />
      <KeyValue label="Domain" value={request.domain ?? '—'} />
      <KeyValue label="Path" value={request.path ?? '—'} wrap />
      <KeyValue label="Duration" value={`${Math.round(request.duration)} ms`} />
      <KeyValue label="Request total size" value={formatBytes(request.sizes?.requestTotal)} />
      <KeyValue label="Response total size" value={formatBytes(request.sizes?.responseTotal)} />
    </Section>
  );
}

/* ======================
   Request tab
   ====================== */

function RequestTab({
  request,
  findings,
}: {
  request: HarRequest;
  findings: Finding[];
}) {
  return (
    <>
      <FindingsBlock title="Request findings" findings={findings} />
      <Section title="Request">
        <KeyValue
          label="Method"
          value={request.method}
          className={getMethodStyle(request.method).text}
        />
        <KeyValue label="Path" value={request.path ?? '—'} wrap />
      </Section>

      <KeyValueList
        title="Query parameters"
        data={request.requestQuery}
      />

      <BodySection
        title="Request body"
        mimeType={request.requestBody?.mimeType}
        size={request.sizes?.requestBody}
        body={request.requestBody?.text}
      />

      <HeadersTab title="Request headers" headers={request.headers} />
    </>
  );
}

/* ======================
   Response tab
   ====================== */

function ResponseTab({
  request,
  findings,
}: {
  request: HarRequest;
  findings: Finding[];
}) {
  return (
    <>
      <FindingsBlock title="Response findings" findings={findings} />
      <Section title="Response">
        <KeyValue
          label="Status"
          value={`${request.status} ${request.statusText ?? ''}`}
          className={
            request.status < 200
              ? 'text-gray-900'
              : getStatusText(statusToClass(request.status))
          }
        />
        <KeyValue label="From cache" value={request.fromCache ? 'Yes' : 'No'} />
        <KeyValue label="Server IP" value={request.serverIp ?? '—'} />
      </Section>

      <BodySection
        title="Response body"
        mimeType={request.responseBody?.mimeType}
        encoding={request.responseBody?.encoding}
        size={request.sizes?.responseBody}
        body={request.responseBody?.text}
      />

      <HeadersTab title="Response headers" headers={request.responseHeaders} />
    </>
  );
}

/* ======================
   Body section
   ====================== */

function BodySection({
  title,
  mimeType,
  encoding,
  size,
  body,
}: {
  title: string;
  mimeType?: string;
  encoding?: string;
  size?: number;
  body?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!body) {
    return (
      <Section title={title}>
        <EmptyState text="No body available." />
      </Section>
    );
  }

  return (
    <Section title={title}>
      <KeyValue label="MIME type" value={mimeType ?? '—'} />
      {encoding && <KeyValue label="Encoding" value={encoding} />}
      <KeyValue label="Size" value={formatBytes(size)} />

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
      >
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        View body
      </button>

      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs font-mono text-gray-800">
          {body}
        </pre>
      )}
    </Section>
  );
}

/* ======================
   Headers
   ====================== */

const IMPORTANT_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'cache-control',
  'user-agent',
  'origin',
];

function HeadersTab({
  title,
  headers,
}: {
  title: string;
  headers: Record<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);

  const important = Object.entries(headers).filter(([k]) =>
    IMPORTANT_HEADERS.includes(k),
  );
  const rest = Object.entries(headers).filter(
    ([k]) => !IMPORTANT_HEADERS.includes(k),
  );

  return (
    <Section title={title}>
      {important.map(([k, v]) => (
        <KeyValue key={k} label={k} value={v} wrap mono />
      ))}

      {rest.length > 0 && (
        <>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            All headers ({rest.length})
          </button>

          {showAll &&
            rest.map(([k, v]) => (
              <KeyValue key={k} label={k} value={v} wrap mono />
            ))}
        </>
      )}
    </Section>
  );
}

/* ======================
   Timing
   ====================== */

const TIMING_COLORS: Record<keyof HarTimings, string> = {
  blocked: 'bg-gray-400',
  dns: 'bg-purple-500',
  connect: 'bg-blue-500',
  ssl: 'bg-indigo-500',
  send: 'bg-slate-500',
  wait: 'bg-amber-500',
  receive: 'bg-emerald-500',
};

const MIN_BAR_MS = 2;

function TimingTab({
  request,
  findings,
}: {
  request: HarRequest;
  findings: Finding[];
}) {
  const items = useMemo(() => normalizeTimings(request.timings), [request.timings]);
  const total = items.reduce((s, t) => s + t.value, 0);

  if (!items.length || total === 0) {
    return (
      <Section title="Timing breakdown">
        <FindingsBlock title="Timing findings" findings={findings} />
        <EmptyState text="No timing data available." />
      </Section>
    );
  }

  const barItems = items.filter((t) => t.value >= MIN_BAR_MS);

  return (
    <Section title="Timing breakdown">
      <FindingsBlock title="Timing findings" findings={findings} />
      <div className="h-3 w-full rounded-full overflow-hidden bg-gray-100 flex">
        {barItems.map((t) => (
          <div
            key={t.key}
            className={TIMING_COLORS[t.key]}
            style={{ width: `${(t.value / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${TIMING_COLORS[t.key]}`} />
              <span className="capitalize">{t.key}</span>
            </div>
            <span className="tabular-nums text-gray-700">{t.value} ms</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ======================
   Shared UI
   ====================== */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  wrap,
  mono,
  className,
}: {
  label: string;
  value: string | number;
  wrap?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-sm text-gray-900 ${wrap ? 'break-all' : ''} ${
          mono ? 'font-mono' : ''
        } ${className ?? ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function FindingsBlock({
  title,
  findings,
  showSummary = false,
}: {
  title: string;
  findings: Finding[];
  showSummary?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!findings.length) return null;

  const sorted = sortFindings(findings);
  const important = sorted.filter((f) => f.severity !== 'info');
  const info = sorted.filter((f) => f.severity === 'info');
  const visible = showAll ? sorted : important;

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  return (
    <Section title={title}>
      {showSummary && (
        <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500">
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="font-semibold text-gray-900">
              {counts.critical}
            </span>{' '}
            Critical
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="font-semibold text-gray-900">
              {counts.warning}
            </span>{' '}
            Warnings
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1">
            <span className="font-semibold text-gray-900">
              {counts.info}
            </span>{' '}
            Info
          </div>
        </div>
      )}

      {visible.length === 0 && info.length > 0 && (
        <div className="text-xs text-gray-500">
          No critical or warning findings for this section.
        </div>
      )}

      <div className="space-y-2">
        {visible.map((f, i) => (
          <div
            key={`${f.type}-${i}`}
            className="border border-gray-200 rounded-md p-3 bg-white"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${severityStyles(f.severity)}`}
              >
                {f.severity}
              </span>
              {f.confidence && (
                <span className="text-gray-400">
                  Confidence: {f.confidence}
                </span>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-900">{f.description}</div>
            <div className="mt-1 text-xs text-gray-600">
              {f.suggestedAction}
            </div>
          </div>
        ))}
      </div>

      {info.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          {showAll
            ? 'Hide info findings'
            : `Show ${info.length} info finding${info.length > 1 ? 's' : ''}`}
        </button>
      )}
    </Section>
  );
}

function KeyValueList({
  title,
  data,
}: {
  title: string;
  data?: Record<string, string>;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Section title={title}>
        <EmptyState text="None" />
      </Section>
    );
  }

  return (
    <Section title={title}>
      {Object.entries(data).map(([k, v]) => (
        <KeyValue key={k} label={k} value={v} wrap mono />
      ))}
    </Section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-gray-500 py-6 text-center">{text}</div>;
}

function TabRailButton({
  active,
  onClick,
  icon: Icon,
  label,
  side = 'left',
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  side?: 'left' | 'right';
}) {
  const button = (
    <button
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-8 w-8 items-center justify-center transition ${
        active
          ? 'text-blue-600'
          : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      <Icon className="h-5 w-5" />
      {active && (
        <span
          className={`absolute top-1/2 h-6 w-1 -translate-y-1/2 bg-blue-600 ${
            side === 'right'
              ? 'left-0 rounded-r-full'
              : 'right-0 rounded-l-full'
          }`}
        />
      )}
    </button>
  );

  return <Tooltip label={label}>{button}</Tooltip>;
}

/* ======================
   Utils
   ====================== */

function normalizeTimings(timings?: HarTimings) {
  if (!timings) return [];
  return Object.entries(timings)
    .map(([key, value]) => ({
      key: key as keyof HarTimings,
      value: value != null && value >= 0 ? Math.round(value) : 0,
    }))
    .filter((t) => t.value > 0);
}

function statusToClass(status: number) {
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  return '2xx';
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
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
      className="inline-flex"
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

function sortFindings(findings: Finding[]) {
  const severityRank: Record<Finding['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const confidenceRank: Record<NonNullable<Finding['confidence']>, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...findings].sort((a, b) => {
    const severityDelta = severityRank[a.severity] - severityRank[b.severity];
    if (severityDelta !== 0) return severityDelta;

    const confA = a.confidence ? confidenceRank[a.confidence] : 3;
    const confB = b.confidence ? confidenceRank[b.confidence] : 3;
    return confA - confB;
  });
}

function severityStyles(severity: Finding['severity']) {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  if (severity === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-gray-200 bg-gray-50 text-gray-600';
}

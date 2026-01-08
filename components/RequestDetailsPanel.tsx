'use client';

import { Finding, HarRequest, HarTimings } from '@/types';
import { getMethodStyle, getStatusText } from '@/lib/utils/filterStyles';
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/20/solid';
import { useMemo, useRef, useState } from 'react';

/* ======================
   Types
   ====================== */

type Tab = 'overview' | 'request' | 'response' | 'timing' | 'analysis';

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

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Tabs */}
      <div
        className={`flex border-b border-gray-200 text-sm ${
          isAtTop ? '' : 'shadow-sm'
        } ${topBump ? '-translate-y-0.5 scale-y-105' : ''} origin-top transition-transform`}
      >
        <TabButton icon={InformationCircleIcon} label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
        <TabButton icon={DocumentTextIcon} label="Request" active={tab === 'request'} onClick={() => setTab('request')} />
        <TabButton icon={ArrowDownTrayIcon} label="Response" active={tab === 'response'} onClick={() => setTab('response')} />
        <TabButton icon={ClockIcon} label="Timing" active={tab === 'timing'} onClick={() => setTab('timing')} />
        <TabButton icon={BeakerIcon} label="Analysis" active={tab === 'analysis'} onClick={() => setTab('analysis')} />
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
        {tab === 'overview' && <OverviewTab request={request} />}
        {tab === 'request' && <RequestTab request={request} />}
        {tab === 'response' && <ResponseTab request={request} />}
        {tab === 'timing' && <TimingTab request={request} />}
        {tab === 'analysis' && <AnalysisTab findings={findings} />}
      </div>
    </div>
  );
}

/* ======================
   Overview
   ====================== */

function OverviewTab({ request }: { request: HarRequest }) {
  return (
    <Section title="Request summary">
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

function RequestTab({ request }: { request: HarRequest }) {
  return (
    <>
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

function ResponseTab({ request }: { request: HarRequest }) {
  return (
    <>
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

function TimingTab({ request }: { request: HarRequest }) {
  const items = useMemo(() => normalizeTimings(request.timings), [request.timings]);
  const total = items.reduce((s, t) => s + t.value, 0);

  if (!items.length || total === 0) {
    return <EmptyState text="No timing data available." />;
  }

  const barItems = items.filter((t) => t.value >= MIN_BAR_MS);

  return (
    <Section title="Timing breakdown">
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
   Analysis
   ====================== */

function AnalysisTab({ findings }: { findings: Finding[] }) {
  if (!findings.length) {
    return <EmptyState text="No findings for this request." />;
  }

  return (
    <Section title="Findings">
      {findings.map((f, i) => (
        <div key={i} className="border border-gray-200 rounded-md p-3">
          <div className="font-medium text-gray-900">{f.description}</div>
          <div className="text-xs text-gray-600 mt-1">{f.suggestedAction}</div>
        </div>
      ))}
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

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-2 border-b-2 ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
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

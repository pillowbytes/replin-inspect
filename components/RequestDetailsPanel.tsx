'use client';

import { Finding, HarRequest, HarTimings } from '@/types';
import { getMethodStyle, getStatusText } from '@/lib/utils/filterStyles';
import { ChevronDownIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import BodyViewer from '@/components/BodyViewer';
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
  const [copyNotice, setCopyNotice] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
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
      { id: 'overview' as const, label: 'Overview' },
      { id: 'request' as const, label: 'Request' },
      { id: 'response' as const, label: 'Response' },
      { id: 'timing' as const, label: 'Timing' },
    ],
    [],
  );

  return (
    <div className="h-full flex flex-col bg-utility-sidebar border-l border-utility-border">
      <div className="sticky top-0 z-10 border-b border-utility-border bg-utility-sidebar">
        <div className="flex items-center h-[32px] px-3 text-[12px] font-bold">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`h-[32px] px-3 border-b-2 ${
                tab === item.id
                  ? 'border-utility-accent text-utility-text'
                  : 'border-transparent text-utility-muted hover:text-utility-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-5 text-[13px] text-utility-text thin-scrollbar"
      >
        {tab === 'overview' && (
        <OverviewTab
          request={request}
          findings={requestFindings}
          copyNotice={copyNotice}
          onCopy={() => {
            navigator.clipboard.writeText(request.url).then(() => {
              setCopyNotice(true);
              window.setTimeout(() => setCopyNotice(false), 1600);
            });
          }}
        />
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
  );
}

/* ======================
   Overview
   ====================== */

function OverviewTab({
  request,
  findings,
  copyNotice,
  onCopy,
}: {
  request: HarRequest;
  findings: Finding[];
  copyNotice: boolean;
  onCopy: () => void;
}) {
  const alertFindings = findings.filter((f) => f.severity !== 'info');
  const referrerPolicy =
    request.responseHeaders?.['referrer-policy'] ??
    request.headers?.['referrer-policy'] ??
    '—';
  const streamId =
    request.responseHeaders?.['x-stream-id'] ??
    request.headers?.['x-stream-id'] ??
    '—';
  const wireProtocol =
    request.protocol ??
    request.responseHeaders?.['x-protocol'] ??
    request.headers?.['x-protocol'] ??
    '—';

  return (
    <div className="space-y-5">
      {alertFindings.length > 0 && (
        <div className="space-y-2">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-utility-text">
            Diagnostic alert
          </div>
          <FindingsBlock findings={alertFindings} />
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-utility-text">
          Request context
        </div>
        <SingleColumn>
          <WellField label="Resource URI" value={request.url} />
        </SingleColumn>
        <DenseGrid>
          <KeyValue
            label="Method"
            value={request.method}
            className={`font-method ${getMethodStyle(request.method).text}`}
          />
          <KeyValue
            label="Status"
            value={request.status}
            className={
              request.status < 200
                ? 'text-utility-text'
                : getStatusText(statusToClass(request.status))
            }
          />
          <KeyValue label="Domain" value={request.domain ?? '—'} />
          <KeyValue label="Duration" value={`${Math.round(request.duration)} ms`} />
          <KeyValue label="Request size" value={formatBytes(request.sizes?.requestTotal)} />
          <KeyValue label="Response size" value={formatBytes(request.sizes?.responseTotal)} />
          <KeyValue label="Remote target" value={request.serverIp ?? request.domain ?? '—'} />
          <KeyValue label="Referrer policy" value={referrerPolicy} />
          <KeyValue label="Stream ID" value={streamId} />
          <KeyValue label="Wire protocol" value={wireProtocol} />
        </DenseGrid>
        <div className="flex justify-center">
          <button
            className="utility-button-ghost flex items-center justify-center gap-2 px-5 font-bold"
            onClick={onCopy}
            type="button"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            {copyNotice ? 'Copied' : 'Copy URL'}
          </button>
        </div>
      </div>
    </div>
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
      <FindingsBlock findings={findings} />
      <Section title="Request">
        <DenseGrid>
          <KeyValue
            label="Method"
            value={request.method}
            className={`font-method ${getMethodStyle(request.method).text}`}
          />
          <KeyValue label="Path" value={request.path ?? '—'} wrap />
        </DenseGrid>
      </Section>

      <KeyValueList title="Query parameters" data={request.requestQuery} />

      <BodySection
        title="Request body"
        mimeType={request.requestBody?.mimeType}
        size={request.sizes?.requestBody}
        body={request.requestBody?.text}
        contentType={request.headers?.['content-type']}
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
      <FindingsBlock findings={findings} />
      <Section title="Response">
        <DenseGrid>
          <KeyValue
            label="Status"
            value={`${request.status} ${request.statusText ?? ''}`}
            className={
              request.status < 200
                ? 'text-utility-text'
                : getStatusText(statusToClass(request.status))
            }
          />
          <KeyValue label="From cache" value={request.fromCache ? 'Yes' : 'No'} />
          <KeyValue label="Server IP" value={request.serverIp ?? '—'} />
        </DenseGrid>
      </Section>

      <BodySection
        title="Response body"
        mimeType={request.responseBody?.mimeType}
        encoding={request.responseBody?.encoding}
        size={request.sizes?.responseBody}
        body={request.responseBody?.text}
        contentType={request.responseHeaders?.['content-type']}
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
  contentType,
}: {
  title: string;
  mimeType?: string;
  encoding?: string;
  size?: number;
  body?: string;
  contentType?: string;
}) {
  if (!body) {
    return (
      <Section title={title}>
        <EmptyState text="No content available" />
      </Section>
    );
  }

  return (
    <Section title={title}>
      <DenseGrid>
        <KeyValue label="MIME type" value={mimeType ?? '—'} />
        {encoding && <KeyValue label="Encoding" value={encoding} />}
        <KeyValue label="Size" value={formatBytes(size)} />
      </DenseGrid>

      <BodyViewer body={body} mimeType={mimeType} contentType={contentType} />
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
    <Section title={title} divider>
      <CodeWell>
        {important.map(([k, v]) => (
          <HeaderRow key={k} label={k} value={v} />
        ))}
      </CodeWell>

      {rest.length > 0 && (
        <>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-[13px] text-utility-muted hover:text-utility-text"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            All headers ({rest.length})
          </button>

          {showAll && (
            <CodeWell>
              {rest.map(([k, v]) => (
                <HeaderRow key={k} label={k} value={v} />
              ))}
            </CodeWell>
          )}
        </>
      )}
    </Section>
  );
}

/* ======================
   Timing
   ====================== */

const TIMING_COLORS: Record<keyof HarTimings, string> = {
  blocked: 'bg-utility-muted',
  dns: 'bg-utility-dns',
  connect: 'bg-utility-warning',
  ssl: 'bg-utility-muted',
  send: 'bg-utility-muted',
  wait: 'bg-utility-waiting',
  receive: 'bg-utility-receiving',
};

const MIN_BAR_MS = 1;

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
        <FindingsBlock findings={findings} />
        <EmptyState text="No timing data available." />
      </Section>
    );
  }

  const barItems = items.filter((t) => t.value >= MIN_BAR_MS);

  return (
    <Section title="Timing breakdown">
      <FindingsBlock findings={findings} />
      <div className="h-2.5 w-full overflow-hidden bg-utility-border flex">
        {barItems.map((t) => {
          const label = `${t.key} (${t.value} ms)`;
          return (
            <Tooltip
              key={t.key}
              label={label}
              className={`block h-full ${TIMING_COLORS[t.key]}`}
              style={{ width: `${(t.value / total) * 100}%` }}
            >
              <span className="sr-only">{label}</span>
            </Tooltip>
          );
        })}
      </div>

      <div className="space-y-2 text-[13px]">
        {items.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 ${TIMING_COLORS[t.key]}`} />
              <span className="capitalize">{t.key}</span>
            </div>
            <span className="tabular-nums font-mono text-utility-text">{t.value} ms</span>
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
  divider = false,
}: {
  title: string;
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={`space-y-2 ${divider ? 'border-t border-utility-border pt-2' : ''}`}>
      <div className="utility-label">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DenseGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function SingleColumn({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-2 text-[12px] font-mono">
      <span className="text-utility-muted">{label}:</span>
      <span className="text-utility-code-text break-all">{value}</span>
    </div>
  );
}

function KeyValue({
  label,
  value,
  wrap,
  mono = true,
  className,
}: {
  label: string;
  value: string | number;
  wrap?: boolean;
  mono?: boolean;
  className?: string;
}) {
  const shouldWrap = wrap !== undefined ? wrap : true;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-utility-muted">{label}</div>
      <div
        className={`text-[13px] text-utility-text ${
          shouldWrap ? 'break-words whitespace-normal' : ''
        } ${
          mono ? 'font-mono' : ''
        } ${className ?? ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function WellField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-wide text-utility-muted">
        {label}
      </div>
      <CodeWell>
        <div className="text-[12px] font-mono text-utility-code-text break-all">
          {value}
        </div>
      </CodeWell>
    </div>
  );
}

function FindingsBlock({
  findings,
  showSummary = false,
}: {
  findings: Finding[];
  showSummary?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!findings.length) return null;

  const sorted = sortFindings(findings);
  const important = sorted.filter((f) => f.severity !== 'info');
  const info = sorted.filter((f) => f.severity === 'info');
  const visible = showAll ? sorted : important;
  const dominantSeverity = highestSeverity(findings);

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  return (
    <div className="space-y-3">
      {showSummary && sorted[0] && (
        <div
          className={`relative border border-utility-border px-3 py-2 pl-3 ${
            sorted[0].severity === 'critical'
              ? 'bg-[#FEF2F2] dark:bg-utility-alert'
              : sorted[0].severity === 'warning'
              ? 'bg-[#FFFBEB] dark:bg-utility-alert'
              : 'bg-utility-alert'
          }`}
        >
          <span
            className={`absolute left-0 top-0 h-full w-[3px] ${
              sorted[0].severity === 'critical'
                ? 'bg-[#EF4444]'
                : sorted[0].severity === 'warning'
                ? 'bg-[#F59E0B]'
                : 'bg-utility-border'
            }`}
          />
          <div
            className={`text-[13px] font-bold ${
              sorted[0].severity === 'critical'
                ? 'text-[#EF4444]'
                : sorted[0].severity === 'warning'
                ? 'text-[#F59E0B]'
                : 'text-utility-text'
            }`}
          >
            {formatFindingText(sorted[0].description)}
          </div>
          {sorted[0].suggestedAction && (
            <div className="text-[12px] text-utility-muted">
              {formatFindingText(sorted[0].suggestedAction)}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 && info.length > 0 && (
        <div className="text-[13px] text-utility-muted">
          No critical or warning findings for this section.
        </div>
      )}

      <div className="space-y-2">
        {visible.map((f, i) => (
          <div
            key={`${f.type}-${i}`}
            className="relative border-b border-utility-border py-2 pl-3"
          >
            <span
              className={`signal-bar ${
                f.severity === 'critical'
                  ? 'bg-utility-error'
                : f.severity === 'warning'
                  ? 'bg-utility-warning'
                  : 'bg-utility-border'
              }`}
            />
            <div className="text-[13px] font-bold break-words">
              <span
                className={
                  f.severity === 'critical'
                    ? 'text-[#EF4444]'
                    : f.severity === 'warning'
                    ? 'text-[#F59E0B]'
                    : 'text-utility-text'
                }
              >
                {formatFindingText(f.description)}
              </span>
            </div>
            {f.suggestedAction && (
              <div className="text-[12px] text-utility-muted">
                {formatFindingText(f.suggestedAction)}
              </div>
            )}
          </div>
        ))}
      </div>

      {info.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-[12px] text-utility-muted hover:text-utility-text"
        >
          {showAll
            ? 'Hide info findings'
            : `Show ${info.length} info finding${info.length > 1 ? 's' : ''}`}
        </button>
      )}
      <div className="sr-only">{dominantSeverity}</div>
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
        <EmptyState text="No content available" />
      </Section>
    );
  }

  return (
    <Section title={title}>
      <CodeWell>
        {Object.entries(data).map(([k, v]) => (
          <HeaderRow key={k} label={k} value={v} />
        ))}
      </CodeWell>
    </Section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wide text-utility-muted py-6 text-center">
      {text}
    </div>
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
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [clampedLeft, setClampedLeft] = useState<number | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
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

  useEffect(() => {
    if (!open || !pos) {
      setClampedLeft(null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const width = tooltipRef.current?.offsetWidth ?? 0;
      if (!width) return;
      const padding = 8;
      const minLeft = padding + width / 2;
      const maxLeft = window.innerWidth - padding - width / 2;
      const nextLeft = Math.min(Math.max(pos.left, minLeft), maxLeft);
      setClampedLeft(nextLeft);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pos]);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className ?? ''}`}
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
            ref={tooltipRef}
            className={`pointer-events-none fixed z-[1000] -translate-x-1/2 whitespace-nowrap rounded-none border border-utility-border bg-[#EFF6FF] dark:bg-utility-sidebar px-2 py-1 text-[11px] font-mono text-utility-muted ${
              placement === 'top' ? '-translate-y-full' : 'translate-y-0'
            }`}
            style={{
              left: clampedLeft ?? pos.left,
              top: placement === 'top' ? pos.top - 8 : pos.top + 8,
            }}
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

function highestSeverity(findings: Finding[]) {
  return findings.reduce((acc, f) => {
    if (acc === 'critical') return acc;
    if (f.severity === 'critical') return 'critical';
    if (acc === 'warning') return acc;
    if (f.severity === 'warning') return 'warning';
    return 'info';
  }, 'info' as Finding['severity']);
}

function formatFindingText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|wss?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (part.match(/^(https?:\/\/|wss?:\/\/)/)) {
      return (
        <span
          key={index}
          className="text-[12px] font-mono text-utility-accent hover:underline break-all"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function CodeWell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-utility-border bg-[#EFF6FF] dark:bg-utility-code p-3 space-y-2 text-utility-code-text">
      {children}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import UploadArea from '@/components/UploadArea';
import TokenInspector from '@/components/TokenInspector';
import ResultsTable from '@/components/ResultsTable';
import RequestDetailsPanel from '@/components/RequestDetailsPanel';
import AnalysisTile from '@/components/AnalysisTile';
import FiltersPanel from '@/components/FiltersPanel';
import FindingsView from '@/components/FindingsView';
import { runAllRules } from '@/lib/rules';
import { HarRequest, TokenInfo, Finding } from '@/types';

// Heroicons
import { Square3Stack3DIcon } from '@heroicons/react/24/solid';
import {
  GlobeAltIcon,
  KeyIcon,
  FolderPlusIcon,
} from '@heroicons/react/20/solid';
import {
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CircleStackIcon,
  NoSymbolIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type AnalysisMode = 'network' | 'token';

export default function HomePage() {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('network');
  const [guideTab, setGuideTab] = useState<'chrome' | 'edge' | 'firefox' | 'safari'>('chrome');
  const [requests, setRequests] = useState<HarRequest[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [issueFilter, setIssueFilter] = useState<
    'all' | 'failures' | 'critical' | 'warning'
  >('all');
  const [showFindings, setShowFindings] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<Set<
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  >>(new Set());
  const [selectedStatusClasses, setSelectedStatusClasses] = useState<Set<
    '2xx' | '3xx' | '4xx' | '5xx'
  >>(new Set());
  const [urlQuery, setUrlQuery] = useState('');

  const findings = useMemo(() => {
    if (!analysisStarted) return [];
    return runAllRules(requests, tokenInfo);
  }, [analysisStarted, requests, tokenInfo]);

  const findingsByRequestId = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    for (const f of findings) {
      if (!f.relatedRequestId) continue;
      map[f.relatedRequestId] ??= [];
      map[f.relatedRequestId].push(f);
    }
    return map;
  }, [findings]);

  const metrics = useMemo(() => {
    const total = requests.length;
    const failed = requests.filter((r) => r.status >= 400).length;
    const avgDuration =
      total > 0
        ? Math.round(
            requests.reduce((s, r) => s + (r.duration || 0), 0) /
              total
          )
        : 0;
    return { total, failed, avgDuration };
  }, [requests]);

  const findingsSummary = useMemo(() => {
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const warning = findings.filter((f) => f.severity === 'warning').length;
    const info = findings.filter((f) => f.severity === 'info').length;
    return { total: findings.length, critical, warning, info };
  }, [findings]);

  const handleParsed = (parsed: HarRequest[]) => {
    setRequests(parsed);
    setAnalysisStarted(true);
    setSelectedRequestId(null);
  };

  const handleDecoded = (token: TokenInfo | null) => {
    setTokenInfo(token);
  };

  const handleNewAnalysis = () => {
    setAnalysisStarted(false);
    setRequests([]);
    setTokenInfo(null);
    setSelectedRequestId(null);
    setSelectedMethods(new Set());
    setSelectedStatusClasses(new Set());
    setUrlQuery('');
    setIssueFilter('all');
    setShowFindings(false);
  };

  useEffect(() => {
    if (analysisStarted) {
      document.body.classList.add('overflow-hidden', 'h-screen');
    } else {
      document.body.classList.remove('overflow-hidden', 'h-screen');
    }
  }, [analysisStarted]);

  return (
    <div
      className={`flex flex-col ${
        analysisStarted ? 'h-screen' : 'min-h-screen'
      }`}
    >
      <header className="w-full border-b border-gray-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Square3Stack3DIcon className="h-6 w-6 text-gray-900" />
            <div>
              <div className="text-lg font-semibold">Replin Inspect</div>
              <div className="text-xs text-gray-500">
                Client-side troubleshooting tools
              </div>
            </div>
          </div>

          {analysisStarted && (
            <button
              onClick={handleNewAnalysis}
              className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FolderPlusIcon className="h-4 w-4" />
              New analysis
            </button>
          )}
        </div>
      </header>

      <main
        className={`flex-1 min-h-0 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 ${
          analysisStarted ? 'overflow-hidden flex flex-col gap-6' : 'space-y-8'
        }`}
      >
        <nav>
          <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setMode('network')}
              className={`px-3 py-1.5 rounded-md ${
                mode === 'network'
                  ? 'bg-white border border-gray-200'
                  : 'text-gray-600'
              }`}
            >
              <GlobeAltIcon className="h-4 w-4 inline mr-1" />
              Network
            </button>
            <Tooltip label="Token analysis is not available yet.">
              <button
                onClick={() => setMode('token')}
                disabled
                aria-disabled="true"
                className="px-3 py-1.5 rounded-md text-gray-400 cursor-not-allowed"
              >
                <KeyIcon className="h-4 w-4 inline mr-1" />
                Token
              </button>
            </Tooltip>
          </div>
        </nav>

        {!analysisStarted ? (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-2xl p-8 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
                <div className="space-y-3">
                  <div className="text-xl font-semibold text-gray-900">
                    Start inspecting a HAR file
                  </div>
                  <p className="text-sm text-gray-600">
                    Client-side request diagnostics for support and troubleshooting.
                  </p>
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <ShieldCheckIcon className="h-4 w-4 text-gray-500" />
                    <span>
                      Local-only. No data leaves your browser. This is a static HTML file
                      and can be used locally.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <CircleStackIcon className="h-4 w-4 text-gray-500" />
                    <span>This tool currently uses no cookies.</span>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  {mode === 'network' && <UploadArea onParsed={handleParsed} />}
                  {mode === 'token' && <TokenInspector onDecoded={handleDecoded} />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="border border-gray-200 rounded-xl bg-white">
                <div className="border-b border-gray-200 p-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-gray-600" />
                      How to capture a high‑quality HAR
                    </div>
                    <p className="text-sm text-gray-600">
                      Follow these steps to generate a HAR file that makes it easy to diagnose
                      performance issues, failed requests, and authentication problems.
                    </p>
                  </div>
                </div>

                <div className="border-b border-gray-200 px-6">
                  <div className="flex gap-2 text-sm">
                    {[
                      { id: 'chrome', label: 'Chrome' },
                      { id: 'edge', label: 'Edge' },
                      { id: 'firefox', label: 'Firefox' },
                      { id: 'safari', label: 'Safari' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setGuideTab(tab.id as typeof guideTab)}
                        className={`px-3 py-2 border-b -mb-px font-medium ${
                          guideTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {guideTab === 'chrome' && (
                  <div className="space-y-3 text-sm text-gray-600 p-6">
                    <div className="font-semibold text-gray-900">Chrome</div>
                    <div>Use the Chrome DevTools Network panel:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Chrome DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve log</strong>.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><NoSymbolIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Clear network log</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue,
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Export HAR (sanitized)</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'edge' && (
                  <div className="space-y-3 text-sm text-gray-600 p-6">
                    <div className="font-semibold text-gray-900">Edge</div>
                    <div>Use the Microsoft Edge DevTools Network tool:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Microsoft Edge DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve log</strong>.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><NoSymbolIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Clear network log</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Export HAR</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'firefox' && (
                  <div className="space-y-3 text-sm text-gray-600 p-6">
                    <div className="font-semibold text-gray-900">Firefox</div>
                    <div>Use the Firefox DevTools Network Monitor:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Firefox DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><Cog6ToothIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Settings</strong> and then select <strong>Persist Logs</strong>.
                      </li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><TrashIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Clear</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><Cog6ToothIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Settings &gt; Save All As HAR</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'safari' && (
                  <div className="space-y-3 text-sm text-gray-600 p-6">
                    <div className="font-semibold text-gray-900">Safari</div>
                    <div>Use the Safari Web Inspector Network tab:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>Enable Safari developer tools.</li>
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Safari Web Inspector: in the Safari menu bar, click <strong>Develop &gt; Show Web Inspector</strong>.</li>
                      <li>In the Web Inspector, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve Log</strong> and reload the web page.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><TrashIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Clear Network Items</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-gray-500" /></span>
                        <strong>Export</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                <div className="border-t border-gray-200 p-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                    Tip: Capture both the failing request and a known‑good baseline to compare.
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            {/* Command center layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(720px,1fr)_360px] lg:grid-rows-[minmax(0,1fr)] gap-6 flex-1 min-h-0 h-full w-full">
              <aside className="space-y-4 lg:overflow-y-auto lg:pr-2 pb-2">
                <FiltersPanel
                  selectedMethods={selectedMethods}
                  setSelectedMethods={setSelectedMethods}
                  selectedStatusClasses={selectedStatusClasses}
                  setSelectedStatusClasses={setSelectedStatusClasses}
                  urlQuery={urlQuery}
                  setUrlQuery={setUrlQuery}
                />

                <div className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Findings
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-medium">{findingsSummary.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Critical</span>
                      <span className="font-medium text-red-600">
                        {findingsSummary.critical}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Warnings</span>
                      <span className="font-medium text-amber-600">
                        {findingsSummary.warning}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Info</span>
                      <span className="font-medium text-gray-700">
                        {findingsSummary.info}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFindings(true)}
                    disabled={findingsSummary.total === 0}
                    className="mt-4 w-full text-sm px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Open findings
                  </button>
                </div>
              </aside>

              <section className="min-h-0 flex flex-col pb-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {showFindings ? 'Findings' : 'Requests'}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {!showFindings ? (
                      <>
                        <SummaryPill
                          label="All"
                          value={metrics.total}
                          active={issueFilter === 'all'}
                          onClick={() => setIssueFilter('all')}
                        />
                        <SummaryPill
                          label="Failures"
                          value={metrics.failed}
                          active={issueFilter === 'failures'}
                          onClick={() => setIssueFilter('failures')}
                          tone="danger"
                        />
                        <SummaryPill
                          label="Critical"
                          value={findingsSummary.critical}
                          active={issueFilter === 'critical'}
                          onClick={() => setIssueFilter('critical')}
                          tone="danger"
                        />
                        <SummaryPill
                          label="Warnings"
                          value={findingsSummary.warning}
                          active={issueFilter === 'warning'}
                          onClick={() => setIssueFilter('warning')}
                          tone="warning"
                        />
                      </>
                    ) : (
                      <button
                        onClick={() => setShowFindings(false)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        Back to requests
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {showFindings ? (
                    <div
                      className="border border-gray-200 rounded-xl overflow-hidden flex-1 min-h-0"
                    >
                      <div className="h-full overflow-y-auto p-4">
                        <FindingsView
                          findings={findings}
                          requests={requests}
                          onSelectRequest={(id) => {
                            setSelectedRequestId(id);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <ResultsTable
                      requests={requests}
                      findingsByRequestId={findingsByRequestId}
                      selectedRequestId={selectedRequestId}
                      onSelectRequest={setSelectedRequestId}
                      selectedMethods={selectedMethods}
                      selectedStatusClasses={selectedStatusClasses}
                      urlQuery={urlQuery}
                      issueFilter={issueFilter}
                    />
                  )}
                </div>
              </section>

              <aside className="min-h-0 flex flex-col pb-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    Request details
                  </div>
                </div>
                {selectedRequestId && (
                  <div className="flex-1 min-h-0">
                    <RequestDetailsPanel
                      request={
                        requests.find((r) => r.id === selectedRequestId)!
                      }
                      findings={findingsByRequestId[selectedRequestId]}
                    />
                  </div>
                )}
              </aside>
            </div>

            {showFindings && (
              <div className="sr-only" aria-hidden="true" />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  active,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  tone?: 'neutral' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const base =
    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium';
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-gray-200 bg-white text-gray-700';
  const activeClass = active ? 'ring-2 ring-offset-1 ring-gray-200' : '';

  return (
    <button onClick={onClick} className={`${base} ${toneClass} ${activeClass}`}>
      <span className="text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </button>
  );
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

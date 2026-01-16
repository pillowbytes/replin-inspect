'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
  FolderPlusIcon,
  BugAntIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import {
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CircleStackIcon,
  NoSymbolIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  TrashIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

type AnalysisMode = 'network' | 'token';
type ThemePreference = 'system' | 'light' | 'dark';

export default function HomePage() {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('network');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (pref: ThemePreference) => {
      const shouldDark = pref === 'dark' || (pref === 'system' && media.matches);
      root.classList.toggle('dark', shouldDark);
      setIsDarkMode(shouldDark);
    };

    applyTheme(theme);
    window.localStorage.setItem('theme', theme);

    const handler = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        root.classList.toggle('dark', event.matches);
        setIsDarkMode(event.matches);
      }
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div
      className={`flex flex-col ${
        analysisStarted ? 'h-screen' : 'min-h-screen'
      }`}
    >
      <header className="w-full border-b border-utility-border bg-utility-main">
        <div className="w-full grid grid-cols-[240px_minmax(0,1fr)_400px] items-center gap-0 py-3">
          <div className="flex items-center justify-center gap-3 px-3 border-r border-utility-border">
            <Link href="/" className="flex items-center gap-3">
              <Square3Stack3DIcon className="h-7 w-7 text-utility-text" />
              <div className="text-[18px] font-semibold text-utility-text">Replin Inspect</div>
            </Link>
          </div>
          <div className="flex items-center px-3">
            <div className="inline-flex text-[13px]">
                <button
                  onClick={() => setMode('network')}
                  className={`px-3 h-[36px] border-b-2 ${
                    mode === 'network'
                      ? 'border-utility-accent text-utility-accent'
                      : 'border-transparent text-utility-muted hover:text-utility-text'
                } font-medium`}
                >
                  Network
                </button>
              <Tooltip label="Token analysis is not available yet.">
                <button
                  onClick={() => setMode('token')}
                  disabled
                  aria-disabled="true"
                  className="px-3 h-[36px] border-b-2 border-transparent text-utility-muted dark:text-[#CBD5E1] cursor-not-allowed opacity-60 font-medium"
                >
                  Token
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end px-3">
            {analysisStarted && (
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-utility-muted" />
                  <input
                    value={urlQuery}
                    onChange={(e) => setUrlQuery(e.target.value)}
                    placeholder="Filter URL"
                    className="pl-8 pr-2 h-8 w-80 border border-utility-border rounded-[4px] bg-[#EFF6FF] dark:bg-utility-sidebar text-[13px] text-utility-text placeholder:text-utility-muted"
                  />
                </div>
              )}
              {analysisStarted && (
                <button
                  onClick={handleNewAnalysis}
                  className="utility-button-primary flex items-center gap-2 whitespace-nowrap text-white dark:text-[#0A0A0A] font-medium"
                >
                  <FolderPlusIcon className="h-5 w-5" />
                  New analysis
                </button>
              )}
            <Tooltip label="Report an issue">
              <a
                href="https://github.com/pillowbytes/replin-inspect/issues"
                className="utility-button-ghost flex items-center justify-center"
                target="_blank"
                rel="noreferrer"
                aria-label="Report issue"
              >
                <BugAntIcon className="h-4 w-4" />
              </a>
            </Tooltip>
            <Tooltip label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
              <button
                onClick={handleThemeToggle}
                className="utility-button flex items-center justify-center"
                type="button"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 min-h-0 w-full ${
          analysisStarted ? 'overflow-hidden flex flex-col' : 'space-y-8 px-6 pt-6 pb-8'
        }`}
      >
        {!analysisStarted ? (
          <div className="space-y-6">
            <div className="border border-utility-border bg-utility-main p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-center">
                <div className="space-y-3">
                  <div className="text-[16px] font-medium text-utility-text">
                    Start inspecting a HAR file
                  </div>
                  <p className="text-[13px] text-utility-muted">
                    Client-side request diagnostics for support and troubleshooting.
                  </p>
                  <div className="pt-4 space-y-3 text-[13px] text-utility-muted">
                    <div className="flex items-center gap-2 utility-label">
                      <ShieldCheckIcon className="h-4 w-4 text-utility-muted" />
                      Privacy
                    </div>
                    <p>
                      Runs entirely in your browser. HAR data is processed locally and
                      never uploaded or stored.
                    </p>
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center gap-2 utility-label">
                        <CircleStackIcon className="h-4 w-4 text-utility-muted" />
                        Cookies
                      </div>
                      <span>This tool currently uses no cookies.</span>
                    </div>
                  </div>
                  <div className="mt-4 border border-utility-border bg-utility-sidebar px-3 py-2 text-[11px] text-utility-warning">
                    This app is still in development. Found an issue? Report it on{' '}
                    <a
                      href="https://github.com/pillowbytes/replin-inspect/issues"
                      className="font-semibold underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub
                    </a>
                    .
                  </div>
                </div>
                <div className="border border-utility-border bg-utility-sidebar p-4">
                  {mode === 'network' && <UploadArea onParsed={handleParsed} />}
                  {mode === 'token' && <TokenInspector onDecoded={handleDecoded} />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="border border-utility-border bg-utility-main">
                <div className="border-b border-utility-border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[16px] font-medium text-utility-text">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-utility-muted" />
                      How to capture a high‑quality HAR
                    </div>
                    <p className="text-[13px] text-utility-muted">
                      Follow these steps to generate a HAR file that makes it easy to diagnose
                      performance issues, failed requests, and authentication problems.
                    </p>
                  </div>
                </div>

                <div className="border-b border-utility-border px-4">
                  <div className="flex gap-2 text-[13px]">
                    {[
                      { id: 'chrome', label: 'Chrome' },
                      { id: 'edge', label: 'Edge' },
                      { id: 'firefox', label: 'Firefox' },
                      { id: 'safari', label: 'Safari' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setGuideTab(tab.id as typeof guideTab)}
                          className={`px-3 py-2 border-b-2 -mb-px font-medium ${
                            guideTab === tab.id
                            ? 'border-utility-accent text-utility-text'
                              : 'border-transparent text-utility-muted hover:text-utility-text'
                          }`}
                        >
                          {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {guideTab === 'chrome' && (
                  <div className="space-y-3 text-[13px] text-utility-muted p-4">
                    <div className="text-[16px] font-medium text-utility-text">Chrome</div>
                    <div>Use the Chrome DevTools Network panel:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Chrome DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve log</strong>.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><NoSymbolIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Clear network log</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue,
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Export HAR (sanitized)</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'edge' && (
                  <div className="space-y-3 text-[13px] text-utility-muted p-4">
                    <div className="text-[16px] font-medium text-utility-text">Edge</div>
                    <div>Use the Microsoft Edge DevTools Network tool:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Microsoft Edge DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve log</strong>.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><NoSymbolIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Clear network log</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Export HAR</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'firefox' && (
                  <div className="space-y-3 text-[13px] text-utility-muted p-4">
                    <div className="text-[16px] font-medium text-utility-text">Firefox</div>
                    <div>Use the Firefox DevTools Network Monitor:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Firefox DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</li>
                      <li>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><Cog6ToothIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Settings</strong> and then select <strong>Persist Logs</strong>.
                      </li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><TrashIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Clear</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><Cog6ToothIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Settings &gt; Save All As HAR</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                {guideTab === 'safari' && (
                  <div className="space-y-3 text-[13px] text-utility-muted p-4">
                    <div className="text-[16px] font-medium text-utility-text">Safari</div>
                    <div>Use the Safari Web Inspector Network tab:</div>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>Enable Safari developer tools.</li>
                      <li>In your browser, navigate to the page where you are encountering the issue.</li>
                      <li>Open Safari Web Inspector: in the Safari menu bar, click <strong>Develop &gt; Show Web Inspector</strong>.</li>
                      <li>In the Web Inspector, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</li>
                      <li>Select <strong>Preserve Log</strong> and reload the web page.</li>
                      <li>
                        Click <span className="inline-flex align-middle mx-1"><TrashIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Clear Network Items</strong>.
                      </li>
                      <li>Reproduce the issue by interacting with the site.</li>
                      <li>
                        When you're done reproducing the issue, click
                        <span className="inline-flex align-middle mx-1"><ArrowDownTrayIcon className="h-4 w-4 text-utility-muted" /></span>
                        <strong>Export</strong> and save the generated HAR file.
                      </li>
                    </ol>
                  </div>
                )}

                <div className="border-t border-utility-border p-3">
                  <div className="border border-utility-border bg-utility-sidebar p-3 text-[11px] text-utility-muted">
                    Tip: Capture both the failing request and a known‑good baseline to compare.
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* Command center layout */}
            <div className="grid grid-cols-[240px_minmax(0,1fr)_400px] flex-1 min-h-0 w-full border-t border-utility-border">
              <aside className="flex flex-col gap-4 p-3 overflow-y-auto no-scrollbar bg-utility-sidebar border-r border-utility-border">
                <FiltersPanel
                  selectedMethods={selectedMethods}
                  setSelectedMethods={setSelectedMethods}
                  selectedStatusClasses={selectedStatusClasses}
                  setSelectedStatusClasses={setSelectedStatusClasses}
                  urlQuery={urlQuery}
                  setUrlQuery={setUrlQuery}
                />

                <div className="border border-utility-border bg-utility-main p-3">
                  <div className="utility-label">Findings</div>
                  <div className="mt-3 space-y-2 text-[13px] text-utility-text">
                    <div className="flex items-center justify-between">
                      <span className="text-utility-muted">Total</span>
                      <span className="font-medium">{findingsSummary.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-utility-muted">Critical</span>
                      <span className="font-medium text-utility-error">
                        {findingsSummary.critical}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-utility-muted">Warnings</span>
                      <span className="font-medium text-utility-warning">
                        {findingsSummary.warning}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-utility-muted">Info</span>
                      <span className="font-medium text-utility-text">
                        {findingsSummary.info}
                      </span>
                    </div>
                  </div>
                  <Tooltip label="Full findings details are not available yet.">
                    <button
                      onClick={() => setShowFindings(true)}
                      disabled
                      aria-disabled="true"
                      className="mt-4 w-full h-8 text-[13px] border border-utility-border rounded-[4px] text-utility-muted cursor-not-allowed bg-utility-main opacity-40"
                    >
                      Open findings
                    </button>
                  </Tooltip>
                </div>
              </aside>

              <section className="min-h-0 flex flex-col border-r border-utility-border">
                <div className="h-[40px] px-4 flex items-center justify-between border-b border-utility-border bg-utility-main">
                  <div className="text-[16px] font-medium text-utility-text">
                    {showFindings ? 'Findings' : 'Requests'}
                  </div>
                  <div className="flex items-center gap-2">
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
                        className="utility-button-ghost"
                      >
                        Back to requests
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {showFindings ? (
                    <div className="h-full overflow-y-auto no-scrollbar">
                      <FindingsView
                        findings={findings}
                        requests={requests}
                        onSelectRequest={(id) => {
                          setSelectedRequestId(id);
                        }}
                      />
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

              <aside className="min-h-0 flex flex-col bg-utility-main">
                <div className="h-[40px] px-4 flex items-center border-b border-utility-border">
                  <div className="text-[16px] font-medium text-utility-text">
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
    'inline-flex items-center gap-2 h-8 px-3 border border-utility-border rounded-[4px] text-[13px] bg-utility-main';
  const toneClass =
    tone === 'danger'
      ? 'text-utility-error'
      : tone === 'warning'
      ? 'text-utility-warning'
      : 'text-utility-text';
  const activeClass = active
    ? 'bg-utility-selection'
    : '';

  return (
    <button onClick={onClick} className={`${base} ${toneClass} ${activeClass}`}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-utility-muted">{label}</span>
      <span className="text-[11px] font-bold">{value}</span>
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
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

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
            className={`pointer-events-none fixed z-[1000] -translate-x-1/2 whitespace-nowrap rounded-none bg-black dark:bg-neutral-800 px-2 py-1 text-[11px] font-mono text-white dark:text-neutral-100 ${
              placement === 'top' ? '-translate-y-full' : 'translate-y-0'
            }`}
            style={{ left: pos.left, top: placement === 'top' ? pos.top - 8 : pos.top + 8 }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

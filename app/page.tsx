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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/solid';
import {
  FolderPlusIcon,
  BugAntIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/20/solid';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  EyeIcon,
  FolderIcon,
  FunnelIcon,
  MoonIcon,
  NoSymbolIcon,
  SunIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type AnalysisMode = 'network' | 'token';
type ThemePreference = 'system' | 'light' | 'dark';
type GuideTab = 'chrome' | 'edge' | 'firefox' | 'safari';

export default function HomePage() {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('network');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [collapseLeft, setCollapseLeft] = useState(false);
  const [collapseRight, setCollapseRight] = useState(false);
  const [detailsTab, setDetailsTab] = useState<
    'overview' | 'request' | 'response' | 'timing'
  >('overview');
  const [guideTab, setGuideTab] = useState<GuideTab>('chrome');
  const [requests, setRequests] = useState<HarRequest[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [issueFilter, setIssueFilter] = useState<
    'all' | 'failures' | 'critical' | 'warning'
  >('all');
  const [showFindings, setShowFindings] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<Set<
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  >>(new Set());
  const [selectedStatusClasses, setSelectedStatusClasses] = useState<Set<
    '2xx' | '3xx' | '4xx' | '5xx'
  >>(new Set());
  const [urlQuery, setUrlQuery] = useState('');
  const [selectedHar, setSelectedHar] = useState('har-1');
  const harFiles = [{ id: 'har-1', label: 'HAR 1', active: true }];
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<Set<
    'fetch-xhr' | 'js' | 'css' | 'websocket'
  >>(new Set());
  const overlayStartRef = useRef<number | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const prevSelectedRequestRef = useRef<string | null>(null);

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
    const success = total > 0 ? Math.round(((total - failed) / total) * 100) : 0;
    return { total, failed, avgDuration, success };
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

  const handleParseStart = () => {
    if (overlayTimeoutRef.current) {
      window.clearTimeout(overlayTimeoutRef.current);
    }
    overlayStartRef.current = Date.now();
    setShowOverlay(true);
  };

  const handleParseEnd = () => {
    const startedAt = overlayStartRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = 0;
    overlayTimeoutRef.current = window.setTimeout(() => {
      setShowOverlay(false);
      overlayTimeoutRef.current = null;
    }, remaining);
  };

  const handleDecoded = (token: TokenInfo | null) => {
    setTokenInfo(token);
  };

  const handleNewAnalysis = () => {
    setAnalysisStarted(false);
    setRequests([]);
    setTokenInfo(null);
    setSelectedRequestId(null);
    setDetailsTab('overview');
    setSelectedMethods(new Set());
    setSelectedStatusClasses(new Set());
    setSelectedResourceTypes(new Set());
    setUrlQuery('');
    setIssueFilter('all');
    setShowFindings(false);
  };

  useEffect(() => {
    if (
      selectedRequestId &&
      collapseRight &&
      prevSelectedRequestRef.current !== selectedRequestId
    ) {
      setCollapseRight(false);
    }
    prevSelectedRequestRef.current = selectedRequestId;
  }, [selectedRequestId, collapseRight]);

  useEffect(() => {
    if (analysisStarted) {
      document.body.classList.add('overflow-hidden', 'h-screen');
    } else {
      document.body.classList.remove('overflow-hidden', 'h-screen');
    }
  }, [analysisStarted]);

  const guideSteps: Record<GuideTab, React.ReactNode[]> = {
    chrome: [
      <>In your browser, navigate to the page where you are encountering the issue.</>,
      <>Open Chrome DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</>,
      <>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</>,
      <>Select <strong>Preserve log</strong>.</>,
      <>
        Click <InlineIcon icon={<NoSymbolIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Clear network log</strong>.
      </>,
      <>Reproduce the issue by interacting with the site.</>,
      <>
        When you're done reproducing the issue, click{' '}
        <InlineIcon icon={<ArrowDownTrayIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Export HAR (sanitized)</strong> and save the generated HAR file.
      </>,
    ],
    firefox: [
      <>In your browser, navigate to the page where you are encountering the issue.</>,
      <>Open Firefox DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</>,
      <>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</>,
      <>
        Click <InlineIcon icon={<Cog6ToothIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Settings</strong> and then select <strong>Persist Logs</strong>.
      </>,
      <>
        Click <InlineIcon icon={<TrashIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Clear</strong>.
      </>,
      <>Reproduce the issue by interacting with the site.</>,
      <>
        When you're done reproducing the issue, click{' '}
        <InlineIcon icon={<Cog6ToothIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Settings &gt; Save All As HAR</strong> and save the generated HAR file.
      </>,
    ],
    edge: [
      <>In your browser, navigate to the page where you are encountering the issue.</>,
      <>Open Microsoft Edge DevTools: right-click anywhere on the page and choose <strong>Inspect</strong>.</>,
      <>In the DevTools panel, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</>,
      <>Select <strong>Preserve log</strong>.</>,
      <>
        Click <InlineIcon icon={<NoSymbolIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Clear network log</strong>.
      </>,
      <>Reproduce the issue by interacting with the site.</>,
      <>
        When you're done reproducing the issue, click{' '}
        <InlineIcon icon={<ArrowDownTrayIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Export HAR</strong> and save the generated HAR file.
      </>,
    ],
    safari: [
      <>Enable Safari developer tools.</>,
      <>In your browser, navigate to the page where you are encountering the issue.</>,
      <>Open Safari Web Inspector: in the Safari menu bar, click <strong>Develop &gt; Show Web Inspector</strong>.</>,
      <>In the Web Inspector, select the <strong>Network</strong> tab. The tool automatically begins recording network activity.</>,
      <>Select <strong>Preserve Log</strong> and reload the web page.</>,
      <>
        Click <InlineIcon icon={<TrashIcon className="h-4 w-4 text-utility-muted" />} />
        <strong>Clear Network Items</strong>.
      </>,
      <>Reproduce the issue by interacting with the site.</>,
      <>
        When you're done reproducing the issue, click <strong>Export</strong> and save the generated HAR file.
      </>,
    ],
  };
  const guideIntro: Record<GuideTab, string> = {
    chrome: 'Use the Chrome DevTools Network panel:',
    edge: 'Use the Microsoft Edge DevTools Network tool:',
    firefox: 'Use the Firefox DevTools Network Monitor:',
    safari: 'Use the Safari Web Inspector Network tab:',
  };

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
      className="flex flex-col h-screen"
    >
      <header className="w-full border-b border-utility-border bg-utility-main">
        <div
          className="w-full grid items-center gap-0 py-3 transition-[grid-template-columns] duration-300"
          style={{
            gridTemplateColumns: analysisStarted
              ? `${collapseLeft ? '56px' : '240px'} minmax(0,1fr) ${collapseRight ? '56px' : '400px'}`
              : '240px minmax(0,1fr) 400px',
          }}
        >
          <div className="flex items-center justify-center gap-3 px-3 border-r border-utility-border">
            <Link href="/" className="flex items-center gap-3">
              <Square3Stack3DIcon className="h-7 w-7 text-utility-text" />
              {!analysisStarted || !collapseLeft ? (
                <div className="text-[18px] font-semibold text-utility-text">
                  Replin Inspect
                </div>
              ) : null}
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
                  className="utility-button-primary flex items-center gap-2 whitespace-nowrap text-white font-medium dark:bg-[#0EA5E9]"
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

      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {!analysisStarted ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] border-t border-utility-border">
              <section className="flex items-center justify-center p-8">
                <div className="w-full max-w-[980px] flex items-center justify-center">
                  <div className="space-y-4">
                    {mode === 'network' && (
                      <UploadArea
                        onParsed={handleParsed}
                        onParseStart={handleParseStart}
                        onParseEnd={handleParseEnd}
                      />
                    )}
                    {mode === 'token' && <TokenInspector onDecoded={handleDecoded} />}
                  </div>
                </div>
              </section>
              <aside className="flex flex-col border-l border-utility-border bg-utility-sidebar overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <div className="utility-label">Knowledge base</div>
                  <div className="mt-3 flex items-center gap-4 text-[12px] font-bold">
                    {(['chrome', 'firefox', 'edge', 'safari'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setGuideTab(tab);
                          setGuideOpen(true);
                        }}
                        className={`pb-2 border-b-2 ${
                          guideTab === tab
                            ? 'border-utility-accent text-utility-text'
                            : 'border-transparent text-utility-muted hover:text-utility-text'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-0 px-4 pb-4 space-y-4 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setGuideOpen((v) => !v)}
                    className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-utility-muted"
                  >
                    How to export HAR
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        guideOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {guideOpen && (
                    <div className="space-y-3 text-[13px] text-utility-text">
                      <div className="text-utility-muted">{guideIntro[guideTab]}</div>
                      {guideSteps[guideTab].map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="h-5 w-5 shrink-0 rounded-full border border-utility-accent text-utility-accent flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </div>
                          <div>{step}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!guideOpen && (
                    <div className="text-[11px] text-utility-muted">
                      Expand to view step-by-step capture instructions.
                    </div>
                  )}
                  <div className="border border-utility-border bg-[#EFF6FF] dark:bg-utility-sidebar p-3 text-[11px] text-utility-muted">
                    HAR files can contain sensitive information. Replin Inspect processes everything locally.
                  </div>
                  <div className="space-y-3 text-[13px] text-utility-muted">
                    <div className="text-[16px] font-medium text-utility-text">
                      Start inspecting a HAR file
                    </div>
                    <p>Client-side request diagnostics for support and troubleshooting.</p>
                    <div className="space-y-3">
                      <div className="utility-label">Privacy</div>
                      <p>
                        Runs entirely in your browser. HAR data is processed locally and
                        never uploaded or stored.
                      </p>
                      <div className="space-y-2">
                        <div className="utility-label">Cookies</div>
                        <span>This tool currently uses no cookies.</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-utility-warning">
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
                </div>
                <div className="mt-auto border-t border-utility-border p-4">
                  <div className="border border-utility-border bg-[#EFF6FF] dark:bg-utility-sidebar p-3 opacity-50">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-utility-border text-utility-text">
                        Coming soon
                      </span>
                      <div className="text-[12px] font-medium text-utility-text">
                        Token analysis
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-utility-muted">
                      Automated JWT decoding and sensitive token identification.
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <>
            {/* Command center layout */}
            <div
              className="grid flex-1 min-h-0 w-full border-t border-utility-border transition-[grid-template-columns] duration-300 overflow-visible"
              style={{
                gridTemplateColumns: `${collapseLeft ? '56px' : '240px'} minmax(0,1fr) ${
                  collapseRight ? '56px' : '400px'
                }`,
              }}
            >
              <aside className="relative z-10 flex flex-col gap-4 p-3 overflow-y-auto no-scrollbar bg-utility-sidebar dark:bg-utility-main border-r border-utility-border">
                <div
                  className={`flex items-center ${
                    collapseLeft ? 'justify-center' : 'justify-between'
                  }`}
                >
                  {!collapseLeft && (
                    <div className="flex items-center gap-2 text-utility-muted">
                      <FolderIcon className="h-4 w-4" />
                      <div className="utility-label">HAR files</div>
                    </div>
                  )}
                  <Tooltip label={collapseLeft ? 'Expand sidebar' : 'Collapse sidebar'}>
                    <button
                      type="button"
                      onClick={() => setCollapseLeft((v) => !v)}
                      className="h-8 w-8 rounded-[4px] bg-utility-main text-utility-muted/70 hover:text-utility-text flex items-center justify-center"
                      aria-label={collapseLeft ? 'Expand left sidebar' : 'Collapse left sidebar'}
                    >
                      {collapseLeft ? (
                        <ChevronRightIcon className="h-5 w-5" />
                      ) : (
                        <ChevronLeftIcon className="h-5 w-5" />
                      )}
                    </button>
                  </Tooltip>
                </div>

                {collapseLeft ? (
                  <div className="flex flex-col items-center gap-4 text-utility-muted">
                    <Tooltip label="HAR files">
                      <button
                        type="button"
                        onClick={() => setCollapseLeft(false)}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <FolderPlusIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <div className="h-px w-6 bg-utility-border" />
                    <Tooltip label="Filters">
                      <button
                        type="button"
                        onClick={() => setCollapseLeft(false)}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <FunnelIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        {harFiles.map((file) => (
                          <div
                            key={file.id}
                            className="w-full px-2 py-1 text-[13px] font-mono border-[3px] border-dotted border-utility-border bg-utility-main text-utility-accent flex items-center gap-2"
                          >
                            <span className="inline-flex h-3 w-3 items-center justify-center border border-utility-border bg-utility-main">
                              {file.active && (
                                <span className="block h-2 w-2 bg-utility-accent" />
                              )}
                            </span>
                            <span className="font-semibold">{file.label}</span>
                          </div>
                        ))}
                      </div>
                      <Tooltip label="Multiple HAR file analysis will be available soon.">
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="utility-button-ghost h-8 w-full flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wide text-utility-muted opacity-60 cursor-not-allowed"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add HAR file
                        </button>
                      </Tooltip>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <Metric label="Requests" value={`${metrics.total}`} />
                        <Metric label="Errors" value={`${metrics.failed}`} tone="danger" />
                        <Metric label="Avg latency" value={`${metrics.avgDuration} ms`} tone="warning" />
                        <Metric label="Warnings" value={`${findingsSummary.warning}`} tone="warning" />
                      </div>
                    </div>

                    <div className="h-px bg-utility-border" />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-utility-muted">
                        <FunnelIcon className="h-4 w-4" />
                        <div className="utility-label">Filters</div>
                      </div>
                      <FiltersPanel
                        selectedMethods={selectedMethods}
                        setSelectedMethods={setSelectedMethods}
                        selectedStatusClasses={selectedStatusClasses}
                        setSelectedStatusClasses={setSelectedStatusClasses}
                        selectedResourceTypes={selectedResourceTypes}
                        setSelectedResourceTypes={setSelectedResourceTypes}
                      />
                    </div>

                  </>
                )}
              </aside>

              <section className="min-h-0 flex flex-col border-r border-utility-border relative z-0">
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
                  selectedResourceTypes={selectedResourceTypes}
                  urlQuery={urlQuery}
                  issueFilter={issueFilter}
                />
                  )}
                </div>
              </section>

              <aside className="relative z-10 min-h-0 flex flex-col bg-utility-sidebar border-l border-utility-border">
                <div
                  className={`h-[40px] px-4 flex items-center gap-2 border-b border-utility-border bg-utility-sidebar ${
                    collapseRight ? 'justify-center' : ''
                  }`}
                >
                  <Tooltip label={collapseRight ? 'Expand details' : 'Collapse details'}>
                    <button
                      type="button"
                      onClick={() => setCollapseRight((v) => !v)}
                      className="h-8 w-8 rounded-[4px] bg-utility-main text-utility-muted/70 hover:text-utility-text flex items-center justify-center"
                      aria-label={collapseRight ? 'Expand details' : 'Collapse details'}
                    >
                      {collapseRight ? (
                        <ChevronLeftIcon className="h-5 w-5" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5" />
                      )}
                    </button>
                  </Tooltip>
                  {!collapseRight && (
                    <div className="text-[16px] font-medium text-utility-text">
                      Request details
                    </div>
                  )}
                </div>
                {collapseRight ? (
                  <div className="flex flex-col items-center gap-4 text-utility-muted">
                    <Tooltip label="Overview">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTab('overview');
                          setCollapseRight(false);
                        }}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Request">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTab('request');
                          setCollapseRight(false);
                        }}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Response">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTab('response');
                          setCollapseRight(false);
                        }}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Timing">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTab('timing');
                          setCollapseRight(false);
                        }}
                        className="h-8 w-8 flex items-center justify-center"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                ) : (
                  selectedRequestId && (
                    <div className="flex-1 min-h-0">
                      <RequestDetailsPanel
                        request={
                          requests.find((r) => r.id === selectedRequestId)!
                        }
                        findings={findingsByRequestId[selectedRequestId]}
                        activeTab={detailsTab}
                        onTabChange={setDetailsTab}
                      />
                    </div>
                  )
                )}
              </aside>
            </div>

            {showFindings && (
              <div className="sr-only" aria-hidden="true" />
            )}
          </>
        )}
      </main>

      <div
        className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/20 dark:bg-black/40 transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!showOverlay}
      >
        <div className="flex flex-col items-center gap-3 text-utility-text">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-utility-border border-t-utility-accent" />
          <div className="text-[12px] font-mono uppercase tracking-wide text-utility-muted">
            Analyzing HAR…
          </div>
        </div>
      </div>
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

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-utility-error'
      : tone === 'warning'
      ? 'text-utility-warning'
      : tone === 'success'
      ? 'text-utility-success'
      : 'text-utility-text';

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-wide text-utility-muted">
        {label}
      </div>
      <div className={`text-[13px] font-mono ${toneClass}`}>{value}</div>
    </div>
  );
}

function InlineIcon({ icon }: { icon: React.ReactNode }) {
  return <span className="inline-flex align-middle mx-1">{icon}</span>;
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

'use client';

import { useMemo, useState } from 'react';
import UploadArea from '@/components/UploadArea';
import TokenInspector from '@/components/TokenInspector';
import ResultsTable from '@/components/ResultsTable';
import RequestDetailsPanel from '@/components/RequestDetailsPanel';
import AnalysisTile from '@/components/AnalysisTile';
import { runAllRules } from '@/lib/rules';
import { HarRequest, TokenInfo, Finding } from '@/types';

// Heroicons
import { Square3Stack3DIcon } from '@heroicons/react/24/solid';
import {
  GlobeAltIcon,
  KeyIcon,
  FolderPlusIcon,
} from '@heroicons/react/20/solid';

type AnalysisMode = 'network' | 'token';

export default function HomePage() {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('network');
  const [requests, setRequests] = useState<HarRequest[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

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
  };

  return (
    <>
      <header className="w-full border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-8">
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
            <button
              onClick={() => setMode('token')}
              className={`px-3 py-1.5 rounded-md ${
                mode === 'token'
                  ? 'bg-white border border-gray-200'
                  : 'text-gray-600'
              }`}
            >
              <KeyIcon className="h-4 w-4 inline mr-1" />
              Token
            </button>
          </div>
        </nav>

        {!analysisStarted ? (
          <div className="border border-gray-200 rounded-xl p-6">
            {mode === 'network' && <UploadArea onParsed={handleParsed} />}
            {mode === 'token' && <TokenInspector onDecoded={handleDecoded} />}
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metric label="Total requests" value={metrics.total} />
              <Metric label="Failed requests" value={metrics.failed} />
              <Metric
                label="Avg duration"
                value={`${metrics.avgDuration} ms`}
              />
            </div>

            {/* NEW: Analysis tile */}
            <AnalysisTile
              findings={findings}
              onSelectRequest={(id) => setSelectedRequestId(id)}
            />

            {/* Table + details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ResultsTable
                  requests={requests}
                  findingsByRequestId={findingsByRequestId}
                  selectedRequestId={selectedRequestId}
                  onSelectRequest={setSelectedRequestId}
                />
              </div>

              <aside>
                {selectedRequestId && (
                  <RequestDetailsPanel
                    request={
                      requests.find((r) => r.id === selectedRequestId)!
                    }
                    findings={findingsByRequestId[selectedRequestId]}
                  />
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

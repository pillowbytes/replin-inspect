"use client";

import { useMemo, useState } from "react";
import UploadArea from "@/components/UploadArea";
import TokenInspector from "@/components/TokenInspector";
import ResultsTable from "@/components/ResultsTable";
import { runAllRules } from "@/lib/rules";
import { HarRequest, TokenInfo, Finding } from "@/types";

// Heroicons
import { Square3Stack3DIcon } from "@heroicons/react/24/solid";
import {
  GlobeAltIcon,
  KeyIcon,
  FolderPlusIcon,
} from "@heroicons/react/20/solid";

type AnalysisMode = "network" | "token";

export default function HomePage() {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>("network");
  const [requests, setRequests] = useState<HarRequest[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  // NEW: selected request
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

  const findings = useMemo(() => {
    if (!analysisStarted) return [];
    return runAllRules(requests, tokenInfo);
  }, [analysisStarted, requests, tokenInfo]);

  const metrics = useMemo(() => {
    const total = requests.length;
    const failed = requests.filter((r) => r.status >= 400).length;
    const avgDuration =
      total > 0
        ? Math.round(
            requests.reduce((sum, r) => sum + (r.duration || 0), 0) / total
          )
        : 0;

    return { total, failed, avgDuration };
  }, [requests]);

  const findingsByRequestId = useMemo(() => {
    const map: Record<string, Finding[]> = {};

    for (const finding of findings) {
      if (!finding.relatedRequestId) continue;

      map[finding.relatedRequestId] ??= [];
      map[finding.relatedRequestId].push(finding);
    }

    return map;
  }, [findings]);

  // NEW: findings shown in Insights panel
  const visibleFindings = useMemo(() => {
    if (!selectedRequestId) return findings;
    return findingsByRequestId[selectedRequestId] ?? [];
  }, [findings, findingsByRequestId, selectedRequestId]);

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
      {/* Header – full width */}
      <header className="w-full border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
              className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              <FolderPlusIcon className="h-4 w-4" />
              New analysis
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 pt-8 pb-10 space-y-8">
        {/* Mode selector */}
        <nav>
          <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setMode("network")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                mode === "network"
                  ? "bg-white border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <GlobeAltIcon className="h-4 w-4" />
              Network
            </button>
            <button
              onClick={() => setMode("token")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                mode === "token"
                  ? "bg-white border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <KeyIcon className="h-4 w-4" />
              Token
            </button>
          </div>
        </nav>

        {!analysisStarted ? (
          <div className="border border-gray-200 rounded-xl p-6">
            {mode === "network" && <UploadArea onParsed={handleParsed} />}
            {mode === "token" && <TokenInspector onDecoded={handleDecoded} />}
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-600">Total requests</div>
                <div className="text-2xl font-semibold mt-1">
                  {metrics.total}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-600">Failed requests</div>
                <div className="text-2xl font-semibold mt-1">
                  {metrics.failed}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-600">Avg duration</div>
                <div className="text-2xl font-semibold mt-1">
                  {metrics.avgDuration} ms
                </div>
              </div>
            </div>

            {/* Results + Insights */}
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
                <h2 className="text-sm font-semibold mb-3 text-gray-700">
                  Insights & Findings
                </h2>
                <div className="border border-gray-200 rounded-xl p-4 text-sm">
                  {visibleFindings.length === 0 ? (
                    <div className="text-gray-500">
                      {selectedRequestId
                        ? "No findings for this request."
                        : "No issues detected."}
                    </div>
                  ) : (
                    visibleFindings.map((finding, index) => (
                      <div
                        key={index}
                        className="pb-3 mb-3 border-b border-gray-100 last:mb-0 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {finding.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {finding.suggestedAction}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}

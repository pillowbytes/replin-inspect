'use client';

import ResultsTable from '@/components/ResultsTable';
import TokenInspector from '@/components/TokenInspector';
import UploadArea from '@/components/UploadArea';
import { runAllRules } from '@/lib/rules';
import { Finding, HarRequest, TokenInfo } from '@/types';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [requests, setRequests] = useState<HarRequest[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    setFindings(runAllRules(requests, tokenInfo));
  }, [requests, tokenInfo]);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Replin Inspect</h1>

      <UploadArea onParsed={setRequests} />
      <TokenInspector onDecoded={setTokenInfo} />

      <ResultsTable findings={findings} />
    </main>
  );
}

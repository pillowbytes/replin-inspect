'use client';

import { getExplanation } from '@/lib/explanations/findingExplanations';
import { Finding } from '@/types';

interface ResultsTableProps {
  findings: Finding[];
}

export default function ResultsTable({ findings }: ResultsTableProps) {
  if (!findings.length) {
    return null;
  }

  return (
    <div className="my-4">
      <h2 className="font-semibold mb-2">Findings</h2>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Severity</th>
            <th className="p-2 border">Suggested Action</th>
            <th className="p-2 border">Explanation</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, idx) => (
            <tr key={`${f.type}-${f.relatedRequestId ?? idx}`} className="odd:bg-gray-50">
              <td className="p-2 border">{f.type}</td>
              <td className="p-2 border">{f.description}</td>
              <td className="p-2 border">{f.severity}</td>
              <td className="p-2 border">{f.suggestedAction}</td>
              <td className="p-2 border">{getExplanation(f.type)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

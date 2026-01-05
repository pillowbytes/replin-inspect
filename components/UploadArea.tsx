'use client';

import { parseHar } from '@/lib/parsers/harParser';
import { HarRequest } from '@/types';
import { ChangeEvent } from 'react';

interface UploadAreaProps {
  onParsed: (requests: HarRequest[]) => void;
}

export default function UploadArea({ onParsed }: UploadAreaProps) {
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const requests = await parseHar(file);
      onParsed(requests);
    } catch (error) {
      console.error('Failed to parse HAR:', error);
      alert('There was a problem parsing the HAR file. Please ensure it is valid.');
    }
  };

  return (
    <div className="my-4">
      <label className="block font-medium mb-2">Upload HAR file</label>
      <input
        type="file"
        accept=".har,application/json"
        onChange={handleFileChange}
        className="border p-2"
      />
    </div>
  );
}

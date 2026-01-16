'use client';

import { parseHar } from '@/lib/parsers/harParser';
import { HarRequest } from '@/types';
import { ArrowUpTrayIcon, PlusIcon } from '@heroicons/react/20/solid';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { ChangeEvent, useRef, useState } from 'react';

interface UploadAreaProps {
  onParsed: (requests: HarRequest[]) => void;
}

export default function UploadArea({ onParsed }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const requests = await parseHar(file);
      onParsed(requests);
    } catch (error) {
      console.error('Failed to parse HAR:', error);
      alert('There was a problem parsing the HAR file.');
    } finally {
      setIsLoading(false);
      // Reset input so the same file can be uploaded again later if needed
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-[560px] border-2 border-dashed border-utility-border px-8 py-12 text-center bg-utility-main">
      <input
        ref={inputRef}
        type="file"
        accept=".har,application/json"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />

      <div className="flex flex-col items-center gap-4">
        <ArrowUpTrayIcon className="h-8 w-8 text-utility-text" />
        <div className="text-[20px] font-medium text-utility-text">Command Canvas</div>
        <div className="text-[14px] text-utility-muted max-w-[400px]">
          Drop your HTTP Archive (HAR) file here to initiate a local-first inspection sequence.
        </div>
        <button
          type="button"
          onClick={() => !isLoading && inputRef.current?.click()}
          className="h-10 px-5 rounded-[4px] bg-utility-accent text-white flex items-center gap-2"
          disabled={isLoading}
        >
          <PlusIcon className="h-4 w-4" />
          {isLoading ? 'Uploading…' : 'HAR'}
        </button>
        <div className="text-[11px] font-mono uppercase tracking-wide text-utility-muted flex items-center gap-2">
          <LockClosedIcon className="h-4 w-4" />
          Client-side only
        </div>
      </div>
    </div>
  );
}

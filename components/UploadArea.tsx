'use client';

import { parseHar } from '@/lib/parsers/harParser';
import { HarRequest } from '@/types';
import {
  ArrowUpTrayIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { ChangeEvent, useRef, useState } from 'react';

interface UploadAreaProps {
  onParsed: (requests: HarRequest[]) => void;
}

export default function UploadArea({ onParsed }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pasteValue, setPasteValue] = useState('');

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

  const handlePasteSubmit = async () => {
    if (!pasteValue.trim()) return;
    setIsLoading(true);
    try {
      const file = new File([pasteValue], 'pasted.har', {
        type: 'application/json',
      });
      const requests = await parseHar(file);
      onParsed(requests);
      setPasteValue('');
    } catch (error) {
      console.error('Failed to parse HAR:', error);
      alert('There was a problem parsing the HAR content.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] space-y-6">
      <div className="border-2 border-dashed border-utility-border px-8 py-12 text-center bg-utility-sidebar">
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
          <div className="text-[20px] font-medium text-utility-text">
            Command Canvas
          </div>
          <div className="text-[14px] text-utility-muted max-w-[400px]">
            Click to open the file picker and select your HAR file for local inspection.
          </div>
          <button
            type="button"
            onClick={() => !isLoading && inputRef.current?.click()}
            className="h-10 px-5 rounded-[4px] bg-utility-accent dark:bg-[#0EA5E9] text-white flex items-center gap-2 transition-transform duration-150 active:scale-[0.97]"
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

      <div className="flex items-center gap-3 text-[20px] font-medium text-utility-text">
        <span className="h-px flex-1 bg-utility-border" />
        OR
        <span className="h-px flex-1 bg-utility-border" />
      </div>

      <div className="border-2 border-dashed border-utility-border px-8 py-8 text-center bg-utility-main">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-[20px] font-medium text-utility-text">
            <ClipboardDocumentListIcon className="h-5 w-5" />
            Paste HAR content
          </div>
          <div className="text-[14px] text-utility-muted max-w-[400px] mx-auto">
            Paste the full HAR JSON file contents.
          </div>
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="Paste the HAR JSON here…"
            className="w-full h-32 resize-none border border-utility-border bg-[#EFF6FF] dark:bg-utility-sidebar text-[12px] font-mono text-utility-text px-3 py-2 focus:outline-none text-left"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handlePasteSubmit}
            className="h-10 px-5 rounded-[4px] bg-utility-accent dark:bg-[#0EA5E9] text-white flex items-center gap-2 justify-center mx-auto transition-transform duration-150 active:scale-[0.97]"
            disabled={isLoading || !pasteValue.trim()}
          >
            <DocumentMagnifyingGlassIcon className="h-4 w-4" />
            Parse HAR
          </button>
          <div className="text-[11px] font-mono uppercase tracking-wide text-utility-muted flex items-center justify-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Large HAR files may slow or freeze the page
          </div>
        </div>
      </div>
      <div className="text-[11px] text-utility-muted text-center">
        © 2026 Pillowbytes
      </div>
    </div>
  );
}

'use client';

import { parseHar } from '@/lib/parsers/harParser';
import { HarRequest } from '@/types';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';
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
    <div className="border border-gray-200 dark:border-neutral-800 rounded-xl p-6 text-center bg-white dark:bg-neutral-900">
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept=".har,application/json"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />

      {/* Clickable upload area */}
      <label
        onClick={() => !isLoading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 cursor-pointer select-none ${
          isLoading
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-neutral-800'
        } rounded-lg p-6 transition`}
      >
        <ArrowUpTrayIcon className="h-6 w-6 text-gray-700 dark:text-neutral-200" />

        <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
          {isLoading ? 'Analyzing HAR file…' : 'Start inspecting'}
        </div>

        <div className="text-xs text-gray-500 dark:text-neutral-400">
          Click to select a .har file from your computer
        </div>
      </label>
    </div>
  );
}

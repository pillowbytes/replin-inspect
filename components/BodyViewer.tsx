'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface BodyViewerProps {
  body: string;
  mimeType?: string;
  contentType?: string;
}

export default function BodyViewer({ body, mimeType, contentType }: BodyViewerProps) {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const bodyKind = useMemo(
    () => detectBodyKind(body, mimeType, contentType),
    [body, mimeType, contentType]
  );
  const jsonCandidate = useMemo(() => {
    if (bodyKind !== 'json') return null;
    return extractJson(body);
  }, [body, bodyKind]);

  const pretty = useMemo(() => {
    try {
      if (bodyKind === 'json') {
        if (!jsonCandidate) return null;
        return JSON.stringify(JSON.parse(jsonCandidate), null, 2);
      }
      if (bodyKind === 'form') {
        return formatForm(body);
      }
      if (bodyKind === 'xml' || bodyKind === 'html') {
        return formatXml(body);
      }
    } catch {
      return null;
    }
    return null;
  }, [body, bodyKind, jsonCandidate]);

  const canPretty = Boolean(pretty);
  const display = viewMode === 'pretty' && canPretty ? pretty : body;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-utility-muted">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('pretty')}
            disabled={!canPretty}
            className={`h-7 px-2 border border-utility-border rounded-[4px] ${
              viewMode === 'pretty'
                ? 'text-utility-text bg-utility-selection'
                : 'text-utility-muted bg-transparent'
            } ${canPretty ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            Pretty
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`h-7 px-2 border border-utility-border rounded-[4px] ${
              viewMode === 'raw'
                ? 'text-utility-text bg-utility-selection'
                : 'text-utility-muted bg-transparent'
            }`}
          >
            Raw
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={handleCopy}
            className="h-7 px-2 border border-utility-border rounded-[4px] text-utility-muted hover:text-utility-text flex items-center gap-1"
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {copied && (
            <span className="pointer-events-none absolute right-0 -top-7 whitespace-nowrap rounded-none bg-black px-2 py-1 text-[10px] font-mono text-white">
              Copied
            </span>
          )}
        </div>
      </div>
      <div className="border border-utility-border bg-utility-code p-3 text-utility-code-text">
        <div className="text-[10px] font-bold uppercase tracking-wide text-utility-muted">
          {formatKindLabel(bodyKind)}
        </div>
        <div className={`relative ${expanded ? '' : 'max-h-52 overflow-hidden'}`}>
          <pre className="text-[12px] font-mono whitespace-pre-wrap break-words">
            {display}
          </pre>
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-utility-code to-transparent" />
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 px-2 border border-utility-border rounded-[4px] text-utility-text hover:bg-utility-selection"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      </div>
    </div>
  );
}

type BodyKind = 'json' | 'form' | 'xml' | 'html' | 'text' | 'multipart' | 'unknown';

function detectBodyKind(body: string, mimeType?: string, contentType?: string): BodyKind {
  const type = (mimeType || contentType || '').toLowerCase();
  if (type.includes('application/json') || type.includes('+json')) return 'json';
  if (type.includes('application/x-www-form-urlencoded')) return 'form';
  if (type.includes('multipart/form-data')) return 'multipart';
  if (type.includes('text/html')) return 'html';
  if (type.includes('xml')) return 'xml';
  if (type.includes('text/plain')) return 'text';

  const trimmed = body.trim();
  if (looksLikeJson(trimmed)) return 'json';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(body);
      return 'json';
    } catch {
      return 'text';
    }
  }
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    if (trimmed.toLowerCase().includes('<html')) return 'html';
    return 'xml';
  }
  if (trimmed.includes('=') && trimmed.includes('&')) return 'form';
  return 'text';
}

function formatKindLabel(kind: BodyKind) {
  switch (kind) {
    case 'json':
      return 'JSON';
    case 'form':
      return 'FORM URLENCODED';
    case 'xml':
      return 'XML';
    case 'html':
      return 'HTML';
    case 'multipart':
      return 'MULTIPART';
    case 'text':
      return 'TEXT';
    default:
      return 'UNKNOWN';
  }
}

function looksLikeJson(trimmed: string) {
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true;
  if (trimmed.startsWith(")]}',")) return true;
  if (trimmed.startsWith('while(1);')) return true;
  return false;
}

function extractJson(body: string) {
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const start = trimmed.search(/[{\[]/);
  if (start === -1) return null;
  return trimmed.slice(start);
}

function formatForm(body: string) {
  const params = new URLSearchParams(body);
  const lines: string[] = [];
  for (const [key, value] of params.entries()) {
    lines.push(`${key}: ${value}`);
  }
  return lines.length > 0 ? lines.join('\n') : body;
}

function formatXml(body: string) {
  const input = body.trim();
  const withBreaks = input.replace(/>\s+</g, '>\n<');
  const lines = withBreaks.split('\n');
  let indent = 0;
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('</')) {
      indent = Math.max(indent - 1, 0);
    }
    const padded = `${'  '.repeat(indent)}${trimmed}`;
    if (trimmed.match(/^<[^!?/][^>]*[^/]>$/)) {
      indent += 1;
    }
    return padded;
  });
  return out.join('\n');
}

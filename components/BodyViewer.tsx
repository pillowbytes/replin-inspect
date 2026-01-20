'use client';

import { useMemo, useState, type ReactNode } from 'react';
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
    if (bodyKind !== 'json' && bodyKind !== 'text-json') return null;
    return extractJson(body);
  }, [body, bodyKind]);

  const pretty = useMemo(() => {
    try {
      if (bodyKind === 'json' || bodyKind === 'text-json') {
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
  const highlighted = useMemo(() => {
    if (viewMode === 'pretty' && canPretty && pretty) {
      if (bodyKind === 'json') return highlightJson(pretty);
      if (bodyKind === 'form') return highlightForm(pretty);
      if (bodyKind === 'xml' || bodyKind === 'html') return highlightMarkup(pretty);
      return null;
    }

    if (viewMode === 'raw') {
      if (bodyKind === 'json') return highlightJson(display);
      if (bodyKind === 'form') return highlightFormRaw(display);
      if (bodyKind === 'xml' || bodyKind === 'html') return highlightMarkup(display);
    }

    return null;
  }, [viewMode, canPretty, pretty, bodyKind, display]);

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
                ? 'text-utility-text bg-[#EFF6FF] dark:bg-utility-selection'
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
                ? 'text-utility-text bg-[#EFF6FF] dark:bg-utility-selection'
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
            <span className="pointer-events-none absolute right-0 -top-7 whitespace-nowrap rounded-none border border-utility-border bg-[#EFF6FF] dark:bg-utility-sidebar px-2 py-1 text-[10px] font-mono text-utility-muted">
              Copied
            </span>
          )}
        </div>
      </div>
      <div className="border border-utility-border bg-[#EFF6FF] dark:bg-utility-code p-3 text-utility-code-text">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-utility-muted">
          <span>{formatKindLabel(bodyKind)}</span>
          {formatInferredLabel(bodyKind) && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-utility-muted/70">
              · {formatInferredLabel(bodyKind)}
            </span>
          )}
        </div>
        <div className={`relative ${expanded ? '' : 'max-h-52 overflow-hidden'}`}>
          <pre className="text-[12px] font-mono whitespace-pre-wrap break-words">
            {highlighted ?? display}
          </pre>
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-utility-code to-transparent" />
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 px-2 border border-utility-border rounded-[4px] text-utility-text hover:bg-[#EFF6FF] dark:hover:bg-utility-selection"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      </div>
    </div>
  );
}

type BodyKind =
  | 'json'
  | 'form'
  | 'xml'
  | 'html'
  | 'text'
  | 'text-json'
  | 'multipart'
  | 'unknown';

function detectBodyKind(body: string, mimeType?: string, contentType?: string): BodyKind {
  const type = (mimeType || contentType || '').toLowerCase();
  if (type.includes('application/json') || type.includes('+json')) return 'json';
  if (type.includes('application/x-www-form-urlencoded')) return 'form';
  if (type.includes('multipart/form-data')) return 'multipart';
  if (type.includes('text/html')) return 'html';
  if (type.includes('xml')) return 'xml';
  if (type.includes('text/plain')) {
    const trimmed = body.trim();
    if (looksLikeJson(trimmed)) return 'text-json';
    return 'text';
  }

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
  if (/<[a-zA-Z][^>]*>/.test(trimmed)) {
    if (trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html')) {
      return 'html';
    }
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
    case 'text-json':
      return 'TEXT';
    default:
      return 'UNKNOWN';
  }
}

function formatInferredLabel(kind: BodyKind) {
  if (kind === 'text-json') return 'INFERRED JSON';
  return null;
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
  const withBreaks = input.replace(/>\s*</g, '>\n<');
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

type HighlightToken = {
  value: string;
  type: 'string' | 'number' | 'boolean' | 'null' | 'punct';
  start: number;
  end: number;
};

function highlightJson(source: string) {
  const tokens: HighlightToken[] = [];
  const regex =
    /"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const value = match[0];
    let type: HighlightToken['type'] = 'punct';
    if (value.startsWith('"')) type = 'string';
    else if (value === 'true' || value === 'false') type = 'boolean';
    else if (value === 'null') type = 'null';
    else if (value.match(/^-?\d/)) type = 'number';
    tokens.push({ value, type, start: match.index, end: match.index + value.length });
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((token, index) => {
    if (token.start > lastIndex) {
      nodes.push(source.slice(lastIndex, token.start));
    }

    if (token.type === 'string') {
      const nextToken = tokens[index + 1];
      const isKey = nextToken?.value === ':';
      const inner = token.value.slice(1, -1);
      if (isKey) {
        nodes.push(
          <span key={`q-open-${token.start}`} className="token-punct">
            "
          </span>
        );
        nodes.push(
          <span key={`key-${token.start}`} className="token-key">
            {inner}
          </span>
        );
        nodes.push(
          <span key={`q-close-${token.start}`} className="token-punct">
            "
          </span>
        );
      } else {
        nodes.push(
          <span key={`str-${token.start}`} className="token-string">
            {token.value}
          </span>
        );
      }
    } else if (token.type === 'number') {
      nodes.push(
        <span key={`num-${token.start}`} className="token-number">
          {token.value}
        </span>
      );
    } else if (token.type === 'boolean') {
      nodes.push(
        <span key={`bool-${token.start}`} className="token-boolean">
          {token.value}
        </span>
      );
    } else if (token.type === 'null') {
      nodes.push(
        <span key={`null-${token.start}`} className="token-null">
          {token.value}
        </span>
      );
    } else {
      nodes.push(
        <span key={`p-${token.start}`} className="token-punct">
          {token.value}
        </span>
      );
    }

    lastIndex = token.end;
  });

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes;
}

function highlightForm(source: string) {
  const lines = source.split('\n');
  const nodes: ReactNode[] = [];
  lines.forEach((line, index) => {
    const splitAt = line.indexOf(':');
    if (splitAt === -1) {
      nodes.push(line);
    } else {
      const key = line.slice(0, splitAt);
      const value = line.slice(splitAt + 1).trimStart();
      nodes.push(
        <span key={`form-key-${index}`} className="token-key">
          {key}
        </span>
      );
      nodes.push(
        <span key={`form-colon-${index}`} className="token-punct">
          :
        </span>
      );
      nodes.push(' ');
      nodes.push(
        <span key={`form-val-${index}`} className="token-string">
          {value}
        </span>
      );
    }
    if (index < lines.length - 1) nodes.push('\n');
  });
  return nodes;
}

function highlightFormRaw(source: string) {
  const nodes: ReactNode[] = [];
  const regex = /([^=&\n]+)(=)?([^&\n]*)?(&)?/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = regex.exec(source))) {
    if (!match[0]) break;
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }

    const key = match[1];
    const hasEquals = Boolean(match[2]);
    const value = match[3] ?? '';
    const hasAmp = Boolean(match[4]);

    if (key) {
      nodes.push(
        <span key={`form-raw-key-${match.index}`} className="token-key">
          {key}
        </span>
      );
    }
    if (hasEquals) {
      nodes.push(
        <span key={`form-raw-eq-${match.index}`} className="token-punct">
          =
        </span>
      );
      if (value) {
        nodes.push(
          <span key={`form-raw-val-${match.index}`} className="token-string">
            {value}
          </span>
        );
      }
    }
    if (hasAmp) {
      nodes.push(
        <span key={`form-raw-amp-${match.index}`} className="token-punct">
          &
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes;
}

function highlightMarkup(source: string) {
  const nodes: ReactNode[] = [];
  const regex = /<\/?[^>]+>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }
    nodes.push(renderTag(match[0], match.index));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }
  return nodes;
}

function renderTag(tag: string, offset: number) {
  const closing = tag.startsWith('</');
  const selfClosing = tag.endsWith('/>');
  const body = tag.slice(closing ? 2 : 1, selfClosing ? -2 : -1).trim();
  const nameMatch = body.match(/^([^\s/>]+)/);
  const tagName = nameMatch?.[1] ?? '';
  const attrs = body.slice(tagName.length).trim();

  const parts: ReactNode[] = [];
  parts.push(
    <span key={`lt-${offset}`} className="token-punct">
      &lt;
    </span>
  );
  if (closing) {
    parts.push(
      <span key={`slash-${offset}`} className="token-punct">
        /
      </span>
    );
  }
  parts.push(
    <span key={`tag-${offset}`} className="token-tag">
      {tagName}
    </span>
  );

  if (attrs) {
    const attrRegex = /([^\s=]+)(?:=(\"[^\"]*\"|'[^']*'|[^\s>]+))?/g;
    let attrMatch: RegExpExecArray | null;
    let attrIndex = 0;
    while ((attrMatch = attrRegex.exec(attrs))) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2];
      parts.push(' ');
      parts.push(
        <span key={`attr-${offset}-${attrIndex}`} className="token-attr">
          {attrName}
        </span>
      );
      if (attrValue) {
        parts.push(
          <span key={`eq-${offset}-${attrIndex}`} className="token-punct">
            =
          </span>
        );
        parts.push(
          <span key={`val-${offset}-${attrIndex}`} className="token-attr-value">
            {attrValue}
          </span>
        );
      }
      attrIndex += 1;
    }
  }

  if (selfClosing) {
    parts.push(
      <span key={`self-${offset}`} className="token-punct">
        /
      </span>
    );
  }
  parts.push(
    <span key={`gt-${offset}`} className="token-punct">
      &gt;
    </span>
  );

  return parts;
}

'use client';

import { useState, ChangeEvent } from 'react';
import { decodeJwt } from '@/lib/parsers/tokenParser';
import { TokenInfo } from '@/types';

interface TokenInspectorProps {
  onDecoded: (token: TokenInfo | null) => void;
}

export default function TokenInspector({ onDecoded }: TokenInspectorProps) {
  const [value, setValue] = useState('');

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const token = e.target.value.trim();
    setValue(token);

    if (!token) {
      onDecoded(null);
      return;
    }

    const info = decodeJwt(token);
    onDecoded(info);
  };

  return (
    <div className="space-y-2">
      <label className="utility-label">Paste JWT token</label>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Paste JWT here"
        className="w-full h-28 border border-utility-border bg-utility-main text-utility-text placeholder:text-utility-muted p-3 text-[13px] font-mono"
      />
    </div>
  );
}

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
    <div>
      <label>Paste JWT token</label>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Paste JWT here"
      />
    </div>
  );
}

'use client';

import * as React from 'react';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ padding: '10px 16px', borderRadius: '10px', background: '#111827', color: '#fff' }}
    >
      Print
    </button>
  );
}
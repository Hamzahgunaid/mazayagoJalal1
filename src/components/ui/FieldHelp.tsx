'use client';

import { useId, useState } from 'react';

type FieldHelpProps = {
  label: string;
  content: string;
};

export default function FieldHelp({ label, content }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-600 hover:border-slate-400"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((prev) => !prev)}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-7 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-xl"
        >
          {content}
        </span>
      )}
    </span>
  );
}

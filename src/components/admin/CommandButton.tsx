"use client";

export default function CommandButton(){
  return (
    <button
      className="btn btn-outline w-full"
      onClick={() => (window as any).openCommandPalette?.()}
    >
      ⌘K Command
    </button>
  );
}

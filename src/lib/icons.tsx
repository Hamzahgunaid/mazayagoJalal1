import * as L from "lucide-react";
export function Icon({ name, className }: { name: string; className?: string }) {
  const Comp = (L as any)[name] || L.CircleHelp;
  return <Comp className={className} />;
}

// src/app/page.tsx — MazayaGo Homepage
import ModeToggle, { ModeProvider } from '@/components/home/ModeToggle';
import HomeContent from '@/components/home/HomeContent';

export default function Page() {
  return (
    <ModeProvider>
      <ModeToggle />
      <HomeContent />
    </ModeProvider>
  );
}

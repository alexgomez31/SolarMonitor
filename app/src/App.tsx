// =============================================================================
// SolarMonitor PV - Main Application
// =============================================================================

import { useEffect } from 'react';
import './index.css';
import useLenis from './hooks/useLenis';
import { siteConfig } from './config';

// Sections
import SolarHero        from './sections/SolarHero';
import DashboardSection from './sections/DashboardSection';
import LucesSection     from './sections/LucesSection';
import HistoricoSection from './sections/HistoricoSection';
import InfoSection      from './sections/InfoSection';
import AISection        from './sections/AISection';
import SolarFooter      from './sections/SolarFooter';

function App() {
  useLenis();

  useEffect(() => {
    if (siteConfig.title) document.title = siteConfig.title;
  }, []);

  return (
    <main className="relative w-full min-h-screen bg-void-black overflow-x-hidden">
      <SolarHero />
      <DashboardSection />
      <LucesSection />
      <HistoricoSection />
      <AISection />
      <InfoSection />
      <SolarFooter />
    </main>
  );
}

export default App;

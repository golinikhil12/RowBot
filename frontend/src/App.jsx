import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { JobProvider } from './contexts/JobContext';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Studio from './pages/Studio';
import Copilot from './pages/Copilot';
import Compare from './pages/Compare';
import Export from './pages/Export';
import HistoryPage from './pages/HistoryPage';
import AnimatedBackground from './components/AnimatedBackground';
import RowBotLogo from './components/RowBotLogo';
import FullScreenWelcome from './components/FullScreenWelcome';
import PresentationDeck from './pages/PresentationDeck';
import { useJob } from './contexts/JobContext';
import { Menu, X } from 'lucide-react';

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isPresentation = location.pathname === '/presentation';
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { showWelcome, closeWelcome } = useJob();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isPresentation) {
    return <PresentationDeck />;
  }

  return (
    <>
      <AnimatedBackground />
      <FullScreenWelcome isOpen={showWelcome} onClose={closeWelcome} />
      {isLanding ? (
        <Landing />
      ) : (
        <div className="app-layout">
          {/* Mobile Top Header */}
          <div className="mobile-header">
            <RowBotLogo size="sm" subtitle="Data Cleaning AI" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px 10px', color: 'var(--color-primary)' }}
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Backdrop for Mobile Drawer */}
          {mobileMenuOpen && (
            <div
              className="sidebar-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <Sidebar
            mobileOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
          <div className="main-content">
            <div className="page-content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/copilot" element={<Copilot />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/export" element={<Export />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <JobProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '10px',
              background: '#1a2340',
              color: '#fff',
              fontSize: '0.875rem',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: { iconTheme: { primary: '#14b8a6', secondary: '#fff' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
          }}
        />
        <AppContent />
      </JobProvider>
    </HashRouter>
  );
}

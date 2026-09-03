import React, { useState, useEffect } from 'react';
import { HeroSection } from './components/HeroSection';
import { CampusSelector } from './components/CampusSelector';
import { FooterSection } from './components/FooterSection';
import { LoginModalView } from './components/LoginModalView';
import { CampusDashboardPreview } from './components/CampusDashboardPreview';
import { HomeHeaderNav } from './components/HomeHeaderNav';
import { CampusId, UserSession, ViewState } from './types';
import { api, clearSession, setSession } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [selectedCampus, setSelectedCampus] = useState<CampusId | null>(null);
  const [session, setSessionState] = useState<UserSession | null>(null);

  // Sync state with URL search params / hash for testability
  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const sedeParam = params.get('sede') as CampusId | null;

      if (sedeParam && (sedeParam === 'nicoya' || sedeParam === 'liberia')) {
        setSelectedCampus(sedeParam);
        if (window.location.pathname.includes('/dashboard') && session) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('login');
        }
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [session]);

  const updateUrl = (view: ViewState, campus: CampusId | null) => {
    const url = new URL(window.location.href);
    if (campus) {
      url.searchParams.set('sede', campus);
      if (view === 'dashboard') {
        url.pathname = '/dashboard';
      } else if (view === 'login') {
        url.pathname = '/login';
      }
    } else {
      url.searchParams.delete('sede');
      url.pathname = '/';
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectCampus = (campusId: CampusId | null) => {
    if (!campusId) {
      setSelectedCampus(null);
      setCurrentView('landing');
      updateUrl('landing', null);
      return;
    }

    setSelectedCampus(campusId);
    setCurrentView('login');
    updateUrl('login', campusId);
  };

  const handleDirectAccess = (campusId: CampusId) => {
    // Acceso demo: inicia sesión con la cuenta de jefa (única jefa del sistema).
    const email = 'jefa@una.cr';
    api
      .login(email, 'Jefa1234!')
      .then((res) => {
        const mapped: UserSession = {
          accessToken: res.accessToken,
          email: res.usuario.email,
          role: res.usuario.rol,
          campus: res.usuario.sedeId === 1 ? 'nicoya' : 'liberia',
          campusId: res.usuario.sedeId,
          name: res.usuario.nombreCompleto,
          userId: res.usuario.id,
        };
        setSession(res.accessToken, mapped);
        setSessionState(mapped);
        setSelectedCampus(mapped.campus);
        setCurrentView('dashboard');
        updateUrl('dashboard', mapped.campus);
      })
      .catch(() => {
        const defaultSession: UserSession = {
          accessToken: '',
          email: `directo.${campusId}@una.cr`,
          role: 'jefa',
          campus: campusId,
          campusId: campusId === 'nicoya' ? 1 : 2,
          name: 'Nuria Zamora Chavarria',
          userId: '',
        };
        setSessionState(defaultSession);
        setSelectedCampus(campusId);
        setCurrentView('dashboard');
        updateUrl('dashboard', campusId);
      });
  };

  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession.accessToken, userSession);
    setSessionState(userSession);
    setCurrentView('dashboard');
    updateUrl('dashboard', userSession.campus);
  };

  const handleResetToLanding = () => {
    clearSession();
    setSelectedCampus(null);
    setCurrentView('landing');
    setSessionState(null);
    updateUrl('landing', null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F4] text-[#262624] antialiased selection:bg-[#990000] selection:text-white">
      {/* Main Content Router */}
      {currentView === 'landing' && (
        <main className="flex-1 flex flex-col justify-between">
          {/* Header Navigation on Home */}
          <HomeHeaderNav />

          {/* 1. Hero Principal */}
          <HeroSection onDirectAccess={handleDirectAccess} />

          {/* 2. Selector de Sede */}
          <CampusSelector
            onSelectCampus={handleSelectCampus}
            onDirectAccess={handleDirectAccess}
            selectedCampus={selectedCampus}
          />

          {/* 3. Pie de página minimalista */}
          <FooterSection />
        </main>
      )}

      {currentView === 'login' && selectedCampus && (
        <main className="flex-1 flex flex-col">
          <LoginModalView
            campusId={selectedCampus}
            onBackToSelector={handleResetToLanding}
            onLoginSuccess={handleLoginSuccess}
          />
          <FooterSection />
        </main>
      )}

      {currentView === 'dashboard' && session && (
        <main className="flex-1 flex flex-col">
          <CampusDashboardPreview
            session={session}
            onChangeCampus={handleResetToLanding}
            onLogout={handleResetToLanding}
          />
          <FooterSection />
        </main>
      )}
    </div>
  );
}

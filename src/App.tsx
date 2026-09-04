import React, { useState, useEffect } from 'react';
import { HeroSection } from './components/HeroSection';
import { CampusSelector } from './components/CampusSelector';
import { FooterSection } from './components/FooterSection';
import { LoginModalView } from './components/LoginModalView';
import { CampusDashboardPreview } from './components/CampusDashboardPreview';
import { HomeHeaderNav } from './components/HomeHeaderNav';
import { CampusId, UserSession, ViewState } from './types';
import { api, clearSession, getSession, setSession } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [selectedCampus, setSelectedCampus] = useState<CampusId | null>(null);
  const [session, setSessionState] = useState<UserSession | null>(null);

  // Rehidratar sesión desde localStorage al recargar (evita pedir login en F5).
  useEffect(() => {
    const guardada = getSession<UserSession>();
    if (guardada && guardada.accessToken) {
      setSessionState(guardada);
      setSelectedCampus(guardada.campus);
      setCurrentView('dashboard');
      // Validar token contra el back en local; si expiró, volver a landing.
      api.me().catch(() => {
        clearSession();
        setSessionState(null);
        setCurrentView('landing');
      });
    }
  }, []);

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
    // Acceso demo con la cuenta de jefa. La jefa opera en el campus por el
    // que entró (la tarjeta clicada): esa sede queda como campus de la sesión
    // y como destino de sus registros (el backend acepta sedeId solo para
    // jefa y lo valida). Así "si me meto a Liberia, ahí se guarda y ahí
    // aparece" en las estadísticas filtradas por Liberia.
    const email = 'jefa@una.cr';
    api
      .login(email, 'Jefa1234!')
      .then((res) => {
        const mapped: UserSession = {
          accessToken: res.accessToken,
          email: res.usuario.email,
          role: res.usuario.rol,
          campus: campusId,
          campusId: campusId === 'nicoya' ? 1 : 2,
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
        // Sin fallback de sesión vacía: si el login demo falla, no se entra
        // al dashboard sin token (evita 401 silenciosos y datos mock).
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

          {/* 2. Selector de Campus */}
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

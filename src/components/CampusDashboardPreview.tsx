import React, { useEffect, useState } from 'react';
import { CAMPUSES } from '../data/campuses';
import { api } from '../api/client';
import { SidebarTab, UserSession } from '../types';
import { CategoriesView } from './CategoriesView';
import { CyclesView } from './CyclesView';
import { QuickRegisterView } from './QuickRegisterView';
import { ReportsView } from './ReportsView';
import { SidebarNav } from './SidebarNav';
import { UserManagementView } from './UserManagementView';
import { DashboardCharts } from './DashboardCharts';

interface CampusDashboardPreviewProps {
  session: UserSession;
  onChangeCampus: () => void;
  onLogout: () => void;
}

export const CampusDashboardPreview: React.FC<CampusDashboardPreviewProps> = ({
  session,
  onChangeCampus,
  onLogout,
}) => {
  const campus = CAMPUSES[session.campus];
  const [activeTab, setActiveTab] = useState<SidebarTab>('registro');
  const [attendancesCount, setAttendancesCount] = useState(campus.statsPreview.monthlyAttentions);

  useEffect(() => {
    let mounted = true;
    api
      .cicloActual()
      .then((ciclo) => api.kpis(ciclo.id))
      .then((kpis) => {
        if (mounted) setAttendancesCount(kpis.totalAtenciones);
      })
      .catch(() => {
        /* conserva el valor local */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SidebarNav
      session={session}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      onChangeCampus={onChangeCampus}
    >
      {/* Tab: Registro (Quick Logger) */}
      {activeTab === 'registro' && <QuickRegisterView session={session} />}

      {/* Tab: Dashboard (Statistics) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Campus Banner */}
          <div className="bg-white border-l-4 border-[#990000] p-6 rounded-r-2xl border-t border-r border-b border-[#E3E1DA] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
                Estadísticas del Subsistema de Bibliotecas — UNA
              </span>
              <h1 className="text-xl sm:text-2xl font-medium text-[#262624] font-goudy mt-0.5">
                Dashboard Institucional — {campus.libraryName} ({campus.name})
              </h1>
              <p className="text-xs text-[#6B6A64] mt-1">
                Visualización de atenciones en ventanilla, flujo de préstamos y servicios brindados.
              </p>
            </div>
            <div className="text-right bg-[#F7F6F4] px-4 py-2.5 rounded-xl border border-[#E3E1DA]">
              <span className="text-3xl font-bold text-[#990000] font-mono">
                {attendancesCount.toLocaleString()}
              </span>
              <p className="text-[11px] text-[#6B6A64] uppercase font-semibold">Atenciones registradas</p>
            </div>
          </div>

          {/* Recharts Analytics & Visualizations Panel */}
          <DashboardCharts role={session.role} />
        </div>
      )}

      {/* Tab: Usuarios (Administration) */}
      {activeTab === 'usuarios' && <UserManagementView session={session} />}

      {/* Tab: Categorías (Administration) */}
      {activeTab === 'categorias' && <CategoriesView session={session} />}

      {/* Tab: Ciclos (Administration) */}
      {activeTab === 'ciclos' && <CyclesView session={session} />}

      {/* Tab: Reportes (Administration) */}
      {activeTab === 'reportes' && <ReportsView session={session} />}
    </SidebarNav>
  );
};

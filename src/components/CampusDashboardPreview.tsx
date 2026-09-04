import React, { useEffect, useState } from 'react';
import { CAMPUSES } from '../data/campuses';
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
  const isJefatura = session.role === 'jefa' || session.role === 'jefatura';
  const [activeTab, setActiveTab] = useState<SidebarTab>('registro');

  // Al cambiar de pestaña (ej. entrar a Estadísticas), volver arriba:
  // si no, la ventana conserva el scroll de la vista anterior y "cae" abajo.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

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

      {/* Tab: Estadísticas (solo jefatura) */}
      {activeTab === 'dashboard' && isJefatura && (
        <div className="space-y-6">
          {/* Active Campus Banner (sin total duplicado: los totales viven
              en las tarjetas KPI de Estadísticas y respetan los filtros) */}
          <div className="bg-white border-l-4 border-[#990000] p-6 rounded-r-2xl border-t border-r border-b border-[#E3E1DA] shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
              Estadísticas del Subsistema de Bibliotecas — UNA
            </span>
            <h1 className="text-xl sm:text-2xl font-medium text-[#262624] font-goudy mt-0.5">
              Estadísticas Institucionales — {campus.libraryName} ({campus.name})
            </h1>
            <p className="text-xs text-[#6B6A64] mt-1">
              Visualización de atenciones en ventanilla, flujo de préstamos y servicios brindados.
            </p>
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

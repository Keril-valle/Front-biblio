import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserSession } from '../types';
import { SidebarNav } from './SidebarNav';

const baseSession: UserSession = {
  accessToken: 'tok',
  email: 'biblio@una.cr',
  role: 'bibliotecologa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Biblio Nicoya',
  userId: 'u-1',
};

function renderNav(session: UserSession, handlers?: { onLogout?: () => void; onChangeCampus?: () => void }) {
  const onLogout = handlers?.onLogout ?? vi.fn();
  const onChangeCampus = handlers?.onChangeCampus ?? vi.fn();
  render(
    <SidebarNav
      session={session}
      activeTab="registro"
      onTabChange={() => {}}
      onLogout={onLogout}
      onChangeCampus={onChangeCampus}
    >
      <div>contenido</div>
    </SidebarNav>,
  );
  return { onLogout, onChangeCampus };
}

describe('SidebarNav acciones de sesión', () => {
  it('la jefa ve Cambiar de Campus y Cerrar sesión', async () => {
    const onLogout = vi.fn();
    const onChangeCampus = vi.fn();
    renderNav({ ...baseSession, role: 'jefa' }, { onLogout, onChangeCampus });

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de Campus' }));
    expect(onChangeCampus).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument();
  });

  it('la bibliotecóloga ve Salir en lugar de Cambiar de Campus', async () => {
    const onLogout = vi.fn();
    const onChangeCampus = vi.fn();
    renderNav(baseSession, { onLogout, onChangeCampus });

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onChangeCampus).not.toHaveBeenCalled();

    expect(screen.queryByRole('button', { name: 'Cambiar de Campus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });
});

describe('SidebarNav estadística por empleado (solo jefatura)', () => {
  it('la jefa ve la entrada Estadística por Empleado', () => {
    renderNav({ ...baseSession, role: 'jefa' });

    expect(
      screen.getByRole('button', { name: /Estadística por Empleado/i }),
    ).toBeInTheDocument();
    // Las estadísticas generales también son de jefatura.
    expect(screen.getByRole('button', { name: 'Estadísticas' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mis estadísticas' }),
    ).not.toBeInTheDocument();
  });

  it('la bibliotecóloga no ve la entrada Estadística por Empleado', () => {
    renderNav(baseSession);

    expect(
      screen.queryByRole('button', { name: /Estadística por Empleado/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Estadísticas' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mis estadísticas' }),
    ).toBeInTheDocument();
  });
});

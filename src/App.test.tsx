import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api/client';
import type { UserSession, UsuarioDto } from './types';
import App from './App';

const BIBLIO_SESSION: UserSession = {
  accessToken: 'tok-123',
  email: 'biblio@una.cr',
  role: 'bibliotecologa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Biblio Nicoya',
  userId: 'u-1',
};

const USUARIO: UsuarioDto = {
  id: 'u-1',
  nombreCompleto: 'Biblio Nicoya',
  email: 'biblio@una.cr',
  googleId: null,
  rol: 'bibliotecologa',
  sedeId: 1,
  activo: true,
};

function seedSession(session: UserSession) {
  localStorage.setItem('biblioteca_token', session.accessToken);
  localStorage.setItem('biblioteca_session', JSON.stringify(session));
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(api, 'me').mockResolvedValue({ accessToken: 'tok-123', usuario: USUARIO });
  vi.spyOn(api, 'categorias').mockResolvedValue([]);
  vi.spyOn(api, 'ciclos').mockResolvedValue([]);
  vi.spyOn(api, 'modulos').mockResolvedValue([]);
});

describe('App cambio de campus y salida', () => {
  it('Salir lleva al inicio sin cerrar la sesión (bibliotecóloga)', async () => {
    seedSession(BIBLIO_SESSION);
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }));

    expect(
      await screen.findByText('¿Desde qué biblioteca ingresás?'),
    ).toBeInTheDocument();
    expect(localStorage.getItem('biblioteca_token')).toBe('tok-123');
    expect(JSON.parse(localStorage.getItem('biblioteca_session')!).campus).toBe(
      'nicoya',
    );
  });

  it('Cambiar de Campus entra directo al otro panel (jefa)', async () => {
    seedSession({ ...BIBLIO_SESSION, role: 'jefa' });
    render(<App />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cambiar de Campus' }),
    );

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('biblioteca_session')!).campus).toBe(
        'liberia',
      );
    });
    // Sigue en el panel, no cayó al inicio
    expect(
      screen.getByRole('button', { name: 'Cambiar de Campus' }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain('sede=liberia');
  });
});

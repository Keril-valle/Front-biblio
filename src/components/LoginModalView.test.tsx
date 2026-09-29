import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { LoginModalView } from './LoginModalView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);

const renderLogin = () =>
  render(
    <LoginModalView
      campusId="nicoya"
      onBackToSelector={vi.fn()}
      onLoginSuccess={vi.fn()}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginModalView — mostrar/ocultar contraseña', () => {
  it('alterna el tipo del campo y su etiqueta accesible', async () => {
    const user = userEvent.setup();
    renderLogin();

    const campo = screen.getByLabelText(/Contraseña/);
    expect(campo).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('button', { name: 'Mostrar contraseña' }),
    ).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Ocultar contraseña' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));

    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('al alternar no envía el formulario (es type="button")', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/Correo Institucional/), 'biblio');
    await user.type(screen.getByLabelText(/Contraseña/), 'Secreta123!');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(mockedApi.login).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Contraseña/)).toHaveValue('Secreta123!');
  });
});

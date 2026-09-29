import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { UserSession, UsuarioDto } from '../types';
import { UserManagementView } from './UserManagementView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);

const session: UserSession = {
  accessToken: 'tok',
  email: 'jefa@una.cr',
  role: 'jefa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Jefa Nicoya',
  userId: 'u-1',
};

const USUARIOS: UsuarioDto[] = [
  {
    id: 'u-1',
    nombreCompleto: 'Jefa Nicoya',
    email: 'jefa@una.cr',
    googleId: null,
    rol: 'jefa',
    sedeId: 1,
    activo: true,
  },
  {
    id: 'u-2',
    nombreCompleto: 'Biblio Nueva',
    email: 'biblio.nueva@una.cr',
    googleId: null,
    rol: 'bibliotecologa',
    sedeId: 1,
    activo: true,
  },
];

const filaDe = (nombre: string) => {
  const celda = screen.getByText(nombre);
  const fila = celda.closest('tr');
  if (!fila) throw new Error(`No encontré la fila de ${nombre}`);
  return fila;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.usuarios.mockResolvedValue(USUARIOS);
  mockedApi.desactivarUsuario.mockResolvedValue(USUARIOS[0] as UsuarioDto);
  mockedApi.actualizarUsuario.mockResolvedValue({
    ...(USUARIOS[1] as UsuarioDto),
    sedeId: 2,
  });
});

describe('UserManagementView — cambiar de campus', () => {
  it('ofrece la acción "Campus" en cada fila', async () => {
    render(<UserManagementView session={session} />);

    await screen.findByText('Biblio Nueva');
    expect(screen.getAllByRole('button', { name: 'Campus' })).toHaveLength(2);
  });

  it('mueve una cuenta al otro campus y la fila queda actualizada', async () => {
    const user = userEvent.setup();
    render(<UserManagementView session={session} />);

    await screen.findByText('Biblio Nueva');
    const fila = filaDe('Biblio Nueva');
    expect(within(fila).getByText('Nicoya (Nayuribe)')).toBeInTheDocument();

    await user.click(within(fila).getByRole('button', { name: 'Campus' }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/Biblio Nueva/)).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText(/Campus/), {
      target: { value: 'liberia' },
    });
    await user.click(
      within(dialogo).getByRole('button', { name: 'Guardar campus' }),
    );

    await waitFor(() => {
      expect(mockedApi.actualizarUsuario).toHaveBeenCalledWith('u-2', {
        sedeId: 2,
      });
    });

    // El modal se cierra y la fila refleja el campus nuevo.
    expect(screen.queryByRole('dialog')).toBeNull();
    const filaActualizada = filaDe('Biblio Nueva');
    expect(
      within(filaActualizada).getByText('Liberia (Rose Marie)'),
    ).toBeInTheDocument();
  });

  it('si el backend rechaza el cambio, muestra el error y no cierra el modal', async () => {
    mockedApi.actualizarUsuario.mockRejectedValue(
      new Error('La sede seleccionada no existe.'),
    );
    const user = userEvent.setup();
    render(<UserManagementView session={session} />);

    await screen.findByText('Biblio Nueva');
    await user.click(
      within(filaDe('Biblio Nueva')).getByRole('button', { name: 'Campus' }),
    );

    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/Campus/), {
      target: { value: 'liberia' },
    });
    await user.click(
      within(dialogo).getByRole('button', { name: 'Guardar campus' }),
    );

    expect(
      await screen.findByText('La sede seleccionada no existe.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('al editar la propia cuenta avisa que la sede de origen cambia', async () => {
    const user = userEvent.setup();
    render(<UserManagementView session={session} />);

    await screen.findByText('Jefa Nicoya');
    await user.click(
      within(filaDe('Jefa Nicoya')).getByRole('button', { name: 'Campus' }),
    );

    const dialogo = await screen.findByRole('dialog');
    expect(
      within(dialogo).getByText(/Esta es tu propia cuenta/),
    ).toBeInTheDocument();
  });

  it('sin cambios de campus no llama a la API', async () => {
    const user = userEvent.setup();
    render(<UserManagementView session={session} />);

    await screen.findByText('Biblio Nueva');
    await user.click(
      within(filaDe('Biblio Nueva')).getByRole('button', { name: 'Campus' }),
    );

    const dialogo = await screen.findByRole('dialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Guardar campus' }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedApi.actualizarUsuario).not.toHaveBeenCalled();
  });

  it('la contraseña temporal se puede mostrar y ocultar', async () => {
    const user = userEvent.setup();
    render(<UserManagementView session={session} />);

    await screen.findByText('Biblio Nueva');
    await user.click(screen.getByRole('button', { name: '+ Crear cuenta' }));

    expect(await screen.findByLabelText(/Contraseña Temporal/)).toHaveAttribute(
      'type',
      'password',
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText(/Contraseña Temporal/)).toHaveAttribute(
      'type',
      'text',
    );

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText(/Contraseña Temporal/)).toHaveAttribute(
      'type',
      'password',
    );
    // Alternar la visibilidad no debe enviar el formulario.
    expect(mockedApi.crearUsuario).not.toHaveBeenCalled();
  });
});

import { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeHeaderNav } from './HomeHeaderNav';
import { HeroSection } from './HeroSection';
import { FooterSection } from './FooterSection';
import { CampusSelector } from './CampusSelector';
import { SEDE_SELECTOR_ID } from '../utils/scrollToSelector';

const renderWithSelector = (ui: ReactElement) => {
  return render(
    <>
      <div id={SEDE_SELECTOR_ID}>selector</div>
      {ui}
    </>,
  );
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomeHeaderNav', () => {
  it('muestra la marca institucional sin duplicar títulos del hero', () => {
    render(<HomeHeaderNav />);
    expect(screen.getByText('Subsistema de Bibliotecas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText('Sistema de Estadísticas de Bibliotecas')).not.toBeInTheDocument();
    // Logo oficial de la UNA en el navbar.
    expect(screen.getByAltText(/Universidad Nacional de Costa Rica/i)).toHaveAttribute(
      'src',
      '/assets/Logo-UNA-Rojo_FondoTransparente.png',
    );
  });

  it('desplaza suavemente hasta el selector de biblioteca', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWithSelector(<HomeHeaderNav />);
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe('HeroSection', () => {
  it('muestra el titular principal y el CTA hacia el selector', () => {
    renderWithSelector(<HeroSection />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Sistema de estadísticas y atención al usuario/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegí tu biblioteca/i })).toBeInTheDocument();
  });

  it('el CTA desplaza hasta el selector de biblioteca', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWithSelector(<HeroSection />);
    await userEvent.click(screen.getByRole('button', { name: /Elegí tu biblioteca/i }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('conserva el logo del subsistema', () => {
    render(<HeroSection />);
    expect(screen.getByAltText(/Subsistema de Bibliotecas/i)).toBeInTheDocument();
  });

  it('menciona la Biblioteca de la Sede Regional Chorotega', () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/Biblioteca de\s+la Sede Regional Chorotega/),
    ).toBeInTheDocument();
  });
});

describe('CampusSelector', () => {
  it('muestra las dos tarjetas de biblioteca', () => {
    render(<CampusSelector onSelectCampus={() => {}} />);
    expect(screen.getByText('Biblioteca Nayuribe')).toBeInTheDocument();
    expect(screen.getByText('Biblioteca Rose Marie Ruiz Bravo')).toBeInTheDocument();
  });

  it('selecciona el campus al hacer clic en la tarjeta', async () => {
    const onSelectCampus = vi.fn();
    render(<CampusSelector onSelectCampus={onSelectCampus} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Ingresar a Biblioteca Nayuribe/i }),
    );
    expect(onSelectCampus).toHaveBeenCalledWith('nicoya');
  });

  it('selecciona el campus con la tecla enter en la tarjeta', () => {
    const onSelectCampus = vi.fn();
    render(<CampusSelector onSelectCampus={onSelectCampus} />);
    const card = screen.getByRole('button', { name: /Ingresar a Biblioteca Rose Marie Ruiz Bravo/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelectCampus).toHaveBeenCalledWith('liberia');
  });

  it('permite entrar desde el botón de la tarjeta', async () => {
    const onSelectCampus = vi.fn();
    render(<CampusSelector onSelectCampus={onSelectCampus} />);
    const buttons = screen.getAllByRole('button', { name: /Entrar al sistema/i });
    await userEvent.click(buttons[1]);
    expect(onSelectCampus).toHaveBeenCalledWith('liberia');
  });

  it('rotula el acceso como sistema estadístico', () => {
    render(<CampusSelector onSelectCampus={() => {}} />);
    expect(screen.getByText('Acceso al sistema estadístico')).toBeInTheDocument();
  });
});

describe('FooterSection', () => {
  it('muestra las dos bibliotecas y el copyright institucional', () => {
    render(<FooterSection />);
    expect(screen.getByText('Biblioteca Nayuribe')).toBeInTheDocument();
    expect(screen.getByText('Biblioteca Rose Marie Ruiz Bravo')).toBeInTheDocument();
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
  });

  it('usa el término campus en el texto visible', () => {
    render(<FooterSection />);
    expect(screen.getAllByText(/Campus Regional Chorotega/i).length).toBeGreaterThan(0);
  });

  it('usa SIDUNA, el logo UNA y menciona la Sede Región Chorotega', () => {
    render(<FooterSection />);
    expect(screen.getByText(/SIDUNA/)).toBeInTheDocument();
    expect(screen.queryByText(/SIBUNA/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sede\s+Región Chorotega/)).toBeInTheDocument();
    expect(screen.getByAltText(/Universidad Nacional de Costa Rica/i)).toHaveAttribute(
      'src',
      '/assets/Logo-UNA-Rojo_FondoTransparente.png',
    );
  });

  it('muestra los correos de contacto de cada campus', () => {
    render(<FooterSection />);
    expect(screen.getByText('binicoya@una.cr')).toBeInTheDocument();
    expect(screen.getByText('biliberia@una.cr')).toBeInTheDocument();
  });
});
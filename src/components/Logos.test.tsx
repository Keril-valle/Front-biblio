import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryLogo } from './LibraryLogos';
import { SubsistemaLogo } from './SubsistemaLogo';

describe('LibraryLogo', () => {
  it('usa el PNG transparente del Campus Nicoya', () => {
    render(<LibraryLogo campusId="nicoya" />);
    const img = screen.getByAltText(/Nayuribe/i);
    expect(img).toHaveAttribute('src', '/assets/logo-nayuribe.png');
  });

  it('usa el PNG transparente del Campus Liberia', () => {
    render(<LibraryLogo campusId="liberia" />);
    const img = screen.getByAltText(/Rose Marie/i);
    expect(img).toHaveAttribute('src', '/assets/logo-rose-marie.png');
  });
});

describe('SubsistemaLogo', () => {
  it('usa el PNG transparente del subsistema', () => {
    render(<SubsistemaLogo />);
    const img = screen.getByAltText(/Subsistema de Bibliotecas/i);
    expect(img).toHaveAttribute(
      'src',
      '/assets/logo-subsistema-bibliotecas.png',
    );
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast, type ToastItem } from './Toast';

const toast: ToastItem = { id: 1, tone: 'success', message: 'Registro guardado correctamente.' };

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('no muestra ningún aviso cuando no hay notificación', () => {
    render(<Toast toast={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['success', 'Operación exitosa'],
    ['info', 'Información'],
    ['error', 'No se pudo completar la acción'],
  ] as const)('muestra %s con fondo sólido en un portal y permite cerrarlo', (tone, titulo) => {
    const onClose = vi.fn();
    const { container } = render(<Toast toast={{ ...toast, tone }} onClose={onClose} />);
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveAttribute('aria-live', 'polite');
    expect(aviso).toHaveAttribute('aria-atomic', 'true');
    expect(aviso).toHaveTextContent(titulo);
    expect(aviso).toHaveTextContent(toast.message);
    expect(aviso.firstElementChild).toHaveClass('bg-[var(--surface-white)]');
    expect(container).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reinicia la duración con un nuevo aviso y limpia el temporizador al desmontar', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender, unmount } = render(<Toast toast={toast} durationMs={5000} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(4000));
    expect(onClose).not.toHaveBeenCalled();
    rerender(<Toast toast={{ ...toast, id: 2 }} durationMs={5000} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(4000));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<Toast toast={{ ...toast, id: 3 }} durationMs={5000} onClose={onClose} />);
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

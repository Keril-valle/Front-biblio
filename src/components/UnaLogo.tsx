import React from 'react';

interface UnaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<UnaLogoProps['size']>, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
};

/**
 * Logo oficial de la Universidad Nacional (rojo sobre fondo transparente).
 * Reutiliza el recurso de `public/assets` para el navbar y el footer.
 */
export const UnaLogo: React.FC<UnaLogoProps> = ({ className = '', size = 'md' }) => {
  return (
    <img
      src="/assets/Logo-UNA-Rojo_FondoTransparente.png"
      alt="Logo Universidad Nacional de Costa Rica"
      className={`${SIZE_CLASSES[size]} w-auto shrink-0 select-none ${className}`}
    />
  );
};

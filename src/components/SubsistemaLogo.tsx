import React from 'react';

interface SubsistemaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<SubsistemaLogoProps['size']>, string> = {
  sm: 'w-48',
  md: 'w-72',
  lg: 'w-96',
};

export const SubsistemaLogo: React.FC<SubsistemaLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src="/assets/logo-subsistema-bibliotecas.jpg"
        alt="Logo oficial Subsistema de Bibliotecas — Universidad Nacional, Sede Regional Chorotega"
        className={`${SIZE_CLASSES[size]} max-w-full h-auto drop-shadow-sm transition-transform duration-300 hover:scale-[1.01]`}
      />
    </div>
  );
};

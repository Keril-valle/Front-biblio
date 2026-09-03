import React from 'react';

interface LibraryLogoProps {
  campusId: 'nicoya' | 'liberia';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<LibraryLogoProps['size']>, string> = {
  sm: 'w-24',
  md: 'w-48',
  lg: 'w-64',
};

const LOGO_SRC: Record<LibraryLogoProps['campusId'], { src: string; alt: string }> = {
  nicoya: {
    src: '/assets/logo-nayuribe.jpg',
    alt: 'Logo oficial Biblioteca Nayuribe — Sede Regional Chorotega, UNA',
  },
  liberia: {
    src: '/assets/logo-rose-marie.jpg',
    alt: 'Logo oficial Biblioteca Rose Marie Ruiz Bravo — Sede Regional Chorotega, UNA',
  },
};

export const LibraryLogo: React.FC<LibraryLogoProps> = ({ campusId, className = '', size = 'md' }) => {
  const { src, alt } = LOGO_SRC[campusId];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`${SIZE_CLASSES[size]} max-w-full h-auto drop-shadow-xs transition-transform duration-300 hover:scale-[1.02]`}
      />
    </div>
  );
};

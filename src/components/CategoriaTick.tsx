import React from 'react';

// Truncamiento de etiquetas largas del eje de categorías: los nombres de
// categoría y de empleada pasan de 26 caracteres con frecuencia y sin
// truncado se solapan en el gráfico.
export const MAX_LABEL_LENGTH = 26;

interface CategoriaTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

/**
 * Tick del eje Y para nombres de categoría o empleada: trunca con ellipsis
 * los nombres muy largos y expone el nombre completo vía tooltip nativo
 * (<title>).
 */
export const CategoriaTick: React.FC<CategoriaTickProps> = ({
  x = 0,
  y = 0,
  payload,
}) => {
  const nombre = payload?.value ?? '';
  const etiqueta =
    nombre.length > MAX_LABEL_LENGTH
      ? `${nombre.slice(0, MAX_LABEL_LENGTH - 1)}…`
      : nombre;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={0} dy={4} textAnchor="end" fontSize={11} fill="#585757">
        {etiqueta}
        <title>{nombre}</title>
      </text>
    </g>
  );
};

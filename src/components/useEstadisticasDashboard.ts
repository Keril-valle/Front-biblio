import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  CategoriaDto,
  CicloDto,
  ComposicionDto,
  KpisDto,
  ModuloDto,
} from '../types';
import {
  agruparPorAnio,
  agruparPorCampus,
  agruparPorCiclo,
  type BarChartDataItem,
} from '../utils/estadisticas';

export type ModoComparacion = 'ciclos' | 'anual' | 'campus';
export type EstadoSeccion = 'cargando' | 'listo' | 'vacio' | 'error';

export interface UseEstadisticasDashboardResult {
  ciclos: CicloDto[];
  modulos: ModuloDto[];
  categorias: CategoriaDto[];
  anios: number[];
  cicloId: number | '';
  moduloId: number | '';
  sedeId: number | '';
  comparisonMode: ModoComparacion;
  setCicloId: (v: number | '') => void;
  setModuloId: (v: number | '') => void;
  setSedeId: (v: number | '') => void;
  setComparisonMode: (m: ModoComparacion) => void;
  kpis: KpisDto;
  estadoKpis: EstadoSeccion;
  barData: BarChartDataItem[];
  estadoComparativo: EstadoSeccion;
  totalesComparativo: Record<string, number>;
  composition: ComposicionDto[];
  estadoComposicion: EstadoSeccion;
}

const esAborto = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

// Un solo flujo de datos por combinación de filtros: el catálogo, el panel de
// KPIs + composición y el comparativo comparten la misma lógica de cancelación
// (AbortController + id de petición) para que ninguna respuesta obsoleta
// sobrescriba la vista cuando el usuario cambia rápido de filtros.
export function useEstadisticasDashboard(
  role: 'bibliotecologa' | 'jefa' | 'jefatura',
): UseEstadisticasDashboardResult {
  const isJefatura = role === 'jefa' || role === 'jefatura';

  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [moduloId, setModuloId] = useState<number | ''>('');
  const [sedeId, setSedeId] = useState<number | ''>('');
  const [comparisonMode, setComparisonMode] = useState<ModoComparacion>('ciclos');

  const [kpis, setKpis] = useState<KpisDto>({ totalAtenciones: 0, totalPersonas: 0 });
  const [estadoKpis, setEstadoKpis] = useState<EstadoSeccion>('cargando');
  const [barData, setBarData] = useState<BarChartDataItem[]>([]);
  const [estadoComparativo, setEstadoComparativo] = useState<EstadoSeccion>('cargando');
  const [totalesComparativo, setTotalesComparativo] = useState<Record<string, number>>({});
  const [composition, setComposition] = useState<ComposicionDto[]>([]);
  const [estadoComposicion, setEstadoComposicion] = useState<EstadoSeccion>('cargando');

  // Identificadores de petición y controladores para cancelar lo obsoleto.
  const idPanel = useRef(0);
  const idComparativo = useRef(0);
  const abortPanel = useRef<AbortController | null>(null);
  const abortComparativo = useRef<AbortController | null>(null);

  // Años lectivos disponibles (para el modo "anual"), derivados de los ciclos.
  const anios = useMemo(
    () =>
      Array.from(new Set<number>(ciclos.map((c) => c.anio))).sort(
        (a: number, b: number) => a - b,
      ),
    [ciclos],
  );

  // Catálogo inicial: ciclos, módulos y categorías; por defecto se muestra el
  // ciclo vigente (no el primero de la lista) para que los KPIs coincidan con
  // el banner del dashboard.
  useEffect(() => {
    let activo = true;
    Promise.all([api.ciclos(), api.modulos(), api.categorias()])
      .then(([cic, mods, cats]) => {
        if (!activo) return;
        setCiclos(cic);
        setModulos(mods);
        setCategorias(cats);
        const primerCiclo = cic[0];
        if (primerCiclo) setCicloId(primerCiclo.id);
        api
          .cicloActual()
          .then((actual) => {
            if (activo && cic.some((c) => c.id === actual.id)) setCicloId(actual.id);
          })
          .catch(() => {
            // sin ciclo vigente: se conserva el primero
          });
      })
      .catch(() => {
        // sin catálogo: el dashboard queda en estado de carga
      });
    return () => {
      activo = false;
    };
  }, []);

  // Panel de KPIs + composición: una sola fase cancelable por combinación de
  // filtros (ciclo/módulo/campus). Cada sección tiene su propio estado.
  useEffect(() => {
    if (cicloId === '') return;

    const id = (idPanel.current += 1);
    const controller = new AbortController();
    abortPanel.current?.abort();
    abortPanel.current = controller;

    setEstadoKpis('cargando');
    setEstadoComposicion('cargando');

    const cid = Number(cicloId);
    const mid = moduloId === '' ? undefined : Number(moduloId);
    const sid = sedeId === '' ? undefined : Number(sedeId);

    api
      .kpis(cid, sid, mid, controller.signal)
      .then((k) => {
        if (id !== idPanel.current) return;
        setKpis(k);
        setEstadoKpis('listo');
      })
      .catch((error: unknown) => {
        if (id !== idPanel.current || esAborto(error)) return;
        setEstadoKpis('error');
      });

    api
      .composicion(cid, mid, sid, controller.signal)
      .then((comp) => {
        if (id !== idPanel.current) return;
        setComposition(comp);
        setEstadoComposicion(comp.length === 0 ? 'vacio' : 'listo');
      })
      .catch((error: unknown) => {
        if (id !== idPanel.current || esAborto(error)) return;
        setEstadoComposicion('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cicloId, moduloId, sedeId]);

  // Comparativo por categoría según el modo (ciclos vs campus vs anual). El
  // modo campus solo aplica con "Ambos campus"; con un campus filtrado cae al
  // modo por ciclos (el selector también lo restablece desde la UI).
  useEffect(() => {
    if (cicloId === '' || ciclos.length === 0) return;

    const modoEfectivo: ModoComparacion =
      comparisonMode === 'campus' && sedeId !== '' ? 'ciclos' : comparisonMode;
    if (modoEfectivo === 'campus' && !isJefatura) return;

    const id = (idComparativo.current += 1);
    const controller = new AbortController();
    abortComparativo.current?.abort();
    abortComparativo.current = controller;

    setEstadoComparativo('cargando');

    const cid = Number(cicloId);
    const mid = moduloId === '' ? undefined : Number(moduloId);
    const sid = sedeId === '' ? undefined : Number(sedeId);

    const aplicar = (resultado: {
      datos: BarChartDataItem[];
      totales: Record<string, number>;
    }) => {
      if (id !== idComparativo.current) return;
      setBarData(resultado.datos);
      setTotalesComparativo(resultado.totales);
      setEstadoComparativo(resultado.datos.length === 0 ? 'vacio' : 'listo');
    };

    const fallar = (error: unknown) => {
      if (id !== idComparativo.current || esAborto(error)) return;
      setBarData([]);
      setTotalesComparativo({});
      setEstadoComparativo('error');
    };

    if (modoEfectivo === 'ciclos') {
      Promise.all(
        ciclos.map(async (c) => ({
          ciclo: c,
          rows: await api.porCategoria(c.id, mid, sid, controller.signal),
        })),
      )
        .then((rowsPorCiclo) => aplicar(agruparPorCiclo(rowsPorCiclo)))
        .catch(fallar);
    } else if (modoEfectivo === 'campus') {
      Promise.all([
        api.porCategoria(cid, mid, 1, controller.signal),
        api.porCategoria(cid, mid, 2, controller.signal),
      ])
        .then(([rowsNicoya, rowsLiberia]) =>
          aplicar(agruparPorCampus(rowsNicoya, rowsLiberia)),
        )
        .catch(fallar);
    } else {
      api
        .porAnio(mid, sid, undefined, controller.signal)
        .then((rows) => aplicar(agruparPorAnio(rows, anios)))
        .catch(fallar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonMode, cicloId, moduloId, sedeId, ciclos]);

  // Al desmontar, se aborta cualquier petición pendiente.
  useEffect(() => {
    return () => {
      abortPanel.current?.abort();
      abortComparativo.current?.abort();
    };
  }, []);

  return {
    ciclos,
    modulos,
    categorias,
    anios,
    cicloId,
    moduloId,
    sedeId,
    comparisonMode,
    setCicloId,
    setModuloId,
    setSedeId,
    setComparisonMode,
    kpis,
    estadoKpis,
    barData,
    estadoComparativo,
    totalesComparativo,
    composition,
    estadoComposicion,
  };
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type FiltrosEstadisticaEmpleado } from '../api/client';
import type {
  CategoriaDto,
  CicloDto,
  ModuloDto,
  PorEmpleadoDesgloseDto,
  PorEmpleadoDto,
} from '../types';

export type ModoPersonal = 'general' | 'personal';
export type PeriodoPersonal = 'ciclo' | 'anio' | 'rango';
export type EstadoSeccion = 'cargando' | 'listo' | 'vacio' | 'error';

const esAborto = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Estadística por empleado (solo jefatura): ranking del campus activo y
 * desglose de la empleada seleccionada.
 *
 * Reproduce el patrón de `useEstadisticasDashboard`: un AbortController y un
 * id de petición por flujo para que ninguna respuesta obsoleta sobrescriba la
 * vista cuando la jefa cambia rápido de filtros. El modo y la selección viven
 * fuera de los efectos para persistir al alternar el toggle.
 */
export function useEstadisticasPersonal(campusId: number) {
  // Catálogo inicial: ciclos, módulos y categorías.
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);

  // Período y filtros.
  const [periodo, setPeriodo] = useState<PeriodoPersonal>('ciclo');
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [anio, setAnio] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [moduloId, setModuloId] = useState<number | ''>('');
  const [categoriaId, setCategoriaId] = useState<number | ''>('');

  // Toggle y selección: persisten al cambiar de modo.
  const [modo, setModo] = useState<ModoPersonal>('general');
  const [seleccion, setSeleccion] = useState<string | null>(null);

  // Resultados.
  const [ranking, setRanking] = useState<PorEmpleadoDto[]>([]);
  const [estadoRanking, setEstadoRanking] = useState<EstadoSeccion>('cargando');
  const [desglose, setDesglose] = useState<PorEmpleadoDesgloseDto | null>(null);
  const [estadoDesglose, setEstadoDesglose] = useState<EstadoSeccion>(
    'cargando',
  );

  const idRanking = useRef(0);
  const idDesglose = useRef(0);
  const abortRanking = useRef<AbortController | null>(null);
  const abortDesglose = useRef<AbortController | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([api.ciclos(), api.modulos(), api.categorias()])
      .then(([cic, mods, cats]) => {
        if (!activo) return;
        setCiclos(cic);
        setModulos(mods);
        setCategorias(cats);
        if (cic[0]) setCicloId(cic[0].id);
        api
          .cicloActual()
          .then((actual) => {
            if (activo && cic.some((c) => c.id === actual.id)) {
              setCicloId(actual.id);
            }
          })
          .catch(() => {
            // sin ciclo vigente: se conserva el primero
          });
      })
      .catch(() => {
        // sin catálogo: la sección queda en estado de carga
      });
    return () => {
      activo = false;
    };
  }, []);

  // Al cambiar de módulo, el filtro de categoría se reinicia: no puede quedar
  // seleccionada una categoría de otro módulo.
  useEffect(() => {
    setCategoriaId('');
  }, [moduloId]);

  // Años lectivos disponibles, derivados de los ciclos.
  const anios = useMemo(
    () =>
      Array.from(new Set<number>(ciclos.map((c) => c.anio))).sort(
        (a: number, b: number) => a - b,
      ),
    [ciclos],
  );

  // Un rango invertido (desde posterior a hasta) bloquea las consultas: la
  // validación ocurre también en el backend, pero la UI no lo pide.
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const filtros: FiltrosEstadisticaEmpleado = useMemo(
    () => ({
      sedeId: campusId,
      cicloId: periodo === 'ciclo' && cicloId !== '' ? Number(cicloId) : undefined,
      anio: periodo === 'anio' && anio !== '' ? Number(anio) : undefined,
      desde: periodo === 'rango' && desde ? desde : undefined,
      hasta: periodo === 'rango' && hasta ? hasta : undefined,
      moduloId: moduloId === '' ? undefined : Number(moduloId),
      categoriaId: categoriaId === '' ? undefined : Number(categoriaId),
    }),
    [campusId, periodo, cicloId, anio, desde, hasta, moduloId, categoriaId],
  );

  // El ranking espera a que cargue el ciclo solo en modo ciclo; en año y
  // rango libre no hace falta ningún ciclo.
  const listoParaRanking =
    !rangoInvalido && (periodo !== 'ciclo' || cicloId !== '');

  // Ranking del campus: se pide siempre (el modo General lo muestra y el
  // Personal específico lo usa para las tarjetas y la marca del ranking).
  useEffect(() => {
    if (!listoParaRanking) return;

    const id = (idRanking.current += 1);
    const controller = new AbortController();
    abortRanking.current?.abort();
    abortRanking.current = controller;

    setEstadoRanking('cargando');
    api
      .porEmpleado(filtros, controller.signal)
      .then((filas) => {
        if (id !== idRanking.current) return;
        setRanking(filas);
        setEstadoRanking(filas.length === 0 ? 'vacio' : 'listo');
      })
      .catch((error: unknown) => {
        if (id !== idRanking.current || esAborto(error)) return;
        setEstadoRanking('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, listoParaRanking]);

  // Desglose solo en modo Personal específico con una empleada elegida.
  const listoParaDesglose = listoParaRanking && modo === 'personal' && seleccion !== null;

  useEffect(() => {
    if (!listoParaDesglose || !seleccion) {
      setDesglose(null);
      return;
    }

    const id = (idDesglose.current += 1);
    const controller = new AbortController();
    abortDesglose.current?.abort();
    abortDesglose.current = controller;

    setEstadoDesglose('cargando');
    api
      .porEmpleadoDesglose(
        { ...filtros, usuarioId: seleccion },
        controller.signal,
      )
      .then((resultado) => {
        if (id !== idDesglose.current) return;
        setDesglose(resultado);
        setEstadoDesglose(resultado.filas.length === 0 ? 'vacio' : 'listo');
      })
      .catch((error: unknown) => {
        if (id !== idDesglose.current || esAborto(error)) return;
        setEstadoDesglose('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, listoParaDesglose, seleccion]);

  // Al entrar a Personal específico sin selección, se elige la primera fila
  // del ranking para que el desglose nunca aparezca vacío por defecto; si el
  // ranking está vacío, el desglose se muestra como tal.
  useEffect(() => {
    if (modo === 'personal' && seleccion === null) {
      if (ranking.length > 0) setSeleccion(ranking[0].usuarioId);
      else if (estadoRanking === 'vacio') setEstadoDesglose('vacio');
    }
  }, [modo, seleccion, ranking, estadoRanking]);

  // Al desmontar, se aborta cualquier petición pendiente.
  useEffect(() => {
    return () => {
      abortRanking.current?.abort();
      abortDesglose.current?.abort();
    };
  }, []);

  return {
    ciclos,
    modulos,
    categorias,
    anios,
    periodo,
    cicloId,
    anio,
    desde,
    hasta,
    moduloId,
    categoriaId,
    modo,
    seleccion,
    rangoInvalido,
    setPeriodo,
    setCicloId,
    setAnio,
    setDesde,
    setHasta,
    setModuloId,
    setCategoriaId,
    setModo,
    setSeleccion,
    ranking,
    estadoRanking,
    desglose,
    estadoDesglose,
  };
}

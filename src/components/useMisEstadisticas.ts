import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type FiltrosEstadisticaEmpleado } from '../api/client';
import type {
  CategoriaDto,
  CicloDto,
  ModuloDto,
  PorEmpleadoDesgloseDto,
} from '../types';
import type { EstadoSeccion, PeriodoPersonal } from './useEstadisticasPersonal';

const esAborto = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Filtros y consulta de las estadísticas privadas de la bibliotecóloga.
 * No recibe id de usuario ni sede: el endpoint los fija desde el JWT.
 */
export function useMisEstadisticas() {
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoPersonal>('ciclo');
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [anio, setAnio] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [moduloId, setModuloId] = useState<number | ''>('');
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [resultado, setResultado] = useState<PorEmpleadoDesgloseDto | null>(null);
  const [estado, setEstado] = useState<EstadoSeccion>('cargando');
  const idPeticion = useRef(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([api.ciclos(), api.modulos(), api.categorias()])
      .then(([ciclosApi, modulosApi, categoriasApi]) => {
        if (!activo) return;
        setCiclos(ciclosApi);
        setModulos(modulosApi);
        setCategorias(categoriasApi);
        if (ciclosApi[0]) setCicloId(ciclosApi[0].id);
        api
          .cicloActual()
          .then((actual) => {
            if (activo && ciclosApi.some((c) => c.id === actual.id)) {
              setCicloId(actual.id);
            }
          })
          .catch(() => undefined);
      })
      .catch(() => setEstado('error'));
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => setCategoriaId(''), [moduloId]);

  const anios = useMemo(
    () =>
      Array.from(new Set<number>(ciclos.map((c) => c.anio))).sort(
        (a: number, b: number) => a - b,
      ),
    [ciclos],
  );
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const filtros: Omit<FiltrosEstadisticaEmpleado, 'sedeId'> = useMemo(
    () => ({
      cicloId: periodo === 'ciclo' && cicloId !== '' ? cicloId : undefined,
      anio: periodo === 'anio' && anio !== '' ? anio : undefined,
      desde: periodo === 'rango' && desde ? desde : undefined,
      hasta: periodo === 'rango' && hasta ? hasta : undefined,
      moduloId: moduloId === '' ? undefined : moduloId,
      categoriaId: categoriaId === '' ? undefined : categoriaId,
    }),
    [periodo, cicloId, anio, desde, hasta, moduloId, categoriaId],
  );
  const listo = !rangoInvalido && (periodo !== 'ciclo' || cicloId !== '');

  useEffect(() => {
    if (!listo) return;
    const id = ++idPeticion.current;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setEstado('cargando');

    api
      .misEstadisticas(filtros, controller.signal)
      .then((datos) => {
        if (id !== idPeticion.current) return;
        setResultado(datos);
        setEstado(datos.filas.length === 0 ? 'vacio' : 'listo');
      })
      .catch((error: unknown) => {
        if (id !== idPeticion.current || esAborto(error)) return;
        setEstado('error');
      });
  }, [filtros, listo]);

  useEffect(() => () => abort.current?.abort(), []);

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
    resultado,
    estado,
    rangoInvalido,
    setPeriodo,
    setCicloId,
    setAnio,
    setDesde,
    setHasta,
    setModuloId,
    setCategoriaId,
  };
}

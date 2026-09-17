# Front — Sistema de Estadísticas, Bibliotecas Sede Regional Chorotega (UNA)

Frontend React 19 + Vite 6 + Tailwind CSS 4 + Recharts. Habla contra el backend NestJS (`/api`). Terminología visible: **"campus"** (Campus Nicoya, Campus Liberia, Ambos Campus), nunca "sede".

## Vistas

Landing (ambas bibliotecas + selector de campus) · Login (`/auth/login`, sesión en `localStorage`) · Registro rápido (categorías/ciclos reales, campo personas si `tipoMetrica=doble`, aviso del campus donde se guarda) · Dashboard (KPIs, modos I/II Ciclo, Campus —solo jefa con Ambos Campus—, Anual; línea de totales por modo) · Usuarios / Categorías / Ciclos / Reportes (solo jefa; PDF+Excel con membrete UNA opcional).

## Desarrollo local

```bash
pnpm install
pnpm run dev           # http://localhost:5173
```

En dev no hace falta `.env`: sin `VITE_API_URL` se usa `/api` relativo y el proxy de `vite.config.ts` lo lleva al back local. Para apuntar a otro backend, crear un `.env` con `VITE_API_URL=https://tu-backend` (el cliente agrega `/api` solo).

En dev, si `VITE_API_URL` no está definida se usa `/api` relativo y el proxy de `vite.config.ts` lo lleva al back local.

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base del backend **sin** `/api` final (ej. `https://back.midominio.cr`). Obligatoria en el build de producción/staging; en dev es opcional por el proxy. |

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm run dev` | Vite dev + proxy `/api` |
| `pnpm run build` / `preview` | Build prod / previsualizar `dist/` |
| `pnpm run lint` | `tsc --noEmit` (typecheck) |
| `pnpm run test` / `test:coverage` | Vitest / con cobertura |

## Despliegue

Build estático (`dist/`). En Netlify definir `VITE_API_URL` con la URL pública del backend (Railway) antes de compilar; cada cambio de backend exige rebuild. El `FRONTEND_URL` del backend debe incluir el dominio del front (CORS).

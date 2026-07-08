# Torneos de Ajedrez - Grand Prix (v2.0)

Sistema de gestión para liga de ajedrez infantil en formato Grand Prix con torneos Suizos diarios.

## Novedades en v2.0 (Grand Prix)

- **Liga Global (Grand Prix):** Los jugadores se mantienen en un registro global y acumulan "Puntos Grand Prix" por sus resultados en cada torneo diario.
- **Formato Suizo:** Los torneos diarios ahora utilizan el Sistema Suizo. Esto permite emparejar dinámicamente a los jugadores según su nivel actual en el torneo sin requerir que todos asistan a todas las rondas, manejando los "Descansos" (Byes) automáticamente si hay un número impar de jugadores.
- **Puntuación del Grand Prix:** Al finalizar cada torneo diario, se reparten puntos a la liga global:
  - 1º Lugar: 10 pts
  - 2º Lugar: 8 pts
  - 3º Lugar: 6 pts
  - 4º Lugar: 4 pts
  - 5º Lugar: 2 pts
  - Demás participantes: 1 pt (por asistencia).

## Requisitos

- Node.js (v18 o superior recomendado)
- Base de datos Turso (LibSQL)
- Variables de entorno `.env`:
  - `DATABASE_URL=libsql://tu-base-de-datos.turso.io`
  - `DATABASE_AUTH_TOKEN=tu-token`

## Instalación y Ejecución

1. `npm install`
2. `npm run db:init` (Cuidado: Esto borrará la base de datos y la reiniciará desde cero)
3. `npm run build:local` para compilar el frontend y backend.
4. `npm start` para producción o `npm run dev:backend` / `npm run dev:frontend` para desarrollo local.

*(Nota: La versión 1.x (Round Robin) se encuentra preservada en el tag `v1` de Git).*

# ChessLeague 👑 — Gestión de Torneos de Ajedrez

> **Versión 1.1.0 — "Rey de Tablas"** · Versión estable (Final v1) 🟢

Una aplicación web moderna y premium para la administración y visualización de torneos de ajedrez estilo **Liga Round Robin**. Permite gestionar emparejamientos con colores balanceados, registrar resultados en tiempo real, compartir torneos públicamente y mantener una clasificación oficial con desempate Sonneborn-Berger.

---

## ✨ Características de la v1.1.0

### 🏆 Torneos Round Robin
- Modalidad de **una vuelta** (cada par juega una vez, colores balanceados algorítmicamente) o **doble vuelta** (ida y vuelta, blancas y negras contra cada oponente).
- Generación automática de emparejamientos con el **algoritmo de Berger**.
- Posibilidad de **volver a sortear** las rondas limpiando los resultados anteriores.

### 👤 Gestión de Jugadores
- Registro de nombre y **edad** de cada participante.
- **Edición inline** de jugadores en modo administrador.
- **Adición de jugadores a mitad del torneo** sin alterar las partidas ya registradas (se generan rondas de recuperación automáticamente).

### 🔒 Seguridad por Torneo
- Cada torneo tiene una **clave de administración** elegida al crearlo.
- La validación es **100% del lado del servidor** — ingresar una clave incorrecta no desbloquea ningún control.
- Los espectadores pueden ver resultados y clasificaciones sin clave.
- La clave se guarda en `localStorage` para quienes son creadores del torneo.

### 🔗 Compartir Torneos
- Botón **"Compartir"** que copia un enlace directo `?t=<id>` al portapapeles.
- El enlace carga el torneo directamente al abrir la app, sin navegación adicional.

### 📤 Respaldo y Restauración
- **Exportar**: descarga un archivo `.json` con todos los datos del torneo (jugadores, rondas, partidas, resultados).
- **Restaurar**: sube un archivo `.json` previamente exportado para recrear el torneo con nuevos IDs y una clave de admin nueva.

### 🗃️ Archivar Torneos
- Los torneos pueden **archivarse** desde el panel de admin — desaparecen del lobby principal sin eliminarse.
- El lobby tiene un toggle **Activos / Archivados** para encontrar los torneos archivados.
- Desde un torneo archivado se puede **restaurar** a la lista activa.

### 🗑️ Eliminar Torneos
- Botón de eliminación disponible **dentro del torneo**, en modo admin, en la "Zona de peligro".
- Doble confirmación antes de ejecutar. La operación es permanente e irreversible.

### 📈 Clasificación en Tiempo Real
- Tabla de posiciones calculada dinámicamente con criterios oficiales:
  - **Puntos** (1 = victoria, 0.5 = tablas, 0 = derrota).
  - **Sonneborn-Berger (SB)** como criterio de desempate.
  - Detalle de Ganadas / Tablas / Perdidas / Partidas Jugadas.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18, Vite 5, TypeScript, CSS puro |
| **Backend** | Node.js, Express 4, TypeScript |
| **Base de Datos** | Turso (LibSQL) via `@libsql/client` |
| **Iconos** | Lucide React |
| **Despliegue** | Hostinger (Node.js) + GitHub (CI/CD automático) |

---

## ⚙️ Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Hesiquio/torneos_ajedrez.git
cd torneos_ajedrez
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz basándote en `.env.example`:
```env
DATABASE_URL=libsql://tu-base-de-datos.turso.io
DATABASE_AUTH_TOKEN=tu-auth-token-aqui
PORT=3001
```

### 4. Inicializar la Base de Datos
Crea las tablas en tu base de datos Turso (solo la primera vez):
```bash
npm run db:init
```

> ⚠️ Este comando hace un `DROP TABLE` antes de crear. No ejecutes en producción con datos reales.

---

## 🚀 Ejecución en Desarrollo

```bash
# Terminal 1 — API
npm run dev:backend

# Terminal 2 — Frontend (Vite HMR)
npm run dev:frontend
```

---

## 📦 Compilación para Producción

```bash
# Compila frontend (→ dist/) y servidor (→ dist-server/)
npm run build:local
```

---

## 🌐 Despliegue en Hostinger

1. Conecta tu repositorio de GitHub en el panel de Hostinger (Node.js App).
2. Configura las variables de entorno en el panel de Hostinger:
   - `DATABASE_URL`
   - `DATABASE_AUTH_TOKEN`
   - `NODE_ENV=production`
3. Asegúrate de que el **archivo de inicio** apunte a:
   ```
   dist-server/index.js
   ```
4. El servidor aplica migraciones de base de datos automáticamente al arrancar (columnas nuevas se agregan sin perder datos).

---

## 📌 Historial de Versiones

| Versión | Nombre | Descripción |
|---|---|---|
| **v1.1.0** 🟢 | **Rey de Tablas** | Versión estable. Backup/Restauración, Archivar torneos, Eliminar desde panel admin, Verificación de clave admin en servidor, Edición de jugadores, toggle Activos/Archivados en lobby. |
| v1.0.0 | Jaque Inicial | Primera versión funcional: Round Robin, registro de resultados, clasificación SB, compartir torneos, agregar jugadores mid-torneo. |

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados © 2025 Hesiquio Zarate Landa.

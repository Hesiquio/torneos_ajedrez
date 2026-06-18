# ChessLeague 🏆 - Gestión de Torneos de Ajedrez

Una aplicación web moderna y premium para la administración y visualización de torneos de ajedrez estilo Liga (Round Robin). La aplicación está integrada con la base de datos distribuida **Turso (LibSQL)** y cuenta con un sistema híbrido de roles (Modo Espectador / Administrador).

## Características principales

* 🛠️ **Configuración flexible de Rondas**: Soporte para enfrentamientos a **Una Vuelta** (ida única con colores balanceados) o **Doble Vuelta** (ida y vuelta jugando con blancas y negras contra cada oponente).
* 🔒 **Seguridad por Torneo**: Cada torneo se crea con una clave de administración. Cualquier persona puede ver el torneo, pero solo quien introduzca la clave correcta podrá editar los resultados, agregar jugadores o iniciarlo.
* ➕ **Adición de Jugadores Mid-Tournament**: Es posible incorporar nuevos competidores a mitad del torneo de forma segura sin alterar las partidas ya jugadas y sus resultados.
* 📈 **Clasificación en Vivo**: Puntos actualizados al instante con criterios oficiales de desempate en ajedrez (**Sonneborn-Berger**).
* 🎨 **Interfaz Premium**: Diseño visual en modo oscuro con paleta en tonos pizarra y oro, responsivo y con micro-animaciones fluidas.

---

## Stack Tecnológico

* **Frontend**: React, Vite, TypeScript, CSS puro (diseño a medida).
* **Backend**: Node.js, Express, TypeScript.
* **Base de Datos**: Turso DB (LibSQL) mediante `@libsql/client`.

---

## Configuración del Proyecto

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/torneos-ajedrez.git
cd torneos-ajedrez
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
```env
DATABASE_URL=libsql://tu-base-de-datos.turso.io
DATABASE_AUTH_TOKEN=tu-auth-token-aqui
PORT=3001
```

### 4. Inicializar la Base de Datos
Para crear las tablas relacionales requeridas en tu base de datos remota de Turso, ejecuta el script de migración:
```bash
npm run db:init
```

---

## Ejecución en Desarrollo

Puedes ejecutar los servidores de desarrollo tanto para el frontend como para la API en paralelo:

1. **Backend**:
   ```bash
   npm run dev:backend
   ```
2. **Frontend** (Vite):
   ```bash
   npm run dev:frontend
   ```

---

## Compilación para Producción (y Despliegue en Hostinger)

Hostinger requiere que los proyectos Node.js corran bajo un único puerto y archivo de entrada:

1. **Compilar el proyecto completo**:
   Este comando compila el frontend a `/dist` y el servidor TypeScript a `/dist-server`:
   ```bash
   npm run build
   ```
2. **Subir los archivos al servidor**:
   Sube todo el contenido de la carpeta del proyecto a Hostinger (puedes excluir `node_modules`, `src` y la carpeta `server` original).
3. **Punto de inicio en Hostinger**:
   Apunta la aplicación de Node.js en tu panel de Hostinger al archivo compilado:
   ```
   dist-server/index.js
   ```
4. **Instalar dependencias**:
   Instala solo las dependencias de producción en tu servidor:
   ```bash
   npm install --production
   ```

# Plataforma Profesional de Torneos de Ajedrez & Grand Prix (v2.2)

Ecosistema digital diseñado para organizar, emparejar y rankear jugadores de ajedrez bajo el formato **Sistema Suizo** y acumulativos de ligas **Grand Prix**. Permite administrar múltiples clubes independientes, cada uno con su propio lobby de torneos, ranking y control de jugadores.

---

## 🚀 Características Clave

### 1. Sistema Suizo Inteligente
- Algoritmo de emparejamiento automático por ronda basado en puntuación suiza.
- Manejo dinámico de números impares mediante **Descansos automáticos (Byes)**.
- Desempates oficiales calculados por el sistema de **Coeficiente Buchholz** (suma de puntos de los oponentes).
- Navegación interactiva por jornadas históricas del torneo en tiempo real.

### 2. Acumulativos Grand Prix (Dense Ranking)
- Distribución de puntos automática para el ranking global del club al finalizar cada torneo:
  - 🥇 **1º Lugar:** 10 pts
  - 🥈 **2º Lugar:** 8 pts
  - 🥉 **3º Lugar:** 6 pts
  - 🏅 **4º Lugar:** 4 pts
  - 🎖️ **5º Lugar:** 2 pts
  - ♟️ **Participación (6º en adelante):** 2 pts *(escala participativa)*
- Tabla global del club estructurada con **Dense Ranking (1, 2, 2, 3)** para asegurar que los empatados compartan posición y el siguiente puesto continúe inmediatamente sin saltos artificiales.

### 3. Control de Privacidad y Visibilidad (Admin)
- Opción de ocultar/mostrar perfiles específicos del ranking de la liga pública desde el Dashboard administrativo.
- Útil para jugadores adultos u organizadores que quieren participar competitivamente en los torneos del club pero no desean aparecer expuestos en el ranking público.

### 4. URLs y Slugs Amigables
- Enlaces limpios optimizados para SEO y redes sociales (ej: `/club/los-guardianes-del-rey`, `/tournament/retas08julio26`).
- Soporte para enlaces antiguos (basados en UUID), resolviendo y redirigiendo de forma transparente.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React, React Router v6, TypeScript, Vite, Lucide-React.
- **Backend:** Express, Node.js.
- **Base de Datos:** LibSQL (Turso DB) optimizado con índices de unicidad.
- **Despliegue/Producción:** Hostinger (Node setup).

---

## 💻 Desarrollo Local

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
DATABASE_URL=libsql://tu-base-de-datos.turso.io
DATABASE_AUTH_TOKEN=tu-auth-token-secreto
VITE_API_URL=/api
PORT=3001
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el Servidor de Desarrollo
```bash
# Inicia frontend en puerto 5173 y backend en puerto 3001
npm run dev
```

### 4. Compilar para Producción
```bash
npm run build:local
```

---

## ⚖️ Licencia
Plataforma abierta creada para el desarrollo e interés del ajedrez competitivo. Desarrollada por AhkinTech.

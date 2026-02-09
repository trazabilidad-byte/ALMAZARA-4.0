
# Arquitectura Técnica: Almazara 4.0

## 1. Stack Tecnológico

### Frontend
*   **Framework:** React 18 (SPA - Single Page Application).
*   **Lenguaje:** TypeScript (Tipado estricto para modelos de datos complejos como `TraceReport`).
*   **Build Tool:** Vite (Rápido HMR y compilación optimizada).
*   **Estilos:** Tailwind CSS (Utility-first).
*   **Iconos:** Lucide React (Ligeros y consistentes).

### Backend & Persistencia
*   **Plataforma:** Supabase (Backend-as-a-Service).
*   **Base de Datos:** PostgreSQL.
*   **Autenticación:** Supabase Auth.
*   **Almacenamiento:** Supabase Storage (para logos y documentos).

### Librerías Clave
*   `jspdf` + `jspdf-autotable`: Generación de reportes PDF (Albaranes, Certificados) en el cliente.
*   `lucide-react`: Sistema de iconos.

## 2. Estructura del Proyecto

```bash
/src
├── components/         # Componentes UI (Vistas y Átomos)
│   ├── dashboards/     # Vistas principales (MillingControl, CellarDashboard...)
│   ├── forms/          # Formularios complejos (ValesForm, ProducerForm...)
│   └── shared/         # Componentes reutilizables (Sidebar, KPICard, TankGrid...)
├── lib/                # Lógica de infraestructura
│   ├── supabase.ts     # Cliente de conexión
│   └── utils.ts        # Helpers
├── types.ts            # Definiciones de tipos TypeScript (Single Source of Truth)
├── constants.tsx       # Constantes de configuración y navegación
├── App.tsx             # Enrutador principal y gestor de estado global
└── index.tsx           # Punto de entrada
```

## 3. Gestión de Estado
Actualmente, la aplicación utiliza un patrón híbrido:
1.  **Estado Local (React `useState`):** Para la interacción inmediata de la UI y formularios.
2.  **Estado Persistente (Simulado/Real):**
    *   *Desarrollo:* Uso de `localStorage` para simular persistencia en demos.
    *   *Producción:* Sincronización con Supabase mediante hooks (useEffect) que cargan/guardan datos.

## 4. Patrones de Desarrollo

### 4.1. "Container-Presenter" simplificado
Los componentes de Dashboard (ej: `CellarDashboard.tsx`) actúan como contenedores que gestionan la lógica y el estado, pasando datos a componentes presentacionales más pequeños (ej: `TankGrid.tsx`).

### 4.2. Tipado Estricto
Se utilizan `Interfaces` y `Enums` en `types.ts` para garantizar la integridad de los datos en toda la aplicación.
*   Ejemplo: `UserRole` para RBAC (Role Based Access Control).
*   Ejemplo: `ValeStatus` para la máquina de estados de los vales.

## 5. Estrategia de Despliegue
*   **Vercel:** Configurado para SPA (`vercel.json` con rewrites).
*   **Variables de Entorno:** Gestión segura de claves de API (`VITE_SUPABASE_URL`, etc.).

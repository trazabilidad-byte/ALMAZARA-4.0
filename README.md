
# Almazara 4.0 - Sistema Integral de Gestión (PWA)

![Version](https://img.shields.io/badge/version-4.1.0-brightgreen)
![Status](https://img.shields.io/badge/status-PWA_Ready-green)
![Platform](https://img.shields.io/badge/platform-Web_/_Mobile_/_Tablet-blue)

**Almazara 4.0** es una plataforma moderna diseñada para la gestión integral de almazaras. Ha sido optimizada como **Progressive Web App (PWA)** para ofrecer una experiencia nativa en tablets y dispositivos móviles, permitiendo el control de trazabilidad en tiempo real incluso en entornos con conexión inestable.

## ✨ Características Principales
- **PWA Full Support**: Instalable en Android e iOS con soporte para funcionamiento offline.
- **Optimización para Tablets**: Interfaz con barra lateral colapsable para maximizar el área de trabajo en dispositivos táctiles.
- **Trazabilidad Total**: Desde la recepción de aceituna hasta la venta final (granel o envasado).
- **Gestión de Bodega**: Trasiegos, control de depósitos y lotes de molturación.
- **Multi-tenant**: Aislamiento por almazara mediante políticas de seguridad a nivel de fila (RLS).

## 🚀 Instalación Rápida

### 1. Requisitos Previos
- Node.js (v18 o superior)
- Una cuenta en [Supabase](https://supabase.com/)

### 2. Clonar y Configurar
```bash
git clone https://github.com/tu-usuario/almazara-4.0.git
cd almazara-4.0
npm install
```

### 3. Base de Datos
1. Crea un nuevo proyecto en Supabase.
2. Ejecuta el archivo `supabase-schema.sql` en el SQL Editor de Supabase para crear las tablas y políticas.
3. (Opcional) Ejecuta `add_admin_users.sql` para crear los roles iniciales.

### 4. Variables de Entorno
Copia `.env.example` a `.env` y rellena con tus credenciales:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
VITE_ALMAZARA_ID=un-identificador-unico-para-tu-almazara
```

### 5. Servidor de Desarrollo
```bash
npm run dev
```

## 📱 Uso en Dispositivos Móviles
Al ser una PWA, puedes instalarla en tu móvil:
1. Despliega la app (Vercel recomendado).
2. Abre la URL en tu navegador móvil (Safari en iOS, Chrome en Android).
3. Selecciona **"Añadir a la pantalla de inicio"**.
4. ¡Listo! La app aparecerá en tu menú de aplicaciones con su propio icono y sin barras de navegación.

## 📂 Estructura del Código
- `src/components/`: Componentes UI optimizados para tablets.
- `src/lib/`: Lógica de sincronización y clientes de API.
- `types.ts`: Modelos de datos para el sector oleícola.
- `public/`: Iconos PWA y activos estáticos.

---
© 2026 Almazara Solutions. Código abierto bajo licencia MIT.

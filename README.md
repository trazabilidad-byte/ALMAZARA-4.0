
# Almazara 4.0 - Sistema Integral de Gestión (SaaS)

![Version](https://img.shields.io/badge/version-4.0.0-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Status](https://img.shields.io/badge/status-Production_Ready-green)

**Almazara 4.0** es una plataforma en la nube (SaaS) diseñada para la gestión integral de almazaras de aceite de oliva. Permite el control total de la trazabilidad, desde la recepción de la aceituna hasta la venta del producto final, incluyendo gestión de bodega, envasado y control de costes.

## 🚀 Tecnologías Utilizadas

- **Frontend:** React 18 (TypeScript), Tailwind CSS.
- **Iconografía:** Lucide React.
- **Generación de Documentos:** jsPDF, AutoTable.
- **Backend / Base de Datos:** Supabase (PostgreSQL + Auth + Storage).
- **Despliegue:** Vercel.

## 📂 Estructura del Proyecto

La arquitectura de directorios está diseñada para escalar y mantener el código limpio:

```bash
/
├── docs/                  # Documentación del proyecto (PRD, Esquemas DB)
├── public/
│   └── assets/            # Imágenes estáticas, logos y favicon
├── src/
│   ├── components/        # Componentes UI reutilizables (Tablas, Cards, Modales)
│   ├── lib/               # Lógica de negocio, cálculos y clientes API
│   ├── pages/             # Vistas principales (Dashboard, Bodega, Ventas)
│   ├── types/             # Definiciones de tipos TypeScript e Interfaces
│   ├── constants.tsx      # Constantes globales y configuración de navegación
│   ├── App.tsx            # Punto de entrada y enrutador
│   └── index.css          # Estilos globales Tailwind
├── .env.example           # Plantilla de variables de entorno
├── vercel.json            # Configuración de despliegue
└── package.json
```

## 🔐 Arquitectura Multi-tenant & Seguridad

El sistema utiliza un enfoque de **Aislamiento Lógico** basado en `Row Level Security (RLS)` de PostgreSQL.

1.  **Identificador Único (`almazara_id`):** Cada registro en la base de datos (Vales, Depósitos, Clientes) tiene una columna `almazara_id`.
2.  **Contexto de Sesión:** Al iniciar sesión, el sistema identifica la `almazara_id` asociada al usuario.
3.  **Políticas RLS:** La base de datos bloquea automáticamente cualquier consulta que intente acceder a datos cuyo `almazara_id` no coincida con el del usuario autenticado.

### Flujo de Trazabilidad

El sistema garantiza la trazabilidad completa mediante el siguiente flujo de datos:

1.  **Entrada (Vales):** Recepción de aceituna del productor -> Asignación a Tolva.
2.  **Transformación (Molturación):** Cierre de Tolva -> Creación de Lote de Molturación -> Destino a Depósito (Bodega).
3.  **Movimientos (Bodega):** Trasiegos entre depósitos (registrados en `OilMovements`).
4.  **Salida (Envasado/Venta):**
    *   *Granel:* Salida directa de depósito a cisterna.
    *   *Envasado:* Salida de depósito/nodriza -> Lote de Envasado (PackagingLot) -> Producto Terminado.

## 🛠️ Instalación y Despliegue Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/almazara-4.0.git
    cd almazara-4.0
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Copia el archivo `.env.example` a `.env` y rellena las claves de Supabase.

4.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```

## ☁️ Despliegue en Vercel

El proyecto incluye un archivo `vercel.json` configurado para manejar el enrutamiento SPA (Single Page Application).

1.  Conecta tu repositorio de GitHub a Vercel.
2.  Configura las variables de entorno en el panel de Vercel (Settings > Environment Variables).
3.  Despliega la rama `main`.

---
© 2025 Almazara 4.0 Solutions. Todos los derechos reservados.

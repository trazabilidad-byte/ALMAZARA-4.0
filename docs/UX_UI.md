
# Documentación UX/UI: Almazara 4.0

## 1. Filosofía de Diseño: "Industrial & Clean"
El diseño busca un equilibrio entre la robustez necesaria para un entorno industrial (operarios con guantes, tablets en movimiento) y la elegancia de una aplicación SaaS moderna.

### Principios Clave
*   **Mobile-First:** Todos los controles críticos (crear vale, iniciar molturación) están diseñados para ser tocados con el dedo (zonas de impacto > 44px).
*   **Alto Contraste:** Uso de fondos oscuros (`#111111`) con acentos neón (`#D9FF66`) para destacar acciones principales y KPIs.
*   **Feedback Inmediato:** Las acciones destructivas o críticas requieren confirmación, y los procesos largos muestran estados de carga.

## 2. Sistema de Diseño (Design System)

### 2.1. Paleta de Colores
| Nombre | Hex | Uso |
| :--- | :--- | :--- |
| **Carbon Black** | `#111111` | Fondos de tarjetas principales, Sidebar, Textos fuertes. |
| **Electric Lime** | `#D9FF66` | Acciones primarias (CTAs), Estados de éxito, Acentos de marca. |
| **Off White** | `#F4F7F4` | Fondo general de la aplicación (suave para la vista). |
| **Pure White** | `#FFFFFF` | Contenedores de contenido, Tarjetas secundarias. |
| **Alert Red** | `#EF4444` | Errores, Acciones destructivas, Stock bajo. |
| **Process Blue** | `#3B82F6` | Enlaces, Información, Estados de proceso. |

### 2.2. Tipografía
*   **Familia:** `Inter` (Google Fonts).
*   **Pesos:**
    *   `Black (900)`: Números de KPIs, Títulos de secciones.
    *   `Bold (700)`: Encabezados de tarjetas, Botones.
    *   `Medium (500)`: Texto corrido, etiquetas de formularios.

### 2.3. Componentes Core

#### Tarjetas KPI (`KPICard`)
*   Diseño "Bento Box" con bordes redondeados (`rounded-[28px]`).
*   Sombras suaves (`custom-shadow`) que se elevan al hacer hover.
*   Indicadores de tendencia visuales (barras de progreso).

#### Formularios Modales
*   Aparecen centrados con `backdrop-blur` para enfocar la atención.
*   Inputs grandes con fondo oscuro (`bg-[#111111]`) y texto claro para reducir la fatiga visual en entornos con mucha luz o contraste.
*   Botones de acción de ancho completo en móviles.

#### Grids de Datos
*   Tablas con `horizontal-scroll` en móviles pero manteniendo la columna de "Acciones" o "ID" visible/sticky si fuera necesario.
*   Uso de "Pills" (etiquetas redondeadas) para estados (Pendiente, Completado).

## 3. Patrones de Interacción

### Navegación
*   **Sidebar Lateral:** Colapsable en móviles, persistente en escritorio. Iconografía `Lucide-React` clara.
*   **Tabs Superiores:** Para navegar entre sub-secciones (ej: en Ventas -> Envasado / Orujo / Granel).

### Feedback del Sistema
*   **Validación en tiempo real:** Los inputs numéricos (KG) previenen caracteres inválidos.
*   **Alertas Contextuales:** Mensajes inline (ej: "Stock insuficiente") en lugar de popups bloqueantes siempre que sea posible.

## 4. Accesibilidad
*   Uso de etiquetas `aria-label` en botones que solo contienen iconos.
*   Contraste de color verificado para cumplir AA en textos pequeños y AAA en textos grandes.
*   Soporte para navegación por teclado en formularios.

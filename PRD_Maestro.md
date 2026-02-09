
# PRD Maestro: Almazara 4.0 - Sistema Integral de Gestión

## 1. Visión del Producto
Plataforma SaaS multi-tenant diseñada para la digitalización completa de almazaras de aceite de oliva. El sistema cubre el ciclo de vida completo del producto: desde la recepción de la aceituna hasta la venta del aceite envasado o a granel, garantizando la trazabilidad total y el control de costes.

## 2. Actores y Roles
*   **Super Admin:** Gestión de la plataforma SaaS (altas de almazaras, gestión de suscripciones).
*   **Administrador (Dueño de Almazara):** Acceso total a configuración, usuarios y datos financieros de su tenant.
*   **Operario:** Registro de entradas (Vales), gestión de molturación, trasiegos de bodega y envasado.
*   **Solo Lectura (Viewer):** Acceso a cuadros de mando y reportes sin permisos de escritura.

## 3. Reglas de Negocio Globales (Core Business Rules)

### 3.1. Arquitectura Multi-tenant
*   **Aislamiento Lógico:** Cada registro en la base de datos DEBE tener un `almazara_id`.
*   **Seguridad:** Las políticas RLS (Row Level Security) deben impedir que un usuario vea datos de otra almazara.

### 3.2. Ciclo de Vida del Aceite (Trazabilidad)
El sistema debe mantener una cadena de custodia ininterrumpida:
1.  **Entrada:** Productor + Finca -> Vale de Recepción -> Tolva.
2.  **Procesamiento:** Tolva -> Lote de Molturación (MT) -> Depósito Bodega.
3.  **Almacenamiento:** Depósito A -> Trasiego -> Depósito B.
4.  **Salida:**
    *   **Granel:** Depósito -> Cisterna (Cliente Mayorista).
    *   **Envasado:** Depósito/Nodriza -> Lote Envasado -> Producto Final (Botella).

## 4. Módulos Funcionales

### 4.1. Recepción (Patio)
*   **Vales de Entrada:** Documento legal que acredita la entrega.
    *   *Regla:* Si es "Para Molturar", requiere asignar una Tolva. Si es "Venta Directa", no entra en el circuito industrial.
    *   *Regla:* El "Uso Contador" de la tolva agrupa múltiples vales en un solo lote de molturación potencial.

### 4.2. Molturación (Fábrica)
*   **Lotes de Molturación (MT):** Agrupación de vales procesados en una jornada.
*   **Lotes de Producción (LP / Tanda):** Cierre diario o por turno.
    *   *Regla:* Un LP puede contener múltiples MTs.
    *   *Cálculo:* El rendimiento industrial real se calcula comparando (Total Aceite Obtenido / Total Aceituna Procesada).
    *   *Adjudicación:* El aceite real se reparte proporcionalmente a los vales originales basándose en el rendimiento teórico de laboratorio de cada vale.

### 4.3. Bodega
*   **Gestión de Depósitos:**
    *   Estados: `FILLING` (Abierto) o `FULL` (Cerrado/Lote Finalizado).
    *   *Regla:* No se puede mezclar variedades sin una confirmación explícita (Blend).
*   **Trasiegos:** Movimientos internos que deben registrar origen, destino, kgs y mermas.

### 4.4. Envasadora
*   **Nodriza:** Depósito intermedio que alimenta la línea de envasado.
    *   *Regla:* Todo lote de envasado debe heredar el ID de trazabilidad del aceite cargado en la nodriza.
*   **Materiales Auxiliares:** Gestión de stock de botellas, tapones y etiquetas. El sistema debe descontar stock automáticamente al confirmar una orden de envasado.

### 4.5. Ventas y Salidas
*   **Granel (Cisternas):** Venta a mayoristas. Requiere pesaje de salida y carta de porte.
*   **Envasado:** Venta a minoristas o particulares. Descuenta stock de `FinishedProducts`.
*   **Orujo:** Gestión de subproducto. Salidas hacia orujeras.

## 5. Requisitos No Funcionales
*   **Offline-First (Parcial):** La UI debe ser reactiva y optimista, aunque la persistencia requiere conexión.
*   **Mobile-First:** La interfaz de operario (Patio/Bodega) debe ser totalmente funcional en tablets y móviles.
*   **Rendimiento:** Las consultas de trazabilidad deben resolverse en < 200ms.

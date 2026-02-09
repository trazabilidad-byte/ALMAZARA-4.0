
# Esquema de Base de Datos - Almazara 4.0

## Entidades Principales

### 1. Maestros (Normalización Looker Studio)
- **Municipalities**: `id, name (PK Unique)`
- **Varieties**: `id, name (PK Unique)` - Ej: Picual, Frantoio.
- **Producers**: `id, name, nif, municipality_id (FK), status, created_at`

### 2. Gestión Operativa
- **Hoppers (Tolvas)**: `id, name, max_capacity, status (Active/Full)`
- **Tanks (Depósitos)**: `id, name, max_capacity_kg, current_volume_kg, current_volume_liters, batch_id (FK), variety_id (FK), filtered (boolean)`
- **Vales (Recibos)**: `id, sequential_number (Indexed), type (A/B), producer_id (FK), variety_id (FK), weight_kg, hopper_id (FK), lab_fat_percentage, lab_acidity, milling_lot_id (FK), date`

### 3. Trazabilidad de Producción
- **MillingLots (Lotes MT)**: `id, start_date, end_date, hopper_id (FK), theoretical_oil_kg (Calculado de % Grasa Vales), industrial_oil_kg (Real pesado), loss_percent`
- **PackagingLots**: `id, tank_id (FK), date, format (Botella 500ml, 1L, Garrafa 5L), total_units, variety_id (FK)`

### 4. Ventas y Salidas
- **Customers**: `id, name, cif, type (Cisterna/Envasado)`
- **SalesOrder**: `id, customer_id (FK), date, total_amount, type (Bulk/Package)`
- **TankLoadings (Transaccional Cisternas)**: `id, sales_order_id (FK), tank_id (FK), amount_kg, departure_weight, arrival_weight`

### 5. Auditoría (Logs)
- **AuditLogs**: `id, user_id, action (CREATE_VALE, START_MT, TANK_TRANSFER), table_name, record_id, old_values, new_values, timestamp`

## Relaciones Clave para Trazabilidad
- `Producer` -> `Vale` (1:N)
- `Vale` -> `MillingLot` (N:1) - Muchos vales forman un lote de molturación.
- `MillingLot` -> `Tank` (1:N) - Un lote de aceite puede repartirse en varios depósitos.
- `Tank` -> `PackagingLot` / `Sale` (1:N) - El aceite sale a la envasadora o a cisterna.

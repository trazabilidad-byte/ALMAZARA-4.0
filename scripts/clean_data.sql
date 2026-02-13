-- SCRPT DE LIMPIEZA DE DATOS (RESET PARCIAL)
-- Elimina vales desde el nº 4 en adelante y sus lotes asociados.
-- PRECAUCIÓN: Esto borra datos permanentemente.

-- 1. Identificar los Vales a borrar (sequential_id >= 4)
--    y borrar sus lotes de molturación asociados.
DELETE FROM milling_lots 
WHERE id IN (
    SELECT milling_lot_id 
    FROM vales 
    WHERE sequential_id >= 4
);

-- 2. Borrar los Vales (sequential_id >= 4)
DELETE FROM vales 
WHERE sequential_id >= 4;

-- 3. Borrar Lotes de Producción (Tandas) generadas desde esos lotes
--    (Esto es más complejo si no tenemos la trazabilidad directa por ID, 
--     pero asumimos que queremos limpiar las recientes).
--    AJUSTA LA FECHA SI ES NECESARIO. Aquí borramos las de hoy si quieres ser drástico,
--    o las vinculadas a los depósitos afectados. 
--    Por seguridad, solo borramos si el usuario lo ejecuta manualmente revisando.

-- OPCIONAL: Borrar lotes de producción huérfanos o recientes
-- DELETE FROM production_lots WHERE created_at > NOW() - INTERVAL '1 day';

-- NOTA: Si tienes movimientos de aceite ("oil_movements") generados por estos lotes,
-- también deberías borrarlos para cuadrar el stock.
-- DELETE FROM oil_movements WHERE notes LIKE '%Lote MT-%';

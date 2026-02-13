-- ==============================================================================
-- PATCH: CORRECCIÓN DE TRIGGER DE NUMERACIÓN (SYNC FRIENDLY)
-- ==============================================================================
-- Descripción:
-- El trigger original sobrescribía incondicionalmente el 'sequential_id' al insertar.
-- Esto rompía la sincronización desde la app offline, ya que los Vales con ID asignado
-- eran renumerados por el servidor, causando conflictos (409) y duplicados.
--
-- Este parche modifica la función para respetar el ID si ya viene informado.
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_vale_sequence() RETURNS TRIGGER AS $$
DECLARE
    next_id INT;
BEGIN
    -- CORRECCIÓN: Sólo calcular nuevo ID si no viene informado (es NULL o 0)
    -- Esto permite insertar Vales que ya tienen ID (Sincronización) sin romper la secuencia.
    IF NEW.sequential_id IS NULL OR NEW.sequential_id = 0 THEN
        SELECT COALESCE(MAX(sequential_id), 0) + 1 
        INTO next_id 
        FROM vales 
        WHERE almazara_id = NEW.almazara_id;

        NEW.sequential_id := next_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No es necesario recrear el trigger, solo la función que ejecuta.
-- El cambio es inmediato tras ejecutar este script en el Editor SQL de Supabase.

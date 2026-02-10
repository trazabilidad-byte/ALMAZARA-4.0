
-- 1. Crear usuarios en auth.users (Supabase Admin Only)
-- NOTA: Como no puedo ejecutar funciones de auth.admin desde SQL Editor normal para crear usuarios con password,
-- lo que haremos es insertar en la tabla de aplicación asumiendo que ya existen en Auth o se crearán manulmente.
-- LA MEJOR OPCIÓN es que uses el panel de Authentication de Supabase para "Invite User" o crearlos manualmente,
-- y luego ejecutes este script para asignarles roles y almazara.

-- SI YA CREASTE LOS USUARIOS MANUALMENTE EN EL PANEL DE AUTHENTICATION:
-- Ejecuta esto para vincularlos a la Almazara Principal

INSERT INTO almazaras (name, cif, slug, is_active)
VALUES ('Almazara Principal', 'B12345678', 'main', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Obtener el ID de la almazara
DO $$
DECLARE
    v_almazara_id UUID;
    v_user1_id UUID;
    v_user2_id UUID;
BEGIN
    SELECT id INTO v_almazara_id FROM almazaras WHERE slug = 'main';

    -- NOTA IMPORTANTE:
    -- Necesitas el UUID real de los usuarios en auth.users. 
    -- Como no tengo acceso a tu lista de usuarios de Auth, el script fallará si intentas insertar en app_users con un ID inventado.
    
    -- PASO 1: Ve a Authentication > Users en Supabase
    -- PASO 2: Crea manualmente los usuarios:
    --    - dennisdiazdiaz19@gmail.com
    --    - trazabilidadobeoliva@gmail.com
    -- PASO 3: Copia sus User UID (identificador único)
    -- PASO 4: Sustituye los valores abajo y ejecuta este bloque:

    INSERT INTO app_users (id, almazara_id, email, full_name, role)
    VALUES 
    ('916d4eb6-40bd-489e-a93c-731ad25080e5', v_almazara_id, 'dennisdiazdiaz19@gmail.com', 'Dennis Diaz', 'SUPER_ADMIN'),
    ('ba26ec76-1978-4ad6-b44a-b1298c382778', v_almazara_id, 'trazabilidadobeoliva@gmail.com', 'Trazabilidad', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

END $$;

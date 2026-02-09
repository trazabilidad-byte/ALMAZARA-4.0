
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ARQUITECTURA MULTI-TENANT (ALMAZARAS)
-- ==========================================

CREATE TYPE contract_mode AS ENUM ('SAAS', 'ON_PREMISE');
CREATE TYPE sub_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

CREATE TABLE almazaras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cif TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    -- GESTIÓN DE NEGOCIO Y CONTRATO
    contract_mode contract_mode DEFAULT 'SAAS',
    subscription_status sub_status DEFAULT 'ACTIVE',
    
    -- CAMPOS SAAS (Suscripción)
    plan_price_monthly NUMERIC(10, 2),
    next_payment_date DATE,
    storage_used_mb NUMERIC(10, 2) DEFAULT 0,
    storage_limit_mb NUMERIC(10, 2) DEFAULT 500, -- Límite por defecto 500MB
    
    -- CAMPOS ON-PREMISE (Licencia)
    license_key TEXT UNIQUE, -- Clave de activación
    allowed_domain TEXT, -- Dominio vinculado (ej: almazara-pepe.com)
    
    is_active BOOLEAN DEFAULT TRUE,
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en la tabla maestra
ALTER TABLE almazaras ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1.1 GESTIÓN DE USUARIOS Y ROLES
-- ==========================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER');

CREATE TABLE app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- Vinculado a Supabase Auth
    almazara_id UUID REFERENCES almazaras(id), -- Nullable para Super Admins globales
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'OPERATOR',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Política: Un usuario solo puede ver su propio perfil
CREATE POLICY "Users can view own profile" ON app_users
    USING (auth.uid() = id);

-- ==========================================
-- 2. TABLAS MAESTRAS CON ALMAZARA_ID
-- ==========================================

CREATE TABLE municipalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(almazara_id, name) -- El nombre es único SOLO dentro de la misma almazara
);

CREATE TABLE varieties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    name TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(almazara_id, name)
);

-- 3. PRODUCTORES (SOCIOS)
CREATE TABLE producers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    name TEXT NOT NULL,
    nif TEXT NOT NULL, -- No es unique global, un productor puede estar en 2 almazaras distintas
    municipality_id UUID REFERENCES municipalities(id),
    total_kg_delivered NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(almazara_id, nif) -- El NIF sí es único dentro de la misma almazara
);

-- 4. INFRAESTRUCTURA
CREATE TABLE hoppers (
    id INT NOT NULL, -- 1, 2, 3...
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (almazara_id, id) -- PK Compuesta
);

CREATE TABLE tanks (
    id INT NOT NULL, -- 1..15
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    name TEXT NOT NULL,
    max_capacity_kg NUMERIC(12, 2) NOT NULL,
    current_kg NUMERIC(12, 2) DEFAULT 0,
    variety_id UUID REFERENCES varieties(id),
    current_batch_id TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (almazara_id, id) -- PK Compuesta
);

-- 5. TRAZABILIDAD (LOTES)
CREATE TABLE milling_lots (
    id TEXT NOT NULL, -- Formato MT-YYYY-XXXX
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- Multi-tenant
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    hopper_id INT, -- Referencia lógica, FK compuesta compleja omitida por brevedad
    total_olives_kg NUMERIC(12, 2) DEFAULT 0,
    theoretical_oil_kg NUMERIC(12, 2) DEFAULT 0,
    industrial_oil_kg NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (almazara_id, id)
);

-- 6. VALES (NÚCLEO CON NUMERACIÓN AISLADA)
CREATE TYPE vale_type AS ENUM ('A_MOLTURACION', 'B_VENTA_DIRECTA');

CREATE TABLE vales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    almazara_id UUID REFERENCES almazaras(id) NOT NULL, -- CLAVE OBLIGATORIA
    sequential_id INT NOT NULL, -- Calculado por Trigger, NO SERIAL GLOBAL
    type vale_type NOT NULL,
    producer_id UUID REFERENCES producers(id) NOT NULL,
    variety_id UUID REFERENCES varieties(id) NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL,
    hopper_id INT,
    milling_lot_id TEXT, 
    fat_percentage NUMERIC(5, 2),
    acidity NUMERIC(4, 2),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    -- Integridad: El lote de molturación debe pertenecer a la misma almazara
    FOREIGN KEY (almazara_id, milling_lot_id) REFERENCES milling_lots(almazara_id, id)
);

-- Índice para búsquedas rápidas dentro del tenant
CREATE INDEX idx_vales_tenant ON vales(almazara_id, sequential_id);

-- ==========================================
-- 7. MIDDLEWARE DE SEGURIDAD (RLS POLICIES)
-- ==========================================

-- Habilitar RLS en todas las tablas operativas
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milling_lots ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el almazara_id del usuario actual
-- Esta función lee de la tabla app_users basándose en el auth.uid() actual
CREATE OR REPLACE FUNCTION get_current_almazara_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT almazara_id FROM app_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICA GENÉRICA DE AISLAMIENTO (Ejemplo para Vales)
CREATE POLICY "Tenant Isolation Policy: Vales" ON vales
    USING (almazara_id = get_current_almazara_id())
    WITH CHECK (almazara_id = get_current_almazara_id());

CREATE POLICY "Tenant Isolation Policy: Producers" ON producers
    USING (almazara_id = get_current_almazara_id())
    WITH CHECK (almazara_id = get_current_almazara_id());

-- ==========================================
-- 8. TRIGGER DE NUMERACIÓN SECUENCIAL AISLADA
-- ==========================================
-- Este trigger asegura que la Almazara A tenga vales 1, 2, 3 y la Almazara B también 1, 2, 3
-- sin colisiones y sin huecos globales.

CREATE OR REPLACE FUNCTION set_vale_sequence() RETURNS TRIGGER AS $$
DECLARE
    next_id INT;
BEGIN
    SELECT COALESCE(MAX(sequential_id), 0) + 1 
    INTO next_id 
    FROM vales 
    WHERE almazara_id = NEW.almazara_id; -- Filtro crítico por Tenant

    NEW.sequential_id := next_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_vale_id
BEFORE INSERT ON vales
FOR EACH ROW
EXECUTE FUNCTION set_vale_sequence();

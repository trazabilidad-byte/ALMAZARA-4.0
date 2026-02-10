import { supabase } from './supabase';
import { Producer, Vale, MillingLot, AppConfig, Tank, Hopper, UserRole, ProducerStatus, ValeStatus, OliveVariety, Customer } from '../../types';

export const ALMAZARA_ID = '9e3f173e-1b36-4830-8213-e57dc8e59b3b';

// --- PRODUCTORES ---
export const fetchProducers = async (): Promise<Producer[]> => {
    const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching producers:', error);
        return [];
    }

    return data.map(p => ({
        id: p.id,
        almazaraId: p.almazara_id,
        name: p.name,
        nif: p.nif,
        municipality: '', // Necesitaría join con municipalities
        totalKgDelivered: Number(p.total_kg_delivered),
        status: p.status as ProducerStatus
    }));
};

export const upsertProducer = async (producer: Producer) => {
    const { error } = await supabase
        .from('producers')
        .upsert({
            id: producer.id,
            almazara_id: ALMAZARA_ID,
            name: producer.name,
            nif: producer.nif,
            total_kg_delivered: producer.totalKgDelivered,
            status: producer.status
        });

    if (error) throw error;
};

// --- VALES ---
export const fetchVales = async (): Promise<Vale[]> => {
    const { data, error } = await supabase
        .from('vales')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching vales:', error);
        return [];
    }

    return data.map(v => ({
        id_vale: v.sequential_id,
        id: v.id,
        almazaraId: v.almazara_id,
        tipo_vale: v.type as any,
        productor_id: v.producer_id,
        productor_name: '', // Necesitaría join
        parcela: '',
        fecha_entrada: v.date,
        variedad: 'Picual' as any, // Necesitaría join
        kilos_brutos: Number(v.weight_kg),
        impurezas_kg: 0,
        kilos_netos: Number(v.weight_kg),
        ubicacion_id: v.hopper_id,
        uso_contador: 1,
        estado: v.status as ValeStatus,
        milling_lot_id: v.milling_lot_id,
        analitica: {
            rendimiento_graso: Number(v.fat_percentage),
            acidez: Number(v.acidity)
        }
    })) as Vale[];
};

// --- TANQUES ---
export const fetchTanks = async (): Promise<Tank[]> => {
    const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching tanks:', error);
        return [];
    }

    return data.map(t => ({
        id: t.id,
        almazaraId: t.almazara_id,
        name: t.name,
        maxCapacityKg: Number(t.max_capacity_kg),
        currentKg: Number(t.current_kg),
        variety_id: t.variety_id,
        currentBatchId: t.current_batch_id,
        status: t.status as 'FILLING' | 'FULL'
    }));
};

export const upsertTank = async (tank: Tank) => {
    const { error } = await supabase
        .from('tanks')
        .upsert({
            id: tank.id,
            almazara_id: ALMAZARA_ID,
            name: tank.name,
            max_capacity_kg: tank.maxCapacityKg,
            current_kg: tank.currentKg,
            variety_id: tank.variety_id,
            current_batch_id: tank.currentBatchId,
            status: tank.status || 'FILLING'
        });

    if (error) throw error;
};

// --- TOLVAS ---
export const fetchHoppers = async (): Promise<Hopper[]> => {
    const { data, error } = await supabase
        .from('hoppers')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching hoppers:', error);
        return [];
    }

    return data.map(h => ({
        id: h.id,
        almazaraId: h.almazara_id,
        name: h.name,
        isActive: h.is_active,
        currentUse: 1
    }));
};

// --- LOTES DE MOLTURACIÓN ---
export const fetchMillingLots = async (): Promise<MillingLot[]> => {
    const { data, error } = await supabase
        .from('milling_lots')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching milling lots:', error);
        return [];
    }

    return data.map(l => ({
        id: l.id,
        almazaraId: l.almazara_id,
        fecha: l.start_date,
        tolva_id: l.hopper_id,
        uso_contador: 1,
        kilos_aceituna: Number(l.total_olives_kg),
        kilos_aceite_esperado: Number(l.theoretical_oil_kg),
        kilos_aceite_real: Number(l.industrial_oil_kg),
        deposito_id: 1,
        variedad: 'Picual' as any,
        vales_ids: [],
        campaign: l.campaign
    }));
};

export const upsertMillingLot = async (lot: MillingLot) => {
    const { error } = await supabase
        .from('milling_lots')
        .upsert({
            id: lot.id,
            almazara_id: ALMAZARA_ID,
            start_date: lot.fecha,
            hopper_id: lot.tolva_id,
            total_olives_kg: lot.kilos_aceituna,
            theoretical_oil_kg: lot.kilos_aceite_esperado,
            industrial_oil_kg: lot.kilos_aceite_real,
            campaign: lot.campaign,
            status: 'ACTIVE'
        });

    if (error) throw error;
};

export const upsertVale = async (vale: Vale) => {
    const { error } = await supabase
        .from('vales')
        .upsert({
            id: vale.id,
            almazara_id: ALMAZARA_ID,
            sequential_id: vale.id_vale,
            type: vale.tipo_vale === 'Para Molturar' ? 'A_MOLTURACION' : 'B_VENTA_DIRECTA',
            producer_id: vale.productor_id,
            weight_kg: vale.kilos_netos,
            fat_percentage: vale.analitica.rendimiento_graso,
            acidez: vale.analitica.acidez,
            date: vale.fecha_entrada,
            status: vale.estado as any,
            milling_lot_id: vale.milling_lot_id,
            campaign: vale.campaign
        });

    if (error) throw error;
};

export const upsertCustomer = async (customer: Customer) => {
    const { error } = await supabase
        .from('customers')
        .upsert({
            id: customer.id,
            almazara_id: ALMAZARA_ID,
            name: customer.name,
            cif: customer.cif,
            address: customer.address,
            phone: customer.phone,
            email: customer.email,
            type: customer.type as any,
            status: customer.status === 'Activo' ? 'ACTIVE' : 'ARCHIVED'
        });

    if (error) throw error;
};

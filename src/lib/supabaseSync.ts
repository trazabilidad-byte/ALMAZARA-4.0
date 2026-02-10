import { supabase } from './supabase';
import { Producer, Vale, MillingLot, AppConfig, Tank, Hopper, UserRole } from '../types';

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
        name: p.name,
        nif: p.nif,
        municipality: '', // Necesitaría join con municipalities
        totalKgDelivered: Number(p.total_kg_delivered),
        status: p.status as 'ACTIVE' | 'ARCHIVED'
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
        tipo: v.type === 'A_MOLTURACION' ? 'Para Molturar' : 'Venta Directa',
        productor: '', // Necesitaría join
        fecha: v.date,
        variedad: 'Picual', // Necesitaría join
        kilos_brutos: Number(v.weight_kg),
        kilos_netos: Number(v.weight_kg),
        ubicacion_id: v.hopper_id,
        estado: 'PENDIENTE',
        uso_contador: 1,
        analitica: {
            rendimiento_graso: Number(v.fat_percentage),
            acidez: Number(v.acidity)
        }
    })) as any;
};

// ... Próximamente: MillingLots, Tanks, etc.

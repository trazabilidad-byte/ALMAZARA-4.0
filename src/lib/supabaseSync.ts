
import { supabase } from './supabase';
import { Producer, Vale, MillingLot, AppConfig, Tank, Hopper, UserRole, ProducerStatus, ValeStatus, OliveVariety, Customer, ProductionLot, PackagingLot, OilMovement, SalesOrder, PomaceExit, AuxEntry, CustomerStatus, OilExit } from '../../types';
import { syncQueue } from './syncQueue';

export const ALMAZARA_ID = import.meta.env.VITE_ALMAZARA_ID || 'private-user';

// --- HELPERS PARA SINCRONIZACIÓN ---

const wrapUpsert = async (type: any, payload: any, upsertFn: () => Promise<{ error: any }>) => {
    try {
        const { error } = await upsertFn();
        if (error) {
            console.warn(`Error en red para ${type}, encolando...`, error);
            syncQueue.add({ type, payload });
            return { error, offline: true };
        }
        return { error: null, offline: false };
    } catch (err) {
        console.warn(`Fallo crítico de red para ${type}, encolando...`, err);
        syncQueue.add({ type, payload });
        return { error: err, offline: true };
    }
};

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
        municipality: '',
        totalKgDelivered: Number(p.total_kg_delivered),
        status: p.status as ProducerStatus
    }));
};

export const upsertProducer = async (producer: Producer) => {
    return wrapUpsert('upsertProducer', producer, () =>
        supabase.from('producers').upsert({
            id: producer.id,
            almazara_id: ALMAZARA_ID,
            name: producer.name,
            nif: producer.nif,
            total_kg_delivered: producer.totalKgDelivered,
            status: producer.status
        })
    );
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
        productor_name: '',
        parcela: '',
        fecha_entrada: v.date,
        variedad: 'Picual' as any,
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

export const upsertVale = async (vale: Vale) => {
    return wrapUpsert('upsertVale', vale, () =>
        supabase.from('vales').upsert({
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
        })
    );
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
    return wrapUpsert('upsertTank', tank, () =>
        supabase.from('tanks').upsert({
            id: tank.id,
            almazara_id: ALMAZARA_ID,
            name: tank.name,
            max_capacity_kg: tank.maxCapacityKg,
            current_kg: tank.currentKg,
            variety_id: tank.variety_id,
            current_batch_id: tank.currentBatchId,
            status: tank.status || 'FILLING'
        })
    );
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
    return wrapUpsert('upsertMillingLot', lot, () =>
        supabase.from('milling_lots').upsert({
            id: lot.id,
            almazara_id: ALMAZARA_ID,
            start_date: lot.fecha,
            hopper_id: lot.tolva_id,
            total_olives_kg: lot.kilos_aceituna,
            theoretical_oil_kg: lot.kilos_aceite_esperado,
            industrial_oil_kg: lot.kilos_aceite_real,
            campaign: lot.campaign,
            status: 'ACTIVE'
        })
    );
};

export const upsertCustomer = async (customer: Customer) => {
    return wrapUpsert('upsertCustomer', customer, () =>
        supabase.from('customers').upsert({
            id: customer.id,
            almazara_id: ALMAZARA_ID,
            name: customer.name,
            cif: customer.cif,
            address: customer.address,
            phone: customer.phone,
            email: customer.email,
            type: customer.type as any,
            status: customer.status === 'Activo' ? 'ACTIVE' : 'ARCHIVED'
        })
    );
};

// --- CLIENTES ---
export const fetchCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching customers:', error);
        return [];
    }

    return data.map(c => ({
        id: c.id,
        almazaraId: c.almazara_id,
        name: c.name,
        cif: c.cif,
        address: c.address,
        phone: c.phone,
        email: c.email,
        type: c.type as any,
        status: c.status === 'ACTIVE' ? CustomerStatus.ACTIVE : CustomerStatus.ARCHIVED
    }));
};

// --- TANDAS DIARIAS (PRODUCTION LOTS) ---
export const fetchProductionLots = async (): Promise<ProductionLot[]> => {
    const { data, error } = await supabase
        .from('production_lots')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching production lots:', error);
        return [];
    }

    return data.map(l => ({
        id: l.id,
        almazaraId: l.almazara_id,
        fecha: l.date,
        millingLotsIds: l.milling_lots_ids || [],
        totalOliveKg: Number(l.total_olive_kg),
        totalRealOilKg: Number(l.total_real_oil_kg),
        targetTankId: l.target_tank_id,
        notes: l.notes,
        campaign: l.campaign
    }));
};

export const upsertProductionLot = async (lot: ProductionLot) => {
    return wrapUpsert('upsertProductionLot', lot, () =>
        supabase.from('production_lots').upsert({
            id: lot.id,
            almazara_id: ALMAZARA_ID,
            date: lot.fecha,
            milling_lots_ids: lot.millingLotsIds,
            total_olive_kg: lot.totalOliveKg,
            total_real_oil_kg: lot.totalRealOilKg,
            target_tank_id: lot.targetTankId,
            notes: lot.notes,
            campaign: lot.campaign
        })
    );
};

// --- LOTES DE ENVASADO ---
export const fetchPackagingLots = async (): Promise<PackagingLot[]> => {
    const { data, error } = await supabase
        .from('packaging_lots')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching packaging lots:', error);
        return [];
    }

    return data.map(l => ({
        id: l.id,
        almazaraId: l.almazara_id,
        date: l.date,
        type: l.type as any,
        format: l.format as any,
        units: l.units,
        litersUsed: Number(l.liters_used),
        kgUsed: Number(l.kg_used),
        bottleBatch: l.bottle_batch,
        capBatch: l.cap_batch,
        labelBatch: l.label_batch,
        sourceInfo: l.source_info,
        sourceTankId: l.source_tank_id,
        campaign: l.campaign
    }));
};

export const upsertPackagingLot = async (lot: PackagingLot) => {
    return wrapUpsert('upsertPackagingLot', lot, () =>
        supabase.from('packaging_lots').upsert({
            id: lot.id,
            almazara_id: ALMAZARA_ID,
            date: lot.date,
            type: lot.type,
            format: lot.format,
            units: lot.units,
            liters_used: lot.litersUsed,
            kg_used: lot.kgUsed,
            bottle_batch: lot.bottleBatch,
            cap_batch: lot.capBatch,
            label_batch: lot.labelBatch,
            source_info: lot.sourceInfo,
            source_tank_id: lot.sourceTankId,
            campaign: lot.campaign
        })
    );
};

// --- MOVIMIENTOS Y AJUSTES ---
export const fetchOilMovements = async (): Promise<OilMovement[]> => {
    const { data, error } = await supabase
        .from('oil_movements')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching oil movements:', error);
        return [];
    }

    return data.map(m => ({
        id: m.id,
        almazaraId: m.almazara_id,
        date: m.date,
        source_tank_id: m.source_tank_id,
        target_tank_id: m.target_tank_id,
        kg: Number(m.kg),
        variety: m.variety,
        operator: m.operator,
        campaign: m.campaign,
        batch_id: m.batch_id,
        closureDetails: m.closure_details
    }));
};

export const upsertOilMovement = async (mov: OilMovement) => {
    return wrapUpsert('upsertOilMovement', mov, () =>
        supabase.from('oil_movements').upsert({
            id: mov.id,
            almazara_id: ALMAZARA_ID,
            date: mov.date,
            source_tank_id: mov.source_tank_id,
            target_tank_id: mov.target_tank_id,
            kg: mov.kg,
            variety: mov.variety,
            operator: mov.operator,
            campaign: mov.campaign,
            batch_id: mov.batch_id,
            closure_details: mov.closureDetails
        })
    );
};

// --- PEDIDOS DE VENTA ---
export const fetchSalesOrders = async (): Promise<SalesOrder[]> => {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching sales orders:', error);
        return [];
    }

    return data.map(o => ({
        id: o.id,
        almazaraId: o.almazara_id,
        date: o.date,
        customerId: o.customer_id,
        products: o.products,
        totalAmount: Number(o.total_amount),
        status: o.status as any,
        campaign: o.campaign
    }));
};

export const upsertSalesOrder = async (order: SalesOrder) => {
    return wrapUpsert('upsertSalesOrder', order, () =>
        supabase.from('sales_orders').upsert({
            id: order.id,
            almazara_id: ALMAZARA_ID,
            date: order.date,
            customer_id: order.customerId,
            products: order.products,
            total_amount: order.totalAmount,
            status: order.status,
            campaign: order.campaign
        })
    );
};

// --- SALIDAS DE ORUJO ---
export const fetchPomaceExits = async (): Promise<PomaceExit[]> => {
    const { data, error } = await supabase
        .from('pomace_exits')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching pomace exits:', error);
        return [];
    }

    return data.map(e => ({
        id: e.id,
        almazaraId: e.almazara_id,
        date: e.date,
        customerId: e.customer_id,
        kg: Number(e.kg),
        valeNumber: e.vale_number,
        notes: e.notes,
        campaign: e.campaign
    }));
};

export const upsertPomaceExit = async (exit: PomaceExit) => {
    return wrapUpsert('upsertPomaceExit', exit, () =>
        supabase.from('pomace_exits').upsert({
            id: exit.id,
            almazara_id: ALMAZARA_ID,
            date: exit.date,
            customer_id: exit.customerId,
            kg: exit.kg,
            vale_number: exit.valeNumber,
            notes: exit.notes,
            campaign: exit.campaign
        })
    );
};

// --- ENTRADAS AUXILIARES ---
export const fetchAuxEntries = async (): Promise<AuxEntry[]> => {
    const { data, error } = await supabase
        .from('aux_entries')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching aux entries:', error);
        return [];
    }

    return data.map(e => ({
        id: e.id,
        almazaraId: e.almazara_id,
        date: e.date,
        supplier: e.supplier,
        materialType: e.material_type,
        quantity: Number(e.quantity),
        manufacturerBatch: e.manufacturer_batch,
        pricePerUnit: Number(e.price_per_unit),
        campaign: e.campaign
    }));
};

export const upsertAuxEntry = async (entry: AuxEntry) => {
    return wrapUpsert('upsertAuxEntry', entry, () =>
        supabase.from('aux_entries').upsert({
            id: entry.id,
            almazara_id: ALMAZARA_ID,
            date: entry.date,
            supplier: entry.supplier,
            material_type: entry.materialType,
            quantity: entry.quantity,
            manufacturer_batch: entry.manufacturerBatch,
            price_per_unit: entry.pricePerUnit,
            campaign: entry.campaign
        })
    );
};

// --- SALIDAS DE ACEITE (BULK/EXIT) ---
export const fetchOilExits = async (): Promise<OilExit[]> => {
    const { data, error } = await supabase
        .from('oil_exits')
        .select('*')
        .eq('almazara_id', ALMAZARA_ID);

    if (error) {
        console.error('Error fetching oil exits:', error);
        return [];
    }

    return data.map(e => ({
        id: e.id,
        almazaraId: e.almazara_id,
        tank_id: e.tank_id,
        type: e.type as any,
        date: e.date,
        kg: Number(e.kg),
        kg_after_exit: Number(e.kg_after_exit),
        customer_id: e.customer_id,
        driver_name: e.driver_name,
        license_plate: e.license_plate,
        seals: e.seals,
        campaign: e.campaign,
        deliveryNote: e.delivery_note
    }));
};

export const upsertOilExit = async (exit: OilExit) => {
    return wrapUpsert('upsertOilExit', exit, () =>
        supabase.from('oil_exits').upsert({
            id: exit.id,
            almazara_id: ALMAZARA_ID,
            tank_id: exit.tank_id,
            type: exit.type,
            date: exit.date,
            kg: exit.kg,
            kg_after_exit: exit.kg_after_exit,
            customer_id: exit.customer_id,
            driver_name: exit.driver_name,
            license_plate: exit.license_plate,
            seals: exit.seals,
            campaign: exit.campaign,
            delivery_note: exit.deliveryNote
        })
    );
};

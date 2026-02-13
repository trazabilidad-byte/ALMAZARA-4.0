
import { supabase } from './supabase';
import { Producer, Vale, MillingLot, AppConfig, Tank, Hopper, UserRole, ProducerStatus, ValeStatus, OliveVariety, Customer, ProductionLot, PackagingLot, OilMovement, SalesOrder, PomaceExit, AuxEntry, CustomerStatus, OilExit, NurseTank, FinishedProduct, ValeType, ExitType } from '../../types';

export let ALMAZARA_ID = import.meta.env.VITE_ALMAZARA_ID || '';

export const setSyncAlmazaraId = (id: string) => {
    if (id && id !== 'unknown' && id !== 'null') {
        ALMAZARA_ID = id;
        console.log("SupabaseSync: ID de Almazara actualizado a", id);
    }
};

// --- CONFIGURACIÓN DE LA APP (APP_CONFIGS) ---

export const fetchAppConfig = async (almazaraId?: string): Promise<AppConfig | null> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('app_configs')
        .select('config')
        .eq('almazara_id', id)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Ignorar error si no hay registros
            console.error('Error fetching app config:', error);
        }
        return null;
    }

    return data.config as AppConfig;
};

export const upsertAppConfig = async (config: AppConfig) => {
    const { error } = await supabase.from('app_configs').upsert({
        almazara_id: config.almazaraId || ALMAZARA_ID,
        config: config,
        updated_at: new Date().toISOString()
    });
    return { error };
};

// --- PRODUCTORES ---
export const fetchProducers = async (almazaraId?: string): Promise<Producer[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching producers:', error);
        return [];
    }

    console.log(`Supabase: Encontrados ${data?.length || 0} productores para ${id}`);

    return data.map(p => ({
        id: p.id,
        almazaraId: p.almazara_id,
        name: p.name,
        nif: p.nif,
        municipality: p.municipality || '',
        province: p.province || '',
        zipCode: p.zip_code || '',
        address: p.address || '',
        email: p.email || '',
        phone: p.phone || '',
        totalKgDelivered: Number(p.total_kg_delivered),
        status: (p.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'ARCHIVED') as ProducerStatus
    }));
};

export const upsertProducer = async (producer: Producer) => {
    console.log("📤 Intentando guardar productor en Supabase:", {
        id: producer.id,
        name: producer.name,
        almazaraId: producer.almazaraId || ALMAZARA_ID
    });

    const { error } = await supabase.from('producers').upsert({
        id: producer.id,
        almazara_id: producer.almazaraId || ALMAZARA_ID,
        name: producer.name,
        nif: producer.nif,
        municipality: producer.municipality,
        province: producer.province,
        zip_code: producer.zipCode,
        address: producer.address,
        email: producer.email,
        phone: producer.phone,
        total_kg_delivered: Number(producer.totalKgDelivered) || 0,
        status: producer.status
    });

    if (error) {
        console.error("❌ Error guardando productor:", error);
    } else {
        console.log("✅ Productor guardado exitosamente en Supabase");
    }

    return { error };
};

export const deleteProducer = async (id: string) => {
    const { error } = await supabase.from('producers').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};

// --- VALES ---
export const fetchVales = async (almazaraId?: string): Promise<Vale[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('vales')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching vales:', error);
        return [];
    }

    return data.map(v => ({
        id_vale: v.sequential_id,
        id: v.id,
        almazaraId: v.almazara_id,
        tipo_vale: (v.type === 'A_MOLTURACION' ? 'Para Molturar' : 'Venta Directa') as any,
        productor_id: v.producer_id,
        productor_name: v.producer_name || '',
        parcela: v.parcela || '',
        fecha_entrada: v.date,
        variedad: v.variety as any,
        kilos_brutos: Number(v.weight_kg),
        impurezas_kg: 0,
        kilos_netos: Number(v.weight_kg),
        ubicacion_id: v.hopper_id,
        uso_contador: Number(v.usage_count) || 1,
        estado: v.status as ValeStatus,
        milling_lot_id: v.milling_lot_id,
        analitica: {
            rendimiento_graso: Number(v.fat_percentage),
            acidez: Number(v.acidity)
        },
        comprador: v.customer_id, // Mapeamos el cliente
        comprador_name: v.customer_name,
        campaign: v.campaign,
        created_at: v.created_at
    })) as Vale[];
};

export const upsertVale = async (vale: Vale) => {
    console.log("📤 Intentando guardar VALE en Supabase:", {
        id_vale: vale.id_vale,
        id: vale.id,
        estado: vale.estado,
        almazaraId: vale.almazaraId || ALMAZARA_ID
    });

    const { error } = await supabase.from('vales').upsert({
        id: vale.id,
        almazara_id: vale.almazaraId || ALMAZARA_ID,
        sequential_id: vale.id_vale,
        type: vale.tipo_vale === ValeType.MOLTURACION ? 'A_MOLTURACION' : 'B_VENTA_DIRECTA',
        producer_id: (vale.productor_id && vale.productor_id.length > 20) ? vale.productor_id : null,
        producer_name: vale.productor_name,
        parcela: vale.parcela || '',
        weight_kg: Number(vale.kilos_netos) || 0,
        fat_percentage: Number(vale.analitica.rendimiento_graso) || 0,
        acidity: Number(vale.analitica.acidez) || 0,
        date: vale.fecha_entrada,
        variety: vale.variedad,
        status: vale.estado as any,
        hopper_id: vale.ubicacion_id,
        usage_count: Number(vale.uso_contador) || 1,
        milling_lot_id: vale.milling_lot_id || null,
        campaign: vale.campaign,
        customer_id: vale.comprador || null,
        customer_name: vale.comprador_name || null
    });
    return { error };
};

export const deleteVale = async (id: string) => {
    const { error } = await supabase.from('vales').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};

// --- TANQUES ---
export const fetchTanks = async (almazaraId?: string): Promise<Tank[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .eq('almazara_id', id);

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
        // IMPORTANTE: Mapear 'variety' (texto) preferentemente, fallback a 'variety_id'
        variety_id: t.variety || t.variety_id,
        currentBatchId: t.current_batch_id,
        status: t.status as 'FILLING' | 'FULL'
    }));
};

export const upsertTank = async (tank: Tank) => {
    const { error } = await supabase.from('tanks').upsert({
        id: tank.id,
        almazara_id: tank.almazaraId || ALMAZARA_ID,
        name: tank.name,
        max_capacity_kg: tank.maxCapacityKg,
        current_kg: tank.currentKg,
        variety: tank.variety_id || '', // Usamos el nombre de variedad
        cycle_count: tank.cycleCount,
        status: tank.status || 'FILLING',
        updated_at: new Date().toISOString()
    });
    return { error };
};

export const deleteTank = async (id: number) => {
    const { error } = await supabase.from('tanks').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};

// --- TOLVAS ---
export const fetchHoppers = async (almazaraId?: string): Promise<Hopper[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('hoppers')
        .select('*')
        .eq('almazara_id', id)
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching hoppers:', error);
        return [];
    }

    return data.map(h => ({
        id: h.id,
        almazaraId: h.almazara_id,
        name: h.name,
        isActive: h.is_active,
        currentUse: h.current_use || 1
    }));
};

export const upsertHopper = async (hopper: Hopper) => {
    const { error } = await supabase.from('hoppers').upsert({
        id: hopper.id,
        almazara_id: hopper.almazaraId || ALMAZARA_ID,
        name: hopper.name,
        is_active: hopper.isActive
    });
    return { error };
};

export const deleteHopper = async (id: number) => {
    const { error } = await supabase.from('hoppers').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};

// --- NODRIZA (NURSE TANK) ---
export const fetchNurseTank = async (almazaraId?: string): Promise<NurseTank | null> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('nurse_tanks')
        .select('*')
        .eq('almazara_id', id)
        .maybeSingle(); // Usamos maybeSingle para evitar error si no existe

    if (error) {
        console.error('Error fetching nurse tank:', error);
        return null;
    }

    if (!data) return null;

    return {
        almazaraId: data.almazara_id,
        maxCapacityKg: Number(data.max_capacity_kg),
        currentKg: Number(data.current_kg),
        lastEntryDate: data.last_entry_date,
        lastSourceTankId: data.last_source_tank_id,
        lastEntryId: 0,
        currentVariety: data.current_variety,
        currentBatchId: data.current_batch_id
    };
};

export const upsertNurseTank = async (nurseTank: NurseTank) => {
    const { error } = await supabase.from('nurse_tanks').upsert({
        almazara_id: nurseTank.almazaraId || ALMAZARA_ID, // PK es almazara_id
        max_capacity_kg: nurseTank.maxCapacityKg,
        current_kg: nurseTank.currentKg,
        last_entry_date: nurseTank.lastEntryDate,
        last_source_tank_id: nurseTank.lastSourceTankId,
        current_variety: nurseTank.currentVariety,
        current_batch_id: nurseTank.currentBatchId
    });
    return { error };
};

// --- LOTES DE MOLTURACIÓN ---
export const fetchMillingLots = async (almazaraId?: string): Promise<MillingLot[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('milling_lots')
        .select('*')
        .eq('almazara_id', id);

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
        variedad: (l.variety || 'Picual') as any,
        vales_ids: [],
        campaign: l.campaign,
        status: l.status
    }));
};

export const upsertMillingLot = async (lot: MillingLot) => {
    const { error } = await supabase.from('milling_lots').upsert({
        id: lot.id,
        almazara_id: lot.almazaraId || ALMAZARA_ID,
        start_date: lot.fecha,
        hopper_id: lot.tolva_id,
        total_olives_kg: lot.kilos_aceituna,
        theoretical_oil_kg: lot.kilos_aceite_esperado,
        industrial_oil_kg: lot.kilos_aceite_real,
        variety: lot.variedad,
        campaign: lot.campaign,
        status: lot.status || 'ACTIVE'
    });
    return { error };
};

export const deleteMillingLot = async (id: string) => {
    const { error } = await supabase.from('milling_lots').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};


export const upsertCustomer = async (customer: Customer) => {
    const { error } = await supabase.from('customers').upsert({
        id: customer.id,
        almazara_id: customer.almazaraId || ALMAZARA_ID,
        name: customer.name,
        cif: customer.cif,
        address: customer.address,
        province: customer.province,
        zip_code: customer.zipCode,
        phone: customer.phone,
        email: customer.email,
        type: customer.type as any,
        status: customer.status === 'Activo' ? 'ACTIVE' : 'ARCHIVED'
    });
    return { error };
};

export const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('almazara_id', ALMAZARA_ID);
    return { error };
};

// --- CLIENTES ---
export const fetchCustomers = async (almazaraId?: string): Promise<Customer[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('almazara_id', id);

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
        province: c.province || '',
        zipCode: c.zip_code || '',
        phone: c.phone,
        email: c.email,
        type: c.type as any,
        status: (c.status === 'ACTIVE' || c.status === 'Activo' ? CustomerStatus.ACTIVE : CustomerStatus.ARCHIVED)
    }));
};

// --- TANDAS DIARIAS (PRODUCTION LOTS) ---
export const fetchProductionLots = async (almazaraId?: string): Promise<ProductionLot[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('production_lots')
        .select('*')
        .eq('almazara_id', id);

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
    const { error } = await supabase.from('production_lots').upsert({
        id: lot.id,
        almazara_id: lot.almazaraId || ALMAZARA_ID,
        date: lot.fecha,
        milling_lots_ids: lot.millingLotsIds,
        total_olive_kg: lot.totalOliveKg,
        total_real_oil_kg: lot.totalRealOilKg,
        target_tank_id: lot.targetTankId,
        notes: lot.notes,
        campaign: lot.campaign
    });
    return { error };
};

// --- LOTES DE ENVASADO ---
export const fetchPackagingLots = async (almazaraId?: string): Promise<PackagingLot[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('packaging_lots')
        .select('*')
        .eq('almazara_id', id);

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
    const { error } = await supabase.from('packaging_lots').upsert({
        id: lot.id,
        almazara_id: lot.almazaraId || ALMAZARA_ID,
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
    });
    return { error };
};

// --- PRODUCTOS TERMINADOS (STOCK) ---
export const fetchFinishedProducts = async (almazaraId?: string): Promise<FinishedProduct[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('finished_products')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching finished products:', error);
        return [];
    }

    return data.map(p => ({
        id: p.id,
        almazaraId: p.almazara_id,
        lotId: p.lot_id,
        format: p.format as any,
        type: p.type as any,
        unitsAvailable: p.units_available
    }));
};

export const upsertFinishedProduct = async (product: FinishedProduct) => {
    const { error } = await supabase.from('finished_products').upsert({
        id: product.id,
        almazara_id: product.almazaraId || ALMAZARA_ID,
        lot_id: product.lotId,
        format: product.format,
        type: product.type,
        units_available: product.unitsAvailable
    });
    return { error };
};

// --- MOVIMIENTOS Y AJUSTES ---
export const fetchOilMovements = async (almazaraId?: string): Promise<OilMovement[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('oil_movements')
        .select('*')
        .eq('almazara_id', id);

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
    const { error } = await supabase.from('oil_movements').upsert({
        id: mov.id,
        almazara_id: mov.almazaraId || ALMAZARA_ID,
        date: mov.date,
        source_tank_id: mov.source_tank_id,
        target_tank_id: mov.target_tank_id,
        kg: mov.kg,
        variety: mov.variety,
        operator: mov.operator,
        campaign: mov.campaign,
        batch_id: mov.batch_id,
        closure_details: mov.closureDetails
    });
    return { error };
};

// --- PEDIDOS DE VENTA (Sales Orders) ---
export const fetchSalesOrders = async (almazaraId?: string): Promise<SalesOrder[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching sales orders:', error);
        return [];
    }

    return data.map(s => ({
        id: s.id,
        almazaraId: s.almazara_id,
        date: s.date,
        customerId: s.customer_id,
        products: s.lines || [], // Mapeamos lines (DB) a products (UI)
        totalAmount: Number(s.total_amount),
        status: s.status as any,
        campaign: s.campaign
    }));
};

export const upsertSalesOrder = async (order: SalesOrder) => {
    const { error } = await supabase.from('sales_orders').upsert({
        id: order.id,
        almazara_id: order.almazaraId || ALMAZARA_ID,
        date: order.date,
        customer_id: order.customerId,
        lines: order.products, // UI products -> DB lines
        total_amount: order.totalAmount,
        status: order.status,
        campaign: order.campaign,
        delivery_note: (order as any).deliveryNote // Añadido por si existe en el payload
    });
    return { error };
};

// --- SALIDAS DE ORUJO (Pomace Exits) ---
export const fetchPomaceExits = async (almazaraId?: string): Promise<PomaceExit[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('pomace_exits')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching pomace exits:', error);
        return [];
    }

    return data.map(p => ({
        id: p.id,
        almazaraId: p.almazara_id,
        date: p.date,
        kg: Number(p.kg),
        customerId: p.destination, // Asumimos destination es customerId en DB
        valeNumber: p.vehicle_plate || '', // Asumimos vehicle_plate es valeNumber
        notes: p.notes,
        campaign: p.campaign
    }));
};

export const upsertPomaceExit = async (exit: PomaceExit) => {
    const { error } = await supabase.from('pomace_exits').upsert({
        id: exit.id,
        almazara_id: exit.almazaraId || ALMAZARA_ID,
        date: exit.date,
        kg: exit.kg,
        destination: exit.customerId,
        vehicle_plate: exit.valeNumber,
        notes: exit.notes,
        campaign: exit.campaign
    });
    return { error };
};


// --- AUXILIARES (Aux Entries) ---
export const fetchAuxEntries = async (almazaraId?: string): Promise<AuxEntry[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('aux_entries')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching aux entries:', error);
        return [];
    }

    return data.map(e => ({
        id: e.id,
        almazaraId: e.almazara_id,
        date: e.date,
        supplier: e.supplier,
        materialType: e.product_name || '',
        quantity: Number(e.quantity),
        manufacturerBatch: '', // Fallback si no hay en DB
        pricePerUnit: 0, // Fallback si no hay en DB
        campaign: e.campaign
    }));
};

export const upsertAuxEntry = async (entry: AuxEntry) => {
    const { error } = await supabase.from('aux_entries').upsert({
        id: entry.id,
        almazara_id: entry.almazaraId || ALMAZARA_ID,
        date: entry.date,
        product_id: (entry as any).productId || null,
        product_name: entry.materialType,
        quantity: entry.quantity,
        units: (entry as any).units || 'u',
        supplier: entry.supplier,
        notes: (entry as any).notes || '',
        campaign: entry.campaign
    });
    return { error };
};

// --- SALIDAS DE ACEITE (Oil Exits - Venta a Granel) ---
export const fetchOilExits = async (almazaraId?: string): Promise<OilExit[]> => {
    const id = almazaraId || ALMAZARA_ID;
    const { data, error } = await supabase
        .from('oil_exits')
        .select('*')
        .eq('almazara_id', id);

    if (error) {
        console.error('Error fetching oil exits:', error);
        return [];
    }

    return data.map(o => ({
        id: o.id,
        almazaraId: o.almazara_id,
        tank_id: o.tank_id || 0,
        type: (o.type as ExitType) || ExitType.CISTERNA,
        date: o.date,
        kg: o.kg || 0,
        kg_after_exit: o.kg_after_exit || 0,
        customer_id: o.customer_id,
        vale_number: o.vale_number,
        driver_name: o.driver_name,
        license_plate: o.license_plate,
        seals: o.seals,
        deliveryNote: o.delivery_note,
        campaign: o.campaign
    }));
};

export const upsertOilExit = async (exit: OilExit) => {
    const { error } = await supabase.from('oil_exits').upsert({
        id: exit.id,
        almazara_id: exit.almazaraId || ALMAZARA_ID,
        tank_id: exit.tank_id,
        type: exit.type,
        date: exit.date,
        kg: exit.kg,
        kg_after_exit: exit.kg_after_exit,
        customer_id: exit.customer_id,
        vale_number: exit.vale_number,
        driver_name: exit.driver_name,
        license_plate: exit.license_plate,
        seals: exit.seals,
        delivery_note: exit.deliveryNote,
        campaign: exit.campaign
    });
    return { error };
};

// --- RESET DE DATOS ---
export const resetAlmazaraData = async (almazaraId?: string) => {
    // ESTA FUNCIÓN ES NUCLEAR - BORRADO TOTAL
    const id = almazaraId || ALMAZARA_ID;

    // 1. Borrar Tablas
    await supabase.from('vales').delete().eq('almazara_id', id);
    await supabase.from('milling_lots').delete().eq('almazara_id', id);
    await supabase.from('production_lots').delete().eq('almazara_id', id);
    await supabase.from('packaging_lots').delete().eq('almazara_id', id);
    await supabase.from('oil_movements').delete().eq('almazara_id', id);
    await supabase.from('sales_orders').delete().eq('almazara_id', id);
    await supabase.from('pomace_exits').delete().eq('almazara_id', id);
    await supabase.from('oil_exits').delete().eq('almazara_id', id);
    await supabase.from('finished_products').delete().eq('almazara_id', id);

    // 2. Resetear Tanques a 0
    // No borramos los tanques, solo los ponemos a 0
    const { data: tanks } = await supabase.from('tanks').select('id').eq('almazara_id', id);
    if (tanks) {
        for (const t of tanks) {
            await supabase.from('tanks').update({
                current_kg: 0,
                status: 'FILLING',
                current_batch_id: null,
                variety: ''
            }).eq('id', t.id);
        }
    }

    // 3. Resetear Nodriza
    await supabase.from('nurse_tanks').update({
        current_kg: 0,
        current_batch_id: null,
        current_variety: ''
    }).eq('almazara_id', id);

    return { error: null };
};

export const resetCampaignData = async (almazaraId?: string) => {
    return resetAlmazaraData(almazaraId);
}

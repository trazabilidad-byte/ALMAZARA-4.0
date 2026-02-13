const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okpqomjjgtcxudykaxcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';
const ALMAZARA_ID = '9e3f173e-1b36-4830-8213-e57dc8e59b3b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetData() {
    console.log('⚠️ INICIANDO RESET DE DATOS CORRECTO (Node Script)...');

    // 0. DESVINCULAR VALES (Primero, para romper FK constraints)
    // COLUMNAS: status (no estado), sequential_id (no id_vale)
    console.log('🔄 0. Desvinculando Vales de Lotes...');
    const { error: errUnlink } = await supabase
        .from('vales')
        .update({ milling_lot_id: null, status: 'PENDIENTE' })
        .eq('almazara_id', ALMAZARA_ID);

    if (errUnlink) console.error('❌ Error Unlinking Vales:', errUnlink);
    else console.log('✅ Vales desvinculados y puestos en PENDIENTE.');

    // 1. Borrar Movimientos
    console.log('🗑️ 1. Borrando Movimientos...');
    const { error: errMov } = await supabase
        .from('oil_movements')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);
    if (errMov) console.error('❌ Error Oil Movements:', errMov);
    else console.log('✅ Movimientos borrados.');

    // 2. Borrar Lotes de Producción
    console.log('🗑️ 2. Borrando Production Lots...');
    const { error: errProd } = await supabase
        .from('production_lots')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);
    if (errProd) console.error('❌ Error Production Lots:', errProd);
    else console.log('✅ Production Lots borrados.');

    // 3. Borrar Lotes de Molturación
    console.log('🗑️ 3. Borrando Milling Lots...');
    const { error: errMilling } = await supabase
        .from('milling_lots')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);
    if (errMilling) console.error('❌ Error Milling Lots:', errMilling);
    else console.log('✅ Milling Lots borrados.');

    // 4. Borrar Vales de Prueba (>= 4)
    console.log('🗑️ 4. Borrando Vales >= 4 (sequential_id)...');
    const { error: errValesDel } = await supabase
        .from('vales')
        .delete()
        .eq('almazara_id', ALMAZARA_ID)
        .gte('sequential_id', 4);
    if (errValesDel) console.error('❌ Error Deleting Vales:', errValesDel);
    else console.log('✅ Vales >= 4 borrados.');

    // 5. Resetear Tanques
    console.log('🔄 5. Reseteando Tanques...');
    const { error: errTanks } = await supabase
        .from('tanks')
        .update({ current_kg: 0, status: 'FILLING', current_batch_id: null, variety_id: null })
        .eq('almazara_id', ALMAZARA_ID);
    if (errTanks) console.error('❌ Error Tanks:', errTanks);
    else console.log('✅ Tanques reseteados.');

    // 6. Resetear Tolvas
    console.log('🔄 6. Reseteando Tolvas...');
    const { error: errHoppers } = await supabase
        .from('hoppers')
        .update({ current_use: 1 })
        .eq('almazara_id', ALMAZARA_ID);
    if (errHoppers) console.error('❌ Error Hoppers:', errHoppers);
    else console.log('✅ Tolvas reseteadas.');

    console.log('🏁 RESET COMPLETADO.');
}

resetData();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okpqomjjgtcxudykaxcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';
const ALMAZARA_ID = '9e3f173e-1b36-4830-8213-e57dc8e59b3b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetData() {
    console.log('⚠️ INICIANDO RESET DE DATOS DE PRODUCCIÓN...');

    // 1. Borrar Lotes de Molturación (Milling Lots)
    console.log('🗑️  Borrando Milling Lots...');
    const { error: errMilling } = await supabase
        .from('milling_lots')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);

    if (errMilling) console.error('Error Milling Lots:', errMilling);
    else console.log('✅ Milling Lots borrados.');

    // 2. Borrar Lotes de Producción (Production Lots)
    console.log('🗑️  Borrando Production Lots...');
    const { error: errProd } = await supabase
        .from('production_lots')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);

    if (errProd) console.error('Error Production Lots:', errProd);
    else console.log('✅ Production Lots borrados.');

    // 3. Borrar Movimientos de Aceite (Oil Movements)
    // Borramos TODOS los movimientos excepto ajustes iniciales si los hubiera (pero el usuario pidió reset total de pruebas)
    console.log('🗑️  Borrando Movimientos de Aceite...');
    const { error: errMov } = await supabase
        .from('oil_movements')
        .delete()
        .eq('almazara_id', ALMAZARA_ID);

    if (errMov) console.error('Error Oil Movements:', errMov);
    else console.log('✅ Movimientos borrados.');

    // 4. Resetear Vales (Vales)
    console.log('🔄 Reseteando Vales a PENDIENTE...');
    const { error: errVales } = await supabase
        .from('vales')
        .update({
            estado: 'PENDIENTE',
            milling_lot_id: null,
            // Mantener el uso_contador y ubicación es correcto físicamente
        })
        .eq('almazara_id', ALMAZARA_ID);

    if (errVales) console.error('Error Vales:', errVales);
    else console.log('✅ Vales reseteados.');

    // 5. Resetear Tanques (Tanks)
    console.log('🔄 Reseteando Tanques a VACÍO...');
    const { error: errTanks } = await supabase
        .from('tanks')
        .update({
            current_kg: 0,
            status: 'FILLING',
            current_batch_id: null,
            variety_id: null
            // cycle_count se mantiene o se podría resetear, pero mejor dejarlo
        })
        .eq('almazara_id', ALMAZARA_ID);

    if (errTanks) console.error('Error Tanks:', errTanks);
    else console.log('✅ Tanques reseteados.');

    console.log('🏁 RESET COMPLETADO. Por favor, recarga la página web.');
}

resetData();

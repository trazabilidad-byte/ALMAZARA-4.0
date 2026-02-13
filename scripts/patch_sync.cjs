const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/supabaseSync.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newFunction = `export const resetAlmazaraData = async () => {
    console.log("⚠️ INICIANDO RESET DE DATOS DE ALMAZARA (Autenticado) - NUCLEAR...");
    const almazaraId = ALMAZARA_ID;

    try {
        // 0. DESVINCULAR FOREIGN KEYS PRIMERO
        console.log("🔄 Desvinculando Vales de Lotes...");
        const { error: errUpdate } = await supabase
            .from('vales')
            .update({ milling_lot_id: null, estado: 'PENDIENTE', productor_id: null, comprador: null }) // Desvincular también prop/comprador
            .eq('almazara_id', almazaraId);
        
        if (errUpdate) console.error("Error desvinculando vales:", errUpdate);

        // 1. Borrar Salidas y Entradas Auxiliares (Dependencias de Clientes/Tanques)
        console.log("🗑️ Borrando salidas y auxiliares...");
        await supabase.from('oil_exits').delete().eq('almazara_id', almazaraId);
        await supabase.from('pomace_exits').delete().eq('almazara_id', almazaraId);
        await supabase.from('aux_entries').delete().eq('almazara_id', almazaraId);

        // 2. Borrar Lotes de Compra / Envasado (Packaging & Sales)
        await supabase.from('sales_orders').delete().eq('almazara_id', almazaraId);
        await supabase.from('finished_products').delete().eq('almazara_id', almazaraId);
        await supabase.from('packaging_lots').delete().eq('almazara_id', almazaraId);

        // 3. Borrar Movimientos
        await supabase.from('oil_movements').delete().eq('almazara_id', almazaraId);

        // 4. Borrar Lotes de Producción y Molturación
        await supabase.from('production_lots').delete().eq('almazara_id', almazaraId);
        await supabase.from('milling_lots').delete().eq('almazara_id', almazaraId);

        // 5. Borrar Vales (TODOS, incluido < 4, limpieza total)
        console.log("🗑️ Borrando TODOS los vales...");
        await supabase.from('vales').delete().eq('almazara_id', almazaraId);

        // 6. Borrar Clientes y Productores (Nuclear Option)
        console.log("🗑️ Borrando Clientes y Productores...");
        await supabase.from('customers').delete().eq('almazara_id', almazaraId);
        await supabase.from('producers').delete().eq('almazara_id', almazaraId);

        // 7. Resetear Tanques
        await supabase.from('tanks').update({ current_kg: 0, status: 'FILLING', current_batch_id: null, variety_id: null, cycle_count: 0 }).eq('almazara_id', almazaraId);
        
        // 8. Resetear Tolvas y Nodriza
        await supabase.from('hoppers').update({ current_use: 1 }).eq('almazara_id', almazaraId);
        await supabase.from('nurse_tanks').update({ current_kg: 0, current_batch_id: null, current_variety: null }).eq('almazara_id', almazaraId);

        console.log("✅ DATOS BORRADOS CORRECTAMENTE (NUCLEAR).");
        return { success: true };
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN RESET:", err);
        return { error: err };
    }
};`;

// Regex to match existing function: export const resetAlmazaraData = async () => { ... };
// We assume it ends with }; and check content.
// Since regex for nested braces is hard, we will find the start and then assume it goes until the end of the file or find the closing brace by counting.
// But we know it's at the end of the file in previous views.

const startMarker = 'export const resetAlmazaraData = async () => {';
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
    console.error('❌ Could not find function start');
    process.exit(1);
}

// Replace everything from startMarker to the end of the file (or we can just append, but better to be safe).
// Based on previous view, it is the LAST function.
// But let's verify if there is anything after.
const afterStart = content.substring(startIndex);
// We'll just replace the whole thing if we are sure.
// Let's assume it's the last export.

// SAFE APPROACH: Replace valid V2 function with V3.
// We search for the unique string from V2 to verify we are replacing the right block.
const v2Marker = 'console.log("⚠️ INICIANDO RESET DE DATOS DE ALMAZARA (Autenticado) - V2 (FK FIX)...");';
if (!content.includes(v2Marker)) {
    console.error('❌ Could not find V2 marker. File might have changed or old version.');
    // Fallback: try to find startMarker and replace until end of file
}

// We will replace from startIndex to the last closing brace.
// Actually, let's just replace from startIndex to the end of the file, assuming it's the last function.
// To be safer, we can count braces.

let nesting = 0;
let endIndex = -1;
for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') nesting++;
    else if (content[i] === '}') {
        nesting--;
        if (nesting === 0) {
            endIndex = i;
            break;
        }
    }
}

if (endIndex === -1) {
    console.error('❌ Could not find function end');
    process.exit(1);
}

const newContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex + 2); // +1 for }, +1 for ; maybe?
// In the original file it ends with }; 
// The newFunction string ends with };
// So we replace [startIndex, endIndex+1] with newFunction.
// Wait, endIndex points to '}'. string includes '}'.
// substring(0, startIndex) excludes start.
// substring(endIndex + 1) includes what's after '}'.

// Let's check if there is a semicolon after '}'
let closingOffset = 1;
if (content[endIndex + 1] === ';') closingOffset = 2;

const finalContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex + closingOffset);

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('✅ supabaseSync.ts patched successfully.');

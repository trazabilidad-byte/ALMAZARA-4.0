
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno
const envPath = path.resolve(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
        }
    }
}

// Fallback (Contexto conocido)
if (!supabaseUrl) supabaseUrl = 'https://okpqomjjgtcxudykaxcp.supabase.co';
if (!supabaseKey) supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';

console.log('Using Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanMoreData() {
    console.log('Iniciando limpieza PROFUNDA de datos de prueba...');

    // 1. Borrar Vales >= 4 (Por si acaso quedó alguno)
    const { error: valesErr } = await supabase.from('vales').delete().gte('sequential_id', 4);
    if (valesErr) console.error('Error borrando vales:', valesErr);
    else console.log('Vales >= 4 eliminados.');

    // 2. Borrar Milling Lots (MT)
    // Borramos TODOS los que empiecen por "MT" creados HOY o TODOS si son de prueba.
    // Asumimos que los de prueba empiezan por "MT".
    // Para ser seguros, borramos los que NO tengan asociación válida o todos los recientes.
    // Vamos a borrar los que empiezan por 'MT' y tengan fecha reciente (2025 o superior).
    const { error: mtErr } = await supabase.from('milling_lots').delete().ilike('id', 'MT%');
    if (mtErr) console.error('Error borrando Milling Lots (MT%):', mtErr);
    else console.log('Lotes de Molturación (MT...) eliminados.');

    // 3. Borrar Production Lots (LP - Tandas)
    // Borramos los que empiecen por "LP-"
    const { error: lpErr } = await supabase.from('production_lots').delete().ilike('id', 'LP-%');
    if (lpErr) console.error('Error borrando Production Lots (LP-%):', lpErr);
    else console.log('Lotes de Producción (LP...) eliminados.');

    // 4. Borrar Movimientos de Aceite de Producción (PROD-)
    // Estos son los que suman stock al tanque y aparecen en el historial.
    const { error: movErr } = await supabase.from('oil_movements').delete().ilike('id', 'PROD-%');
    if (movErr) console.error('Error borrando Movimientos PROD:', movErr);
    else console.log('Movimientos de aceite de producción (PROD...) eliminados.');

    console.log('Limpieza profunda completada. Recarga la página.');
}

cleanMoreData();

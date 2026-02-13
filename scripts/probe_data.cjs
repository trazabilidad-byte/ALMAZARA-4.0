const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okpqomjjgtcxudykaxcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probe() {
    console.log('🔍 PROBANDO EXISTENCIA DE DATOS DE VUELO (Cualquier Almazara)...');

    // Probar Productores
    const { data: producers, error: errProd } = await supabase
        .from('producers')
        .select('id, almazara_id, name')
        .limit(5);

    if (errProd) console.error('❌ Error probing producers:', errProd.message);
    else {
        console.log(`📊 Encontrados ${producers.length} productores:`);
        producers.forEach(p => console.log(`   - [${p.almazara_id}] ${p.name}`));
    }

    // Probar Vales
    const { data: vales, error: errVales } = await supabase
        .from('vales')
        .select('id, almazara_id, sequential_id')
        .limit(5);

    if (errVales) console.error('❌ Error probing vales:', errVales.message);
    else {
        console.log(`📊 Encontrados ${vales.length} vales:`);
        vales.forEach(v => console.log(`   - [${v.almazara_id}] Vale #${v.sequential_id}`));
    }
}

probe();

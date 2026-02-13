const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okpqomjjgtcxudykaxcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';
const ALMAZARA_ID = '9e3f173e-1b36-4830-8213-e57dc8e59b3b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCounts() {
    console.log('🔍 VERIFICANDO DATOS EXISTENTES PARA ALMAZARA:', ALMAZARA_ID);

    const tables = [
        'vales',
        'producers',
        'customers',
        'milling_lots',
        'production_lots',
        'oil_movements',
        'tanks',
        'hoppers',
        'sales_orders',
        'finished_products',
        'packaging_lots'
    ];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('almazara_id', ALMAZARA_ID);

        if (error) console.error(`❌ Error checking ${table}:`, error.message);
        else console.log(`📊 ${table}: ${count} rows`);
    }
}

checkCounts();

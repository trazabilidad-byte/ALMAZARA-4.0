
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno (Simplificado)
const envPath = path.resolve(__dirname, '..', '.env');
let supabaseUrl = 'https://okpqomjjgtcxudykaxcp.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcHFvbWpqZ3RjeHVkeWtheGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDk3MTIsImV4cCI6MjA4NjE4NTcxMn0.o07Tq81laxivnu_mgbzeT6SHZafkvH-0ygYj1IdrnF0';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('--- DB Check ---');

    // Check Vales (Should be empty or low count)
    const { count: vCount, data: vData } = await supabase.from('vales').select('*', { count: 'exact', head: true });
    // Also get the highest sequential_id if any exist
    const { data: vMax } = await supabase.from('vales').select('sequential_id').order('sequential_id', { ascending: false }).limit(1);

    // Check Milling Lots (Should be empty if script worked)
    const { count: mCount, data: mData } = await supabase.from('milling_lots').select('id', { count: 'exact' }).limit(5);

    // Check Production Lots (The problem)
    const { count: pCount, data: pData } = await supabase.from('production_lots').select('id', { count: 'exact' }).limit(5);

    // Check Oil Movements (The OTHER problem)
    const { count: omCount, data: omData } = await supabase.from('oil_movements').select('id', { count: 'exact' }).limit(5);

    console.log(`Vales: ${vCount} (Max Seq ID: ${vMax?.[0]?.sequential_id || 'None'})`);
    console.log(`Milling Lots: ${mCount}. Sample IDs:`, mData?.map(d => d.id));
    console.log(`Production Lots: ${pCount}. Sample IDs:`, pData?.map(d => d.id));
    console.log(`Oil Movements: ${omCount}. Sample IDs:`, omData?.map(d => d.id));
}

checkCounts();

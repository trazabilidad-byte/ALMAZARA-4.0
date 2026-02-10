
import React, { useState, useMemo } from 'react';
import { Vale, SalesOrder, OilExit, ExitType, Customer, AppConfig, RiceVariety, OliveVariety } from '../types';
import { BarChart3, TrendingUp, TrendingDown, Scale, Droplets, Trophy, ArrowRightLeft, Calendar, Factory, MapPin } from 'lucide-react';

interface AnalyticsDashboardProps {
    currentCampaign: string;
    currentVales: Vale[];
    currentSales: SalesOrder[];
    currentExits: OilExit[];
    customers: Customer[];
    pastCampaigns: string[];
}

// Interfaz para datos agregados de una campaña
interface CampaignSummary {
    id: string;
    totalKgOlives: number;
    avgYield: number;
    totalOilProduced: number; // Estimado o Real
    bulkLiters: number;
    packagedLiters: number;
    topCustomerId: string;
    topCustomerVolume: number;
    parcelData: { name: string, kg: number, percent: number }[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    currentCampaign,
    currentVales,
    currentSales,
    currentExits,
    customers,
    pastCampaigns
}) => {
    const [baseCampaignId, setBaseCampaignId] = useState(currentCampaign);
    const [compareCampaignId, setCompareCampaignId] = useState(pastCampaigns[0] || "2023/2024");

    // --- 1. PROCESAR DATOS DE UNA CAMPAÑA (FUNCIÓN AUXILIAR) ---
    const processCampaignData = (id: string, vales: Vale[], sales: SalesOrder[], exits: OilExit[]): CampaignSummary => {
        const totalKg = vales.reduce((acc, v) => acc + v.kilos_netos, 0);

        // Rendimiento: Intentamos usar el rendimiento graso de analítica si existe, si no, un estimado base
        const valesWithYield = vales.filter(v => v.analitica && v.analitica.rendimiento_graso > 0);
        const avgYield = valesWithYield.length > 0
            ? valesWithYield.reduce((acc, v) => acc + v.analitica.rendimiento_graso, 0) / valesWithYield.length
            : 21.0; // Fallback a 21% si no hay datos

        // Aceite producido (estimado por rendimiento graso en recepción)
        const totalOil = vales.reduce((acc, v) => acc + (v.kilos_netos * (v.analitica?.rendimiento_graso || 21) / 100), 0);

        // Ventas Granel (Cisternas)
        const bulkKg = exits
            .filter(e => e.type === ExitType.CISTERNA)
            .reduce((acc, e) => acc + e.kg, 0);
        const bulkLiters = bulkKg / 0.916;

        // Ventas Envasado (SalesOrders)
        let packagedLiters = 0;
        const customerVolumes: Record<string, number> = {};

        exits.filter(e => e.type === ExitType.CISTERNA).forEach(e => {
            if (e.customer_id) {
                customerVolumes[e.customer_id] = (customerVolumes[e.customer_id] || 0) + (e.kg / 0.916);
            }
        });

        sales.forEach(order => {
            let orderLiters = 0;
            order.products.forEach(p => {
                const vol = parseFloat(p.format.replace('L', '').replace(',', '.')) || 0;
                orderLiters += p.units * vol;
            });
            packagedLiters += orderLiters;
            if (order.customerId) {
                customerVolumes[order.customerId] = (customerVolumes[order.customerId] || 0) + orderLiters;
            }
        });

        // Top Customer
        let topCust = { id: '', vol: 0 };
        Object.entries(customerVolumes).forEach(([id, vol]) => {
            if (vol > topCust.vol) topCust = { id, vol };
        });

        // Análisis por Parcela
        const parcelMap: Record<string, number> = {};
        vales.forEach(v => {
            const p = v.parcela || 'Sin Finca';
            parcelMap[p] = (parcelMap[p] || 0) + v.kilos_netos;
        });
        const parcelData = Object.entries(parcelMap)
            .map(([name, kg]) => ({ name, kg, percent: totalKg > 0 ? (kg / totalKg) * 100 : 0 }))
            .sort((a, b) => b.kg - a.kg)
            .slice(0, 8);

        return {
            id,
            totalKgOlives: totalKg,
            avgYield,
            totalOilProduced: totalOil,
            bulkLiters,
            packagedLiters,
            topCustomerId: topCust.id,
            topCustomerVolume: topCust.vol,
            parcelData
        };
    };

    // --- 2. GESTIÓN DE DATOS (LIVE VS HISTÓRICO) ---
    const currentSummary = useMemo(() =>
        processCampaignData(currentCampaign, currentVales, currentSales, currentExits),
        [currentVales, currentSales, currentExits, currentCampaign]
    );

    const getHistoricalData = (campaignId: string): CampaignSummary => {
        if (campaignId === currentCampaign) return currentSummary;

        const saved = localStorage.getItem(`app_history_${campaignId}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                return processCampaignData(
                    campaignId,
                    data.vales || [],
                    data.salesOrders || [],
                    data.oilExits || []
                );
            } catch (e) {
                console.error("Error parsing history", e);
            }
        }

        // Fallback a mock solo si no hay nada de nada (para mantener la UI viva en demo)
        const seed = campaignId.length + (parseInt(campaignId.substring(0, 4)) || 2020);
        return {
            id: campaignId,
            totalKgOlives: 3500000 + (seed % 5) * 5000,
            avgYield: 19 + (seed % 40) / 10,
            totalOilProduced: (3500000 * 0.20),
            bulkLiters: 500000,
            packagedLiters: 100000,
            topCustomerId: '',
            topCustomerVolume: 0,
            parcelData: []
        };
    };

    const baseData = useMemo(() => getHistoricalData(baseCampaignId), [baseCampaignId, currentSummary]);
    const compareData = useMemo(() => getHistoricalData(compareCampaignId), [compareCampaignId, currentSummary]);

    // --- CÁLCULO DE VARIACIONES ---
    const calculateDelta = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    const deltaKg = calculateDelta(baseData.totalKgOlives, compareData.totalKgOlives);
    const deltaYield = calculateDelta(baseData.avgYield, compareData.avgYield);
    const deltaOil = calculateDelta(baseData.totalOilProduced, compareData.totalOilProduced);

    const formatNumber = (num: number) => num.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const DeltaBadge = ({ val, suffix = '%' }: { val: number, suffix?: string }) => {
        const isPositive = val >= 0;
        return (
            <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(val).toFixed(2)}{suffix}
            </div>
        );
    };

    const availableCampaigns = useMemo(() =>
        Array.from(new Set([currentCampaign, ...pastCampaigns])).sort().reverse(),
        [currentCampaign, pastCampaigns]
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* HEADER & SELECTORS */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#111111] text-[#D9FF66] rounded-2xl"><BarChart3 size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-[#111111] uppercase tracking-tighter">Comparador de Campañas</h2>
                        <p className="text-xs text-gray-400 font-medium">Analiza la evolución de la producción y ventas.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-[8px] font-bold text-gray-400 uppercase">Principal</label>
                        <select
                            value={baseCampaignId}
                            onChange={(e) => setBaseCampaignId(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-black text-[#111111] outline-none focus:border-[#D9FF66] appearance-none min-w-[140px] text-center"
                        >
                            {availableCampaigns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="text-gray-300"><ArrowRightLeft size={20} /></div>

                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-[8px] font-bold text-gray-400 uppercase">Comparar con</label>
                        <select
                            value={compareCampaignId}
                            onChange={(e) => setCompareCampaignId(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-black text-gray-500 outline-none focus:border-[#D9FF66] appearance-none min-w-[140px] text-center"
                        >
                            {availableCampaigns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CARD 1: RECEPCIÓN */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Scale size={20} /></div>
                        <DeltaBadge val={deltaKg} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Aceituna Recepcionada</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-[#111111] tracking-tighter">{formatNumber(baseData.totalKgOlives)}</h3>
                        <span className="text-xs font-bold text-gray-400 mb-1">KG</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium whitespace-nowrap">Vs {compareCampaignId}</span>
                        <span className="font-bold text-gray-600 whitespace-nowrap">{formatNumber(compareData.totalKgOlives)} KG</span>
                    </div>
                </div>

                {/* CARD 2: RENDIMIENTO */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Droplets size={20} /></div>
                        <DeltaBadge val={deltaYield} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rendimiento Medio</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-[#111111] tracking-tighter">{baseData.avgYield.toFixed(2)}</h3>
                        <span className="text-xs font-bold text-gray-400 mb-1">%</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium whitespace-nowrap">Vs {compareCampaignId}</span>
                        <span className="font-bold text-gray-600 whitespace-nowrap">{compareData.avgYield.toFixed(2)} %</span>
                    </div>
                </div>

                {/* CARD 3: PRODUCCIÓN ACEITE */}
                <div className="bg-[#111111] p-6 rounded-[32px] border border-gray-100 shadow-xl text-white relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-white/10 text-[#D9FF66] rounded-xl"><Factory size={20} /></div>
                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${deltaOil >= 0 ? 'bg-[#D9FF66] text-black' : 'bg-red-500 text-white'}`}>
                            {deltaOil >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(deltaOil).toFixed(2)}%
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Aceite Producido</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-[#D9FF66] tracking-tighter">{formatNumber(baseData.totalOilProduced)}</h3>
                        <span className="text-xs font-bold text-gray-500 mb-1">KG</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium whitespace-nowrap">Vs {compareCampaignId}</span>
                        <span className="font-bold text-gray-300 whitespace-nowrap">{formatNumber(compareData.totalOilProduced)} KG</span>
                    </div>
                </div>
            </div>

            {/* PARCEL ANALYSIS */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={20} /></div>
                    <h3 className="text-xl font-black text-[#111111] uppercase tracking-tighter">Análisis por Finca (KG)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <p className="text-xs font-black text-gray-400 uppercase mb-4">{baseData.id}</p>
                        {baseData.parcelData.length > 0 ? baseData.parcelData.map((parcel, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-[#111111]">{parcel.name}</span>
                                    <span className="text-gray-400">{formatNumber(parcel.kg)} KG ({parcel.percent.toFixed(1)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${parcel.percent}%` }} />
                                </div>
                            </div>
                        )) : <p className="text-sm text-gray-400 font-medium italic">Sin datos de parcelas.</p>}
                    </div>

                    <div className="space-y-4 opacity-60">
                        <p className="text-xs font-black text-gray-400 uppercase mb-4">{compareData.id}</p>
                        {compareData.parcelData.length > 0 ? compareData.parcelData.map((parcel, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-[#111111]">{parcel.name}</span>
                                    <span className="text-gray-400">{formatNumber(parcel.kg)} KG</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-300 rounded-full" style={{ width: `${parcel.percent}%` }} />
                                </div>
                            </div>
                        )) : <p className="text-sm text-gray-400 font-medium italic">Sin datos de parcelas.</p>}
                    </div>
                </div>
            </div>

            {/* SALES MIX & TOP CUSTOMER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* MIX VENTAS */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#111111] uppercase tracking-tighter mb-6">Mix de Ventas (Litros)</h3>

                    {/* CAMPAÑA BASE */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black uppercase text-[#111111] bg-gray-100 px-2 py-1 rounded">{baseData.id}</span>
                            <span className="text-xs font-bold text-gray-400">{formatNumber(baseData.bulkLiters + baseData.packagedLiters)} L Total</span>
                        </div>
                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-blue-500 transition-all duration-1000"
                                style={{ width: `${(baseData.packagedLiters / (Math.max(1, baseData.bulkLiters + baseData.packagedLiters))) * 100}%` }}
                            />
                            <div className="h-full bg-orange-400 flex-1" />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-bold uppercase">
                            <span className="text-blue-600">Envasado: {formatNumber(baseData.packagedLiters)} L</span>
                            <span className="text-orange-500">Granel: {formatNumber(baseData.bulkLiters)} L</span>
                        </div>
                    </div>

                    {/* CAMPAÑA COMPARE */}
                    <div className="opacity-70 grayscale hover:grayscale-0 transition-all">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black uppercase text-gray-500 border border-gray-200 px-2 py-1 rounded">{compareData.id}</span>
                            <span className="text-xs font-bold text-gray-400">{formatNumber(compareData.bulkLiters + compareData.packagedLiters)} L Total</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-blue-500 transition-all duration-1000"
                                style={{ width: `${(compareData.packagedLiters / (Math.max(1, compareData.bulkLiters + compareData.packagedLiters))) * 100}%` }}
                            />
                            <div className="h-full bg-orange-400 flex-1" />
                        </div>
                    </div>
                </div>

                {/* TOP CLIENTE */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-[#111111] uppercase tracking-tighter mb-6 flex items-center gap-2">
                        <Trophy className="text-[#D9FF66] fill-black" size={20} /> Cliente Principal
                    </h3>

                    <div className="flex-1 space-y-6">
                        {/* BASE */}
                        <div className="flex items-center gap-4 bg-[#F9FAF9] p-4 rounded-2xl border border-gray-100">
                            <div className="text-center min-w-[60px]">
                                <p className="text-[10px] font-black text-gray-400 uppercase">{baseData.id}</p>
                                <div className="text-2xl">🥇</div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-[#111111] uppercase">
                                    {customers.find(c => c.id === baseData.topCustomerId)?.name || 'Sin Clientes'}
                                </p>
                                <p className="text-xs font-bold text-gray-500">
                                    Volumen comprado: <span className="text-[#111111]">{formatNumber(baseData.topCustomerVolume)} L</span>
                                </p>
                            </div>
                        </div>

                        {/* COMPARE */}
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-dashed border-gray-200 opacity-70">
                            <div className="text-center min-w-[60px]">
                                <p className="text-[10px] font-black text-gray-400 uppercase">{compareData.id}</p>
                                <div className="text-xl grayscale">🥇</div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-gray-600 uppercase">
                                    {customers.find(c => c.id === compareData.topCustomerId)?.name || 'Distribuidora Jaén S.L.'}
                                </p>
                                <p className="text-xs font-bold text-gray-400">
                                    Volumen comprado: {formatNumber(compareData.topCustomerVolume)} L
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

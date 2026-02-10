
import React, { useState, useEffect, useMemo } from 'react';
import { PackagingLot, MillingLot, Vale, Producer, Customer, SalesOrder, Tank, AppConfig, OilMovement, OilExit, ExitType, ProductionLot, ValeType } from '../types';
import { Search, ArrowRight, Factory, User, ShoppingCart, Box, Layers, Milk, Sticker, FileText, MapPin, SearchX, Package, FileDown, Warehouse, Truck, Droplets, ArrowLeft, Calculator, Activity } from 'lucide-react';

interface TraceabilityDashboardProps {
    initialSearch?: string;
    packagingLots: PackagingLot[];
    millingLots: MillingLot[];
    vales: Vale[];
    producers: Producer[];
    salesOrders: SalesOrder[];
    customers: Customer[];
    tanks: Tank[];
    appConfig: AppConfig;
    oilMovements?: OilMovement[];
    oilExits?: OilExit[];
    productionLots?: ProductionLot[]; // Nuevo prop
    onViewValeDetails: (vale: Vale) => void;
    onViewProductionLot?: (lpId: string) => void; // Nuevo callback
    onNavigateToTank?: (tankId: number) => void; // Nuevo callback
}

interface TraceReport {
    lot: any;
    type: 'PACKAGING' | 'MILLING' | 'VALE' | 'NURSE_ENTRY' | 'PRODUCTION_LOT';
    originTank?: string;
    millingBatch: MillingLot | undefined;
    productionBatch?: ProductionLot | undefined; // Datos de la tanda
    producers: { producer: Producer; vale: Vale }[];
    sales: { order: SalesOrder; customer: Customer; units: number }[];
    tankInfo?: Tank;
    hasPackagedExit?: boolean;
    nurseMovements?: OilMovement[];
    bulkExits?: OilExit[];
    relatedPackLots?: PackagingLot[];
    nurseEntryData?: {
        sourceLPs: ProductionLot[];
        movement: OilMovement;
    };
    isDirectSale?: boolean;
    directSaleInfo?: {
        buyerName: string;
        date: string;
        valeNumber: number;
    };
}

export const TraceabilityDashboard: React.FC<TraceabilityDashboardProps> = ({
    initialSearch = '',
    packagingLots,
    millingLots,
    vales,
    producers,
    salesOrders,
    customers,
    tanks,
    appConfig,
    oilMovements = [],
    oilExits = [],
    productionLots = [],
    onViewValeDetails,
    onViewProductionLot,
    onNavigateToTank
}) => {
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [report, setReport] = useState<TraceReport | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Historial de navegación para el botón "Atrás"
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        if (initialSearch) {
            setSearchTerm(initialSearch);
            runSearch(initialSearch);
        }
    }, [initialSearch]);

    // Función para navegar a un nuevo ID guardando el historial
    const navigateTraceability = (newId: string) => {
        if (!newId || newId === searchTerm) return;

        // Guardamos la búsqueda actual en el historial antes de cambiar
        setHistory(prev => [...prev, searchTerm]);
        setSearchTerm(newId);
        runSearch(newId);

        // Scroll top suave
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Función para volver atrás
    const goBack = () => {
        if (history.length === 0) return;

        const previousSearch = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        setHistory(newHistory);
        setSearchTerm(previousSearch);
        runSearch(previousSearch);
    };

    const runSearch = (term: string) => {
        if (!term) return;

        // 0. BUSCAR COMO LOTE DE PRODUCCIÓN (LP) - NUEVA JERARQUÍA
        // Buscamos coincidencia exacta o parcial si el ID es complejo
        const prodLot = productionLots.find(p => p.id === term || p.id.toLowerCase() === term.toLowerCase());
        if (prodLot) {
            // Recuperar Vales a través de los Milling Lots
            const involvedProducers: { producer: Producer; vale: Vale }[] = [];
            const relatedMillingLots = millingLots.filter(ml => prodLot.millingLotsIds.includes(ml.id));

            relatedMillingLots.forEach(mt => {
                mt.vales_ids.forEach(vid => {
                    const v = vales.find(x => x.id_vale === vid);
                    const p = producers.find(x => x.id === v?.productor_id);
                    if (v && p && !involvedProducers.some(ip => ip.vale.id_vale === v.id_vale)) {
                        involvedProducers.push({ producer: p, vale: v });
                    }
                });
            });

            // Buscar Salidas desde el tanque destino
            const targetTank = tanks.find(t => t.id === prodLot.targetTankId);

            // --- LOGICA DE SALIDAS (CORREGIDA) ---
            // 1. Salidas Directas (Granel)
            const bulkExits = targetTank ? oilExits.filter(exit =>
                exit.tank_id === targetTank.id && exit.type === ExitType.CISTERNA
            ) : [];

            // 2. Salidas Envasado (Directo + Nodriza)
            let relatedPackLots: PackagingLot[] = [];
            let movementsToNurse: OilMovement[] = [];

            if (targetTank) {
                // A. Directo de Bodega (Sin Filtrar)
                const tankIdentifier = `Bodega D${targetTank.id}`;
                const directPackLots = packagingLots.filter(p => p.sourceInfo.includes(tankIdentifier));

                // B. Via Nodriza (Filtrado)
                movementsToNurse = oilMovements.filter(mov =>
                    mov.source_tank_id === targetTank.id && mov.target_tank_id === 999
                );

                // Buscar lotes de envasado que coincidan con los Lotes de Entrada a Nodriza (Batch IDs)
                const nurseBatchIds = movementsToNurse.map(m => m.batch_id).filter(Boolean);
                const nursePackLots = packagingLots.filter(p => {
                    // Comprobar si el lote de envasado referencia el lote de la nodriza en su sourceInfo o ID
                    return nurseBatchIds.some(nbId =>
                        (nbId && p.sourceInfo.includes(nbId)) || (nbId && p.id.startsWith(nbId))
                    );
                });

                relatedPackLots = [...directPackLots, ...nursePackLots];
            }

            setReport({
                lot: prodLot,
                type: 'PRODUCTION_LOT',
                productionBatch: prodLot,
                millingBatch: relatedMillingLots[0], // Representativo
                tankInfo: targetTank,
                producers: involvedProducers,
                sales: [],
                nurseMovements: movementsToNurse,
                bulkExits: bulkExits,
                relatedPackLots: relatedPackLots
            });
            setHasSearched(true);
            return;
        }

        // 1. BUSCAR COMO LOTE DE ENTRADA A NODRIZA (LE)
        const nurseEntry = oilMovements.find(m => m.batch_id === term && m.target_tank_id === 999);
        if (nurseEntry) {
            const sourceTank = tanks.find(t => t.id === nurseEntry.source_tank_id);

            // Buscar Lotes de Producción (Tandas) que alimentaron este tanque ANTES de la fecha de movimiento
            const sourceLPs = productionLots.filter(lp =>
                lp.targetTankId === nurseEntry.source_tank_id &&
                new Date(lp.fecha) <= new Date(nurseEntry.date)
            ).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            // Si encontramos LPs, podemos inferir productores
            const involvedProducers: { producer: Producer; vale: Vale }[] = [];
            sourceLPs.forEach(lp => {
                const mts = millingLots.filter(m => lp.millingLotsIds.includes(m.id));
                mts.forEach(mt => {
                    mt.vales_ids.forEach(vid => {
                        const v = vales.find(x => x.id_vale === vid);
                        const p = producers.find(x => x.id === v?.productor_id);
                        if (v && p && !involvedProducers.some(ip => ip.vale.id_vale === v.id_vale)) {
                            involvedProducers.push({ producer: p, vale: v });
                        }
                    });
                });
            });

            // Buscar lotes de envasado generados a partir de esta entrada específica
            const derivedPackLots = packagingLots.filter(p => {
                // Coincidencia estricta por ID o Info de Origen
                return (nurseEntry.batch_id && p.sourceInfo.includes(nurseEntry.batch_id)) ||
                    (nurseEntry.batch_id && p.id.startsWith(nurseEntry.batch_id));
            });

            setReport({
                lot: { id: nurseEntry.batch_id, date: nurseEntry.date },
                type: 'NURSE_ENTRY',
                tankInfo: sourceTank,
                producers: involvedProducers,
                millingBatch: undefined,
                productionBatch: undefined,
                sales: [],
                nurseMovements: [nurseEntry],
                relatedPackLots: derivedPackLots,
                nurseEntryData: {
                    sourceLPs: sourceLPs,
                    movement: nurseEntry
                }
            });
            setHasSearched(true);
            return;
        }

        // 2. BUSCAR COMO LOTE DE ENVASADO
        const packLot = packagingLots.find(l => l.id.toLowerCase() === term.toLowerCase());
        if (packLot) {
            let tankId: number | null = null;
            let nurseEntryMovement: OilMovement | undefined;

            if (packLot.type === 'Filtrado') {
                // LÓGICA VINCULADA: Extraer el ID base de la Nodriza (ej: de "1/2/2026-E1" sacar "1/2/2026")
                let nurseBatchId = '';

                // Intento 1: Parsear del ID si tiene formato vinculado
                // Formato esperado: [Deposito]/[Entrada]/[Sesion]/[Año] -> ID Nodriza es [Deposito]/[Entrada]/[Año]
                // Pero en PackagingDashboard.tsx se guarda como: `lotCode = ${nurseTank.currentBatchId}-E${bottlingCount}`
                // Ojo: En la corrección anterior se cambió a: `[Depósito] / [Nº Entrada a Nodriza] / [Nº Sesión Envasado] / [Año]`
                // Ejemplo ID Lote: "1/1/2/2026". El ID Nodriza debería ser "1/1/2026".

                const parts = packLot.id.split('/');
                if (parts.length === 4) {
                    // Reconstruir ID Nodriza: Deposito/Entrada/Año
                    nurseBatchId = `${parts[0]}/${parts[1]}/${parts[3]}`;
                } else if (packLot.id.includes('-E')) {
                    // Formato con guión
                    nurseBatchId = packLot.id.split('-E')[0];
                } else {
                    // Buscar en sourceInfo
                    const match = packLot.sourceInfo.match(/Lote\s+([0-9\/]+)/);
                    if (match) nurseBatchId = match[1];
                }

                if (nurseBatchId) {
                    nurseEntryMovement = oilMovements.find(m => m.batch_id === nurseBatchId);
                    if (nurseEntryMovement) tankId = nurseEntryMovement.source_tank_id;
                }

            } else {
                // Sin Filtrar (Directo de Bodega)
                let tankMatch = packLot.id.match(/SF(\d+)/);
                tankId = tankMatch ? parseInt(tankMatch[1]) : null;
                if (!tankId && packLot.sourceInfo.includes('Bodega D')) {
                    tankId = parseInt(packLot.sourceInfo.replace('Bodega D', ''));
                }
            }

            // Si no encontramos tanque, fallback al primero para demo
            let foundMillingLot = millingLots.find(mt =>
                mt.deposito_id === tankId &&
                new Date(mt.fecha) <= new Date(packLot.date)
            ) || millingLots[0];

            // Buscar Producción (Tanda) asociada (Prioritario)
            const productionBatch = productionLots.find(pl =>
                pl.id === packLot.id || // Coincidencia directa con ID de tanda
                pl.millingLotsIds.includes(foundMillingLot?.id || '')
            );

            // Si hay tanda, los productores vienen de ella
            const involvedProducers: { producer: Producer; vale: Vale }[] = [];
            if (productionBatch) {
                const lpMillingLots = millingLots.filter(m => productionBatch.millingLotsIds.includes(m.id));
                lpMillingLots.forEach(mt => {
                    mt.vales_ids.forEach(vId => {
                        const v = vales.find(x => x.id_vale === vId);
                        const p = producers.find(x => x.id === v?.productor_id);
                        if (v && p && !involvedProducers.some(ip => ip.vale.id_vale === v.id_vale)) {
                            involvedProducers.push({ producer: p, vale: v });
                        }
                    });
                });
            } else if (foundMillingLot) {
                foundMillingLot.vales_ids.forEach(vId => {
                    const v = vales.find(x => x.id_vale === vId);
                    const p = producers.find(x => x.id === v?.productor_id);
                    if (v && p) involvedProducers.push({ producer: p, vale: v });
                });
            }

            const lotSales: any[] = [];
            salesOrders.forEach(o => {
                const line = o.products.find(p => p.lotId === packLot.id);
                if (line) {
                    const c = customers.find(x => x.id === o.customerId);
                    if (c) lotSales.push({ order: o, customer: c, units: line.units });
                }
            });

            const intermediateTank = tanks.find(t => t.id === tankId);

            setReport({
                lot: packLot,
                type: 'PACKAGING',
                originTank: packLot.sourceInfo,
                millingBatch: foundMillingLot,
                productionBatch,
                producers: involvedProducers,
                sales: lotSales,
                tankInfo: intermediateTank,
                hasPackagedExit: true,
                bulkExits: [],
                relatedPackLots: [packLot],
                nurseMovements: nurseEntryMovement ? [nurseEntryMovement] : []
            });
            setHasSearched(true);
            return;
        }

        // 3. BUSCAR COMO LOTE DE MOLTURACIÓN
        const mLot = millingLots.find(l => l.id.toLowerCase() === term.toLowerCase());
        if (mLot) {
            const involvedProducers: { producer: Producer; vale: Vale }[] = [];
            mLot.vales_ids.forEach(vId => {
                const v = vales.find(x => x.id_vale === vId);
                const p = producers.find(x => x.id === v?.productor_id);
                if (v && p) involvedProducers.push({ producer: p, vale: v });
            });

            // Buscar Producción (Tanda) asociada
            const productionBatch = productionLots.find(pl =>
                pl.millingLotsIds.includes(mLot.id)
            );

            const intermediateTank = tanks.find(t => t.id === mLot.deposito_id);

            let movementsToNurse: OilMovement[] = [];
            let relatedPackLots: PackagingLot[] = [];
            let bulkExits: OilExit[] = [];

            if (intermediateTank) {
                // 1. Granel
                bulkExits = oilExits.filter(exit =>
                    exit.tank_id === intermediateTank.id && exit.type === ExitType.CISTERNA
                );

                // 2. Envasado Directo
                const tankIdentifier = `Bodega D${intermediateTank.id}`;
                const directPackLots = packagingLots.filter(p => p.sourceInfo.includes(tankIdentifier));

                // 3. Envasado Via Nodriza
                movementsToNurse = oilMovements.filter(mov =>
                    mov.source_tank_id === intermediateTank.id && mov.target_tank_id === 999
                );
                const nurseBatchIds = movementsToNurse.map(m => m.batch_id).filter(Boolean);
                const nursePackLots = packagingLots.filter(p => {
                    return nurseBatchIds.some(nbId =>
                        (nbId && p.sourceInfo.includes(nbId)) || (nbId && p.id.startsWith(nbId))
                    );
                });

                relatedPackLots = [...directPackLots, ...nursePackLots];
            }

            const hasPackaged = relatedPackLots.length > 0 || movementsToNurse.length > 0;

            setReport({
                lot: mLot,
                type: 'MILLING',
                millingBatch: mLot,
                productionBatch,
                producers: involvedProducers,
                sales: [],
                tankInfo: intermediateTank,
                hasPackagedExit: hasPackaged,
                nurseMovements: movementsToNurse,
                bulkExits: bulkExits,
                relatedPackLots: relatedPackLots
            });
            setHasSearched(true);
            return;
        }

        // 4. BUSCAR COMO VALE INDIVIDUAL
        const vId = parseInt(term);
        const vSingle = vales.find(v => v.id_vale === vId);
        if (vSingle) {
            const p = producers.find(x => x.id === vSingle.productor_id);
            const involvedProducers = p ? [{ producer: p, vale: vSingle }] : [];
            const mBatch = millingLots.find(m => m.id === vSingle.milling_lot_id);

            // Buscar Producción (Tanda) asociada
            const productionBatch = mBatch ? productionLots.find(pl =>
                pl.millingLotsIds.includes(mBatch.id)
            ) : undefined;

            const intermediateTank = mBatch ? tanks.find(t => t.id === mBatch.deposito_id) : undefined;

            // Buscar movimientos si encontramos el tanque intermedio
            let movementsToNurse: OilMovement[] = [];
            let bulkExits: OilExit[] = [];
            let relatedPackLots: PackagingLot[] = [];
            let hasPackaged = false;

            if (intermediateTank) {
                movementsToNurse = oilMovements.filter(mov =>
                    mov.source_tank_id === intermediateTank.id && mov.target_tank_id === 999
                );

                // Lotes directos
                const tankIdentifier = `Bodega D${intermediateTank.id}`;
                const directPackLots = packagingLots.filter(p => p.sourceInfo.includes(tankIdentifier));

                // Lotes via Nodriza (CRUCIAL PARA LA VINCULACIÓN)
                const nurseBatchIds = movementsToNurse.map(m => m.batch_id).filter(Boolean);
                const nursePackLots = packagingLots.filter(p => {
                    return nurseBatchIds.some(nbId =>
                        (nbId && p.sourceInfo.includes(nbId)) || (nbId && p.id.startsWith(nbId))
                    );
                });

                relatedPackLots = [...directPackLots, ...nursePackLots];
                hasPackaged = relatedPackLots.length > 0;

                // Buscar Cisternas asociadas al tanque
                bulkExits = oilExits.filter(exit =>
                    exit.tank_id === intermediateTank.id && exit.type === ExitType.CISTERNA
                );
            }

            if (vSingle.tipo_vale === ValeType.VENTA_DIRECTA) {
                const buyer = customers.find(c => c.id === vSingle.comprador);
                setReport({
                    lot: vSingle,
                    type: 'VALE',
                    millingBatch: undefined,
                    productionBatch: undefined,
                    producers: involvedProducers,
                    sales: [],
                    tankInfo: undefined,
                    hasPackagedExit: false,
                    nurseMovements: [],
                    bulkExits: [],
                    relatedPackLots: [],
                    isDirectSale: true,
                    directSaleInfo: {
                        buyerName: buyer?.name || vSingle.comprador || 'Comprador Desconocido',
                        date: vSingle.fecha_entrada,
                        valeNumber: vSingle.id_vale
                    }
                });
                setHasSearched(true);
                return;
            }

            setReport({
                lot: vSingle,
                type: 'VALE',
                millingBatch: mBatch,
                productionBatch,
                producers: involvedProducers,
                sales: [],
                tankInfo: intermediateTank,
                hasPackagedExit: hasPackaged,
                nurseMovements: movementsToNurse,
                bulkExits: bulkExits,
                relatedPackLots: relatedPackLots,
                isDirectSale: false
            });
            setHasSearched(true);
            return;
        }

        setReport(null);
        setHasSearched(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHistory([]); // Limpiar historial en nueva búsqueda manual
        runSearch(searchTerm);
    };

    const handleDownloadReport = () => {
        if (!report) return;
        // @ts-ignore
        if (!window.jspdf) return alert("Librería PDF no cargada.");

        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- CABECERA EMPRESA ---
        if (appConfig.logoBase64) {
            try {
                doc.addImage(appConfig.logoBase64, 'PNG', 14, 10, 30, 30);
            } catch (e) {
                console.error("Error adding logo", e);
            }
        }
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(appConfig.companyName.toUpperCase(), 50, 15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(appConfig.address, 50, 22);
        doc.text(`${appConfig.zipCode} ${appConfig.city} (${appConfig.province})`, 50, 27);
        doc.text(`CIF: ${appConfig.cif}`, 50, 32);

        // --- TÍTULO ---
        doc.setFillColor(17, 17, 17);
        doc.rect(0, 45, 210, 15, 'F');
        doc.setTextColor(217, 255, 102);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("INFORME DE TRAZABILIDAD", 14, 55);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`LOTE: ${report.lot.id || report.lot.id_vale}`, 120, 55);
        doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 170, 55);

        let currentY = 75;

        // --- 1. ORIGEN ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. ORIGEN ACEITUNA", 14, currentY);
        currentY += 5;

        if (report.isDirectSale) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 167, 69);
            doc.text("VENTA DIRECTA (SIN MOLTURACIÓN)", 14, currentY + 5);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            doc.text(`Comprador: ${report.directSaleInfo?.buyerName}`, 14, currentY + 12);
            doc.text(`Fecha Venta: ${report.directSaleInfo?.date ? new Date(report.directSaleInfo.date).toLocaleDateString() : '-'}`, 14, currentY + 17);
            currentY += 25;

            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("* Esta aceituna se vendió directamente en origen y no generó aceite en la almazara.", 14, currentY);
            currentY += 15;
        } else {
            if (report.producers.length > 0) {
                const producerRows = report.producers.map(p => [
                    p.producer.name,
                    `Vale #${p.vale.id_vale}`,
                    p.vale.parcela,
                    `${p.vale.kilos_netos} kg`
                ]);
                // @ts-ignore
                doc.autoTable({
                    startY: currentY,
                    head: [['Productor', 'Documento', 'Parcela / Origen', 'Kilos']],
                    body: producerRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 167, 69] }
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 15;
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text("Sin datos de origen directos.", 14, currentY + 5);
                currentY += 15;
            }

            // --- 2. MOLTURACIÓN ---
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("2. MOLTURACIÓN / PROCESO INDUSTRIAL", 14, currentY);
            currentY += 5;

            if (report.millingBatch) {
                const millingRows = [[
                    report.millingBatch.id,
                    new Date(report.millingBatch.fecha).toLocaleDateString(),
                    `${report.millingBatch.kilos_aceituna} kg Aceituna`,
                    `${report.millingBatch.kilos_aceite_real} kg Aceite`,
                    report.millingBatch.variedad
                ]];
                // @ts-ignore
                doc.autoTable({
                    startY: currentY,
                    head: [['Lote Molturación', 'Fecha', 'Entrada', 'Salida', 'Variedad']],
                    body: millingRows,
                    theme: 'grid',
                    headStyles: { fillColor: [17, 17, 17] }
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 15;
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text("Sin datos de molturación directos.", 14, currentY + 5);
                currentY += 15;
            }

            // --- 3. BODEGA ---
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("3. ALMACENAMIENTO (BODEGA)", 14, currentY);
            currentY += 5;

            if (report.tankInfo) {
                const tankRows = [[
                    report.tankInfo.name,
                    report.tankInfo.variety_id,
                    `${report.tankInfo.currentKg} kg`,
                    report.tankInfo.status
                ]];
                // @ts-ignore
                doc.autoTable({
                    startY: currentY,
                    head: [['Depósito', 'Contenido/Variedad', 'Stock Actual', 'Estado']],
                    body: tankRows,
                    theme: 'grid',
                    headStyles: { fillColor: [255, 140, 0] } // Orange
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 15;
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text("Sin datos de bodega asociados.", 14, currentY + 5);
                currentY += 15;
            }

            // --- 4. DESTINO ---
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("4. DESTINO FINAL (VENTAS / SALIDAS)", 14, currentY);
            currentY += 5;

            if (report.relatedPackLots && report.relatedPackLots.length > 0) {
                const packRows = report.relatedPackLots.map(l => [
                    l.id,
                    l.format,
                    `${l.units} uds`,
                    l.type
                ]);
                // @ts-ignore
                doc.autoTable({
                    startY: currentY,
                    head: [['Lote Envasado', 'Formato', 'Unidades', 'Tipo']],
                    body: packRows,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 123, 255] } // Blue
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 10;
            } else if (report.bulkExits && report.bulkExits.length > 0) {
                const bulkRows = report.bulkExits.map(e => [
                    e.deliveryNote || 'S/N',
                    new Date(e.date).toLocaleDateString(),
                    customers.find(c => c.id === e.customer_id)?.name || 'Cliente',
                    `${e.kg} kg`
                ]);
                // @ts-ignore
                doc.autoTable({
                    startY: currentY,
                    head: [['Albarán Cisterna', 'Fecha', 'Cliente', 'Kilos']],
                    body: bulkRows,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 123, 255] }
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 10;
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text("El producto permanece en nuestras instalaciones (sin salidas).", 14, currentY + 5);
                currentY += 15;
            }
        }

        // PIE
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Informe generado por ${appConfig.companyName} - ALMAZARA 4.0`, 105, 290, { align: 'center' });

        doc.save(`Trazabilidad_${report.lot.id || report.lot.id_vale}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-20">
            <div className="flex flex-col items-center justify-center space-y-6 pt-8 pb-4">
                <h2 className="text-3xl md:text-4xl font-black uppercase text-[#111111] tracking-tighter text-center">Trazabilidad Total</h2>
                <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <input
                        type="text"
                        placeholder="Lote Producción, Envasado, Molturación o Nº Vale..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border-2 border-gray-100 focus:border-[#D9FF66] rounded-full pl-16 pr-8 py-5 text-lg font-bold text-[#000000] placeholder:text-gray-500 outline-none shadow-xl transition-all"
                    />
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#111111] text-[#D9FF66] p-3 rounded-full hover:scale-105 transition-all"><ArrowRight size={20} /></button>
                </form>
            </div>

            {report ? (
                <div className="space-y-12 max-w-[1600px] mx-auto px-4">
                    <div className="bg-[#111111] text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <p className="text-[10px] font-black text-[#D9FF66] uppercase tracking-widest mb-2">INFORME DE TRAZABILIDAD</p>
                                <div className="flex items-center gap-4 mb-2">
                                    {history.length > 0 && (
                                        <button
                                            onClick={goBack}
                                            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-300 hover:text-white"
                                        >
                                            <ArrowLeft size={14} /> Volver
                                        </button>
                                    )}
                                    <h3 className="text-5xl font-black uppercase tracking-tighter">{String(report.lot.id || report.lot.id_vale)}</h3>
                                </div>
                                <div className="flex gap-4 text-sm font-bold text-gray-400">
                                    <span className="flex items-center gap-2">
                                        <Package size={16} />
                                        {report.type === 'NURSE_ENTRY' ? 'Lote Entrada Nodriza' :
                                            report.type === 'PRODUCTION_LOT' ? 'Lote Producción (Tanda)' : report.type}
                                    </span>
                                    <span>{new Date(report.lot.date || report.lot.fecha || report.lot.fecha_entrada).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button onClick={handleDownloadReport} className="bg-[#D9FF66] text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center gap-2"><FileDown size={18} /> Descargar PDF</button>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-6 relative overflow-x-auto pb-4">

                        {/* 1. ORIGEN (CAMPO) */}
                        <div className="flex flex-col gap-6 min-w-[300px] flex-1">
                            <div className="flex items-center gap-3 bg-green-50 w-fit px-4 py-2 rounded-full border border-green-100"><User size={16} className="text-green-700" /><span className="text-xs font-black text-green-800 uppercase">1. Origen Aceituna</span></div>

                            {report.isDirectSale ? (
                                <div className="bg-[#111111] p-8 rounded-[40px] text-white border-2 border-[#D9FF66] relative overflow-hidden flex-1 min-w-[300px]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-6 text-[#D9FF66]">
                                            <Truck size={20} />
                                            <span className="text-xs font-black uppercase tracking-widest">Venta Directa de Aceituna</span>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comprador / Destino</p>
                                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter">{report.directSaleInfo?.buyerName}</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Fecha Operación</p>
                                                    <p className="text-sm font-bold text-white">{report.directSaleInfo?.date ? new Date(report.directSaleInfo.date).toLocaleDateString() : '-'}</p>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Estado</p>
                                                    <p className="text-sm font-bold text-[#D9FF66]">Vendido en Origen</p>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-[#D9FF66]/10 rounded-2xl border border-[#D9FF66]/20">
                                                <p className="text-xs text-[#D9FF66] font-medium italic">
                                                    * Esta aceituna no ha pasado por el proceso de molturación de la almazara. Se ha gestionado como una venta directa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
                                        <Truck size={200} />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm min-h-[300px] flex flex-col">
                                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                                        {report.producers.map((item, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-[#D9FF66] transition-all group">
                                                <p className="text-xs font-black text-[#111111] uppercase mb-1">{item.producer.name}</p>
                                                <div className="flex justify-between items-end">
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {item.vale.parcela}</p>
                                                    <button
                                                        onClick={() => onViewValeDetails(item.vale)}
                                                        className="bg-[#111111] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#D9FF66] hover:text-black transition-colors cursor-pointer"
                                                    >
                                                        Vale #{item.vale.id_vale}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {report.producers.length === 0 && <p className="text-xs text-gray-400 italic">Sin datos de origen directos.</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!report.isDirectSale && (
                            <>

                                {/* 2. INDUSTRIA (MOLTURACIÓN) */}
                                <div className="flex flex-col gap-6 min-w-[300px] flex-1">
                                    <div className="flex items-center gap-3 bg-[#111111] w-fit px-4 py-2 rounded-full"><Factory size={16} className="text-[#D9FF66]" /><span className="text-xs font-black text-white uppercase">2. Molturación</span></div>
                                    <div
                                        className={`bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-full ${report.millingBatch ? 'hover:border-black cursor-pointer hover:shadow-md transition-all' : ''}`}
                                        onClick={() => report.millingBatch && navigateTraceability(report.millingBatch.id)}
                                    >
                                        {report.millingBatch ? (
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-2xl font-black text-[#111111] mb-1">{report.millingBatch.id}</h4>
                                                    <p className="text-xs font-bold text-gray-500 uppercase">{String(report.millingBatch.variedad)}</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                                                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Entrada</p>
                                                        <p className="text-sm font-black text-[#111111]">{report.millingBatch.kilos_aceituna.toLocaleString()} kg</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                                                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Aceite</p>
                                                        <p className="text-sm font-black text-[#111111]">{report.millingBatch.kilos_aceite_real.toLocaleString()} kg</p>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Fecha Proceso</p>
                                                    <div className="flex items-center gap-2 text-sm font-black text-[#111111]">
                                                        <div className="p-1.5 bg-[#D9FF66] rounded-md text-black"><FileText size={12} /></div>
                                                        {new Date(report.millingBatch.fecha).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // SI ES NURSE ENTRY, MOSTRAMOS LOS LOTES DE PRODUCCIÓN ORIGEN
                                            report.nurseEntryData && report.nurseEntryData.sourceLPs.length > 0 ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="text-xs font-black uppercase text-gray-500">Lotes Producción Origen</p>
                                                    </div>
                                                    {report.nurseEntryData.sourceLPs.map(lp => (
                                                        <div
                                                            key={lp.id}
                                                            onClick={() => onViewProductionLot && onViewProductionLot(lp.id)}
                                                            className="bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-black cursor-pointer transition-all"
                                                        >
                                                            <p className="text-sm font-black text-[#111111] uppercase underline decoration-dotted">{lp.id}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold">{lp.totalRealOilKg.toLocaleString()} kg - {new Date(lp.fecha).toLocaleDateString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic mt-10 text-center">No asociado a lote industrial.</p>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 2.5 PRODUCCIÓN (TANDA) - OMITIR SI ES NURSE ENTRY (YA MOSTRAMOS ARRIBA) */}
                                {!report.nurseEntryData && (
                                    <div className="flex flex-col gap-6 min-w-[300px] flex-1">
                                        <div className="flex items-center gap-3 bg-purple-50 w-fit px-4 py-2 rounded-full border border-purple-100">
                                            <Calculator size={16} className="text-purple-700" />
                                            <span className="text-xs font-black text-purple-800 uppercase">2.5. Producción</span>
                                        </div>
                                        <div
                                            className={`bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col justify-between ${report.productionBatch ? 'hover:border-purple-200 cursor-pointer hover:shadow-md transition-all' : ''}`}
                                            onClick={() => report.productionBatch && onViewProductionLot && onViewProductionLot(report.productionBatch.id)}
                                        >
                                            {report.productionBatch ? (
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-2xl font-black text-[#111111] mb-1">{report.productionBatch.id}</h4>
                                                        <p className="text-xs font-bold text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded inline-block">Lote Producción</p>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Aceite Real Total</p>
                                                            <p className="text-3xl font-black text-[#111111]">{report.productionBatch.totalRealOilKg.toLocaleString()} <span className="text-sm text-gray-400">kg</span></p>
                                                        </div>

                                                        <div className="pt-3 border-t border-gray-100">
                                                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Rend. Industrial Real</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xl font-black text-purple-700">
                                                                    {((report.productionBatch.totalRealOilKg / report.productionBatch.totalOliveKg) * 100).toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                                    <Calculator size={32} className="text-gray-300 mb-2" />
                                                    <p className="text-xs font-bold text-gray-400">Sin datos de tanda agrupada</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 3. BODEGA (ALMACENAMIENTO) */}
                                <div className="flex flex-col gap-6 min-w-[300px] flex-1">
                                    <div className="flex items-center gap-3 bg-orange-50 w-fit px-4 py-2 rounded-full border border-orange-100"><Warehouse size={16} className="text-orange-700" /><span className="text-xs font-black text-orange-800 uppercase">3. Bodega</span></div>
                                    <div
                                        className={`bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-full relative overflow-hidden ${report.tankInfo ? 'hover:border-orange-200 cursor-pointer hover:shadow-md transition-all' : ''}`}
                                        onClick={() => report.tankInfo && onNavigateToTank && onNavigateToTank(report.tankInfo.id)}
                                    >
                                        {report.tankInfo ? (
                                            <div className="space-y-6 relative z-10">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">DEPÓSITO ORIGEN</p>
                                                    <h4 className="text-4xl font-black text-[#111111]">{report.tankInfo.name}</h4>
                                                    <p className="text-xs font-bold text-orange-600 uppercase mt-1">{report.tankInfo.variety_id}</p>
                                                </div>

                                                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[9px] font-black uppercase text-orange-800">Estado Actual</span>
                                                        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded text-orange-600">
                                                            {Math.round((report.tankInfo.currentKg / report.tankInfo.maxCapacityKg) * 100)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500" style={{ width: `${(report.tankInfo.currentKg / report.tankInfo.maxCapacityKg) * 100}%` }}></div>
                                                    </div>
                                                    <p className="text-right text-[10px] font-bold text-orange-800 mt-2">{report.tankInfo.currentKg.toLocaleString()} kg Disp.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                                <Warehouse size={40} className="mb-2 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-widest">Sin datos de bodega</p>
                                            </div>
                                        )}
                                        <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                                            <Warehouse size={200} />
                                        </div>
                                    </div>
                                </div>

                                {/* 3.5. LOTE ENTRADA NODRIZA (NUEVO PASO INTERMEDIO) - VISIBLE SI EXISTEN MOVIMIENTOS */}
                                {report.nurseMovements && report.nurseMovements.length > 0 && (
                                    <div className="flex flex-col gap-6 min-w-[300px] flex-1 animate-in slide-in-from-right-4">
                                        <div className="flex items-center gap-3 bg-[#111111] w-fit px-4 py-2 rounded-full"><Activity size={16} className="text-[#D9FF66]" /><span className="text-xs font-black text-white uppercase">3.5. Envasadora (Nodriza)</span></div>
                                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col justify-center space-y-4">
                                            {report.nurseMovements.map((mov, idx) => (
                                                <div key={idx} className="bg-[#F9FAF9] p-5 rounded-2xl border border-gray-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote Entrada (LE)</p>
                                                        <div className="p-1.5 bg-[#D9FF66] rounded-md text-black"><Droplets size={12} /></div>
                                                    </div>
                                                    <h4 className="text-xl font-black text-[#111111] mb-1">{mov.batch_id || 'LE-DESC'}</h4>
                                                    <p className="text-xs font-bold text-gray-500 mb-4">{new Date(mov.date).toLocaleDateString()}</p>

                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Transferido</span>
                                                        <span className="text-lg font-black text-[#111111]">{mov.kg.toLocaleString()} kg</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. DESTINO FINAL (COMERCIAL) */}
                                <div className="flex flex-col gap-6 min-w-[300px] flex-1">
                                    <div className="flex items-center gap-3 bg-blue-50 w-fit px-4 py-2 rounded-full border border-blue-100"><ShoppingCart size={16} className="text-blue-700" /><span className="text-xs font-black text-blue-800 uppercase">4. Destino Final</span></div>
                                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm min-h-[300px] flex flex-col space-y-4">

                                        {/* MODO ENVASADO (LOTES GENERADOS) - DISEÑO MEJORADO */}
                                        {report.relatedPackLots && report.relatedPackLots.length > 0 ? (
                                            <div className="flex-1 space-y-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase bg-black text-[#D9FF66] px-2 py-1 rounded">Lotes Envasado Generados</span>
                                                </div>
                                                <div className="overflow-y-auto max-h-[200px] custom-scrollbar space-y-3">
                                                    {report.relatedPackLots.map((lot, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-5 rounded-[24px] bg-[#111111] text-white shadow-lg border border-transparent hover:border-[#D9FF66] transition-all relative group"
                                                        >
                                                            <div className="flex justify-between items-start mb-3">
                                                                <p className="text-2xl font-black text-[#D9FF66] uppercase tracking-tighter">
                                                                    {lot.id}
                                                                </p>
                                                                <button
                                                                    onClick={() => navigateTraceability(lot.id)}
                                                                    className="p-2 bg-white/10 hover:bg-[#D9FF66] hover:text-black rounded-full transition-all text-white"
                                                                    title="Ver Detalle Lote"
                                                                >
                                                                    <Search size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="flex justify-between items-end">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">FORMATO</p>
                                                                    <p className="text-sm font-black uppercase">{lot.format}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">CANTIDAD</p>
                                                                    <p className="text-xl font-black">{lot.units} <span className="text-sm text-gray-500">uds</span></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            // MENSAJE SI NO HAY SALIDAS AÚN
                                            <div className="p-6 text-center border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 h-full opacity-50">
                                                <Truck size={32} className="text-gray-300" />
                                                <p className="text-xs text-gray-400 font-bold uppercase">Sin Salidas Registradas</p>
                                                <p className="text-[9px] text-gray-400">El aceite permanece en depósito o nodriza</p>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : hasSearched && (
                <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in"><div className="bg-gray-100 p-6 rounded-full mb-4"><SearchX size={48} className="text-gray-400" /></div><h3 className="text-xl font-black text-[#111111] uppercase mb-2">Sin resultados</h3><p className="text-gray-400 text-sm">Verifica el identificador e inténtalo de nuevo.</p></div>
            )}
        </div>
    );
};


import { supabase } from './supabase';

export interface SyncOperation {
    id: string;
    type: 'upsertProducer' | 'upsertVale' | 'upsertTank' | 'upsertMillingLot' | 'upsertProductionLot' | 'upsertPackagingLot' | 'upsertOilMovement' | 'upsertSalesOrder' | 'upsertPomaceExit' | 'upsertAuxEntry' | 'upsertOilExit' | 'upsertCustomer' | 'upsertAppConfig';
    payload: any;
    timestamp: number;
}

const QUEUE_KEY = 'almazara_sync_queue';

export const syncQueue = {
    get: (): SyncOperation[] => {
        try {
            const saved = localStorage.getItem(QUEUE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error reading sync queue', e);
            return [];
        }
    },

    add: (op: Omit<SyncOperation, 'id' | 'timestamp'>) => {
        let queue = syncQueue.get();

        // DEDUPLICAR: Evita que operaciones antiguas sobreescriban a las nuevas
        if (op.payload && (op.payload.id || op.payload.id_vale)) {
            queue = queue.filter(item => {
                if (item.type !== op.type) return true;
                const matchId = op.payload.id && item.payload.id === op.payload.id;
                const matchSeq = op.payload.id_vale && item.payload.id_vale === op.payload.id_vale;
                return !(matchId || matchSeq);
            });
        }

        const newOp: SyncOperation = {
            ...op,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        queue.push(newOp);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`Operación ${op.type} encolada offline (deduplicada)`);
    },

    remove: (id: string) => {
        const queue = syncQueue.get().filter(op => op.id !== id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    },

    clear: () => {
        localStorage.removeItem(QUEUE_KEY);
    }
};

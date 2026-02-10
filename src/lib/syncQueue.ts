
import { supabase } from './src/lib/supabase';

export interface SyncOperation {
    id: string;
    type: 'upsertProducer' | 'upsertVale' | 'upsertTank' | 'upsertMillingLot' | 'upsertProductionLot' | 'upsertPackagingLot' | 'upsertOilMovement' | 'upsertSalesOrder' | 'upsertPomaceExit' | 'upsertAuxEntry' | 'upsertOilExit' | 'upsertCustomer';
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
        const queue = syncQueue.get();
        const newOp: SyncOperation = {
            ...op,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        queue.push(newOp);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`Operación ${op.type} encolada offline`);
    },

    remove: (id: string) => {
        const queue = syncQueue.get().filter(op => op.id !== id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    },

    clear: () => {
        localStorage.removeItem(QUEUE_KEY);
    }
};

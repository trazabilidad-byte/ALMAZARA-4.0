
import { useEffect, useState } from 'react';
import { syncQueue, SyncOperation } from './syncQueue';
import * as api from './supabaseSync';

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(syncQueue.get().length);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            processQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Verificación inicial
        if (navigator.onLine) {
            processQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const processQueue = async () => {
        const queue = syncQueue.get();
        if (queue.length === 0 || isSyncing) return;

        setIsSyncing(true);
        console.log(`Iniciando sincronización de ${queue.length} operaciones...`);

        for (const op of queue) {
            try {
                const fn = (api as any)[op.type];
                if (typeof fn === 'function') {
                    console.log(`Intentando sincronizar ${op.type} (${op.id})...`);
                    const { error } = await fn(op.payload, true);
                    if (!error) {
                        console.log(`Sincronización exitosa: ${op.type}`);
                        syncQueue.remove(op.id);
                        setPendingCount(prev => prev - 1);
                    } else {
                        console.error(`Error de Supabase en ${op.type}:`, error.message, error.details);
                        // Si es un error de red, paramos. Si es un error de datos (400, 409...), seguimos con el siguiente.
                        if (error.status >= 400 && error.status < 500) {
                            console.warn("Error de validación detectado. Continuando con el resto de la cola.");
                            continue;
                        }
                        break;
                    }
                }
            } catch (err) {
                console.error(`Fallo crítico procesando cola para ${op.id}`, err);
                break;
            }
        }

        setIsSyncing(false);
        setPendingCount(syncQueue.get().length);
    };

    return { isOnline, isSyncing, pendingCount, forceSync: processQueue };
};

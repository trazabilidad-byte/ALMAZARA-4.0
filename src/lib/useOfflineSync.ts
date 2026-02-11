
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
                        console.log(`✅ Sincronización exitosa: ${op.type}`);
                        syncQueue.remove(op.id);
                        setPendingCount(prev => prev - 1);
                    } else {
                        console.error(`❌ Error de Supabase en ${op.type}:`, error);

                        // Códigos de error de Supabase/PostgREST
                        const isAuthError = error.status === 403 || error.code === '42501' || error.status === 401;
                        const isValidationError = (error.status >= 400 && error.status < 500) && !isAuthError;

                        if (isValidationError) {
                            console.warn("⚠️ Error de validación detectado. Eliminando de la cola para no bloquear.");
                            syncQueue.remove(op.id);
                            setPendingCount(prev => prev - 1);
                            continue;
                        }

                        // Si es error de auth o red, paramos la ejecución de la cola
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

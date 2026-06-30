'use client';
import type { SystemConfig, UpdateSystemConfigDto } from '@/@core/types/system-config';
import apiClient from '@/lib/apiClient';
import { useCallback, useState } from 'react';

export type UseSystemConfigOptions = {};

export type UseSystemConfigResult = {
    data: SystemConfig | null;
    loading: boolean;
    error: unknown;
    fetchConfig: () => Promise<void>;
    updateConfig: (dto: UpdateSystemConfigDto) => Promise<void>;
    reloadConfig: () => Promise<void>;
    updating: boolean;
    reloading: boolean;
};

/**
 * Hook para gestionar la configuración del sistema
 */
export function useSystemConfig(
    options: UseSystemConfigOptions = {}
): UseSystemConfigResult {

    const [data, setData] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [updating, setUpdating] = useState<boolean>(false);
    const [reloading, setReloading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>(null);

    // Obtener configuración actual
    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await apiClient.get<SystemConfig>('/system-config');
            setData(res.data);
        } catch (e: any) {
            console.log('Error fetching system config:', e);
            setError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    // Actualizar configuración
    const updateConfig = useCallback(
        async (dto: UpdateSystemConfigDto) => {
            setUpdating(true);
            setError(null);

            try {
                const res = await apiClient.patch<SystemConfig>('/system-config', dto);
                setData(res.data);
            } catch (e: any) {
                setError(e);
                throw e;
            } finally {
                setUpdating(false);
            }
        },
        []
    );

    // Recargar configuración desde BD
    const reloadConfig = useCallback(async () => {
        setReloading(true);
        setError(null);

        try {
            const res = await apiClient.get<SystemConfig>('/system-config/reload');
            setData(res.data);
        } catch (e: any) {
            setError(e);
            throw e;
        } finally {
            setReloading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        fetchConfig,
        updateConfig,
        reloadConfig,
        updating,
        reloading,
    };
}

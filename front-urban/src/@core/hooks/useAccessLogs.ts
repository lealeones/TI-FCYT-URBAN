// src/@core/hooks/useAccessLogs.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { useUserAuth } from '@/app/context/UserAuth';

export type AccessLog = {
    id: string;
    userId: string;
    direction: 'INGRESS' | 'EGRESS';
    timestamp: string;
};

export type ResponseAccessLogs = {
    userId: string;
    name: string;
    accessLogs: AccessLog[];
};

export function useAccessLogs(userId?: string, date?: string, enabled: boolean = true) {
    const { token } = useUserAuth();
    const [data, setData] = useState<ResponseAccessLogs | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(
        async (signal?: AbortSignal) => {
            if (!enabled || !userId || !date) return;
            setLoading(true);
            setError(null);
            try {
                const res = await apiClient.get<ResponseAccessLogs>('/attendance', {
                    params: { userId, date },
                    signal,
                });
                setData(res.data);
            } catch (e: any) {
                if (e?.name === 'CanceledError') return;
                setError(e?.response?.data?.message ?? 'No se pudieron cargar los registros de acceso.');
            } finally {
                setLoading(false);
            }
        },
        [enabled, userId, date, token]
    );

    useEffect(() => {
        const ctrl = new AbortController();
        fetchData(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}

// hooks/useWhatsappStatus.ts
'use client';
import useSWR from 'swr';
import apiClient from '@/lib/apiClient';

const WHATSAPP_STATUS_PATH = '/whatsapp/status';

const fetcher = async (path: string) => {
    const res = await apiClient.get(path);
    return res.data; // { status, phone, qr }
};

export type UseWhatsappStatusOptions = {};

export function useWhatsappStatus(_options: UseWhatsappStatusOptions = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        WHATSAPP_STATUS_PATH,
        fetcher,
        {
            // más frecuencia si NO hay sesión; más relajado si ya está conectada
            refreshInterval: (data) =>
                data?.status === 'Correcto' ? 30_000 : 3_000,
            revalidateOnFocus: false,
            shouldRetryOnError: true,
        }
    );

    return {
        status: data?.status ?? 'Sin session',
        phone: data?.phone ?? 'No disponible',
        qr: data?.qr ?? null,
        loading: isLoading,
        error,
        refresh: () => mutate(), // botón "Actualizar"
    };
}

// useUsuarios.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { Usuario } from '@/views/usuarios/usuarios.dto';

type Options = {
    /** Lanza el fetch al montar el hook (default: true) */
    auto?: boolean;
};

type UseUsuariosResult = {
    data: Usuario[];
    loading: boolean;
    error: unknown;
    /** Vuelve a pedir la lista */
    refresh: () => Promise<void>;
    /** Setea manualmente el array (útil para optimist updates) */
    setData: React.Dispatch<React.SetStateAction<Usuario[]>>;
};

export function useUsuarios(opts: Options = {}): UseUsuariosResult {
    const { auto = true } = opts;

    const [data, setData] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState<boolean>(auto);
    const [error, setError] = useState<unknown>(null);

    // guardamos una referencia al abortController para cancelar en unmount
    const abortRef = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        // cancelar request previa si hubiera
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
<<<<<<< Updated upstream
            const res = await apiClient.get<Usuario[]>('/users', { signal: ac.signal });
=======
            if (!token) throw new Error('Token no encontrado');

            // Asegurar que baseUrl no esté vacío
            const backendUrl = baseUrl
            const url = `${backendUrl}/users`;


            const res = await axios.get<Usuario[]>(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal: ac.signal, // axios v1 soporta AbortController
            });

>>>>>>> Stashed changes
            setData(res.data ?? []);
        } catch (e: any) {
            if (e?.name === 'CanceledError' || e?.message === 'canceled') return;
            setError(e);
            console.error('Error al obtener usuarios:', e);
        } finally {
            if (!ac.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auto) refresh();
        return () => {
            // cancelar si el componente se desmonta
            abortRef.current?.abort();
        };
    }, [auto, refresh]);

    return { data, loading, error, refresh, setData };
}

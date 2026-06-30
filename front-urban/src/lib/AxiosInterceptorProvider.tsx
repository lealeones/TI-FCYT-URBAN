'use client';

import { useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/app/context/UserAuth';
import apiClient from './apiClient';

/**
 * Debe montarse dentro de <UserAuthProvider>.
 *
 * - Request interceptor: añade Authorization: Bearer <token> en cada llamada de apiClient.
 * - Response interceptor: si el backend responde 401, redirige a /unauthorized.
 *
 * Usa useLayoutEffect para que los interceptores queden registrados ANTES
 * de que cualquier useEffect en componentes hijos dispare requests.
 */
export function AxiosInterceptorProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { token } = useUserAuth();

    // El ref se inicializa con el token actual en el montaje.
    // useLayoutEffect lo mantiene sincronizado antes de que corran los useEffect de hijos.
    const tokenRef = useRef(token);
    useLayoutEffect(() => {
        tokenRef.current = token;
    }, [token]);

    useLayoutEffect(() => {
        const requestId = apiClient.interceptors.request.use(config => {
            if (tokenRef.current) {
                config.headers.Authorization = `Bearer ${tokenRef.current}`;
            }
            return config;
        });

        const responseId = apiClient.interceptors.response.use(
            response => response,
            error => {
                if (error?.response?.status === 401) {
                    router.push('/unauthorized');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            apiClient.interceptors.request.eject(requestId);
            apiClient.interceptors.response.eject(responseId);
        };
    }, [router]);

    return <>{children}</>;
}

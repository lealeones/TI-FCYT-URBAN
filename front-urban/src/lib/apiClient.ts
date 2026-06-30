import axios from 'axios';

/**
 * Instancia axios compartida para todas las llamadas al backend.
 * - baseURL apunta a NEXT_PUBLIC_BACKEND_URL
 * - El header Authorization se inyecta automáticamente por AxiosInterceptorProvider
 *   cuando el usuario está autenticado.
 */
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? '',
});

export default apiClient;

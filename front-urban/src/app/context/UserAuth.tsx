'use client';

import {
    createContext,
    useContext,
    useMemo,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Type del usuario retornado del backend
export type User = {
    id: string;
    createdAt: Date;
    name: string;
    customId: string;
    dni: string | null;
    phone: string | null;
    birth: Date | null;
    rfid: string | null;
    deleted: Date | null;
    role: string; // $Enums.UserRole
};

type Ctx = {
    user: User | null;
    token?: string;
    isAuthorized: boolean;
    loading: boolean;
    redirectUrl?: string;
};

// Loader simple (reemplazalo por el tuyo si querés)
function LoadingScreen() {
    return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexDirection: 'column' }}>
            <div aria-label="cargando" style={{ width: 36, height: 36, border: '4px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
            <span style={{ opacity: 0.7 }}>Validando acceso…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

const UserAuthContext = createContext<Ctx>({
    user: null,
    isAuthorized: false,
    loading: true,
});

// utils auth storage (localStorage)
function getLocalAuth(): (CookiePayload & { expiresAt?: number }) | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('authToken');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CookiePayload & { expiresAt?: number };
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem('authToken');
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
function setLocalAuth(payload: CookiePayload, maxAgeSec: number) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', JSON.stringify({ ...payload, expiresAt: Date.now() + maxAgeSec * 1000 }));
}
function deleteLocalAuth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
}

// Mapeo de redirects del backend
const REDIRECT_MAP: Record<string, string> = {
    FRONT: '/',
    SESSION: '/clases',
    USER: '/usuarios',
    WHATSAPP: '/whatsapp',
};

// Resuelve redirect a un path interno seguro
function resolveRedirect(input?: string): string | null {
    if (!input) return null;

    // 1) token enum → path
    const upper = input.toUpperCase();
    if (upper in REDIRECT_MAP) return REDIRECT_MAP[upper];

    // 2) path interno
    if (input.startsWith('/')) return input;

    // 3) URL absoluta same-origin → devolver path
    try {
        const u = new URL(input, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        if (typeof window !== 'undefined' && u.origin === window.location.origin) {
            return u.pathname + u.search + u.hash;
        }
        return null; // externo → ignorar
    } catch {
        return null;
    }
}

type CookiePayload = {
    token: string;
    validatedAt: number;
    user?: User | null;
    redirectUrl?: string; // puede venir enum o path
};

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const tParam = searchParams?.get('t') ?? null;

    const [token, setToken] = useState<string | undefined>();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [redirectUrl, setRedirectUrl] = useState<string | undefined>();

    // ------ Guards / control de concurrencia ------
    const processedTokenRef = useRef<string | null>(null); // evita validar 2 veces el mismo t
    const requestIdRef = useRef(0);                        // ignora respuestas viejas
    const justCleanedUrlRef = useRef(false);               // evita revalidar tras limpiar ?t=

    // limpiar ?t= sin navegar (no cancela requests)
    const cleanQueryToken = () => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('t')) {
            url.searchParams.delete('t');
            window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
            justCleanedUrlRef.current = true;
        }
    };

    useEffect(() => {
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

        // no validar dentro de /unauthorized (evita ping-pong)
        if (pathname === '/unauthorized') {
            setAuthorized(false);
            setToken(undefined);
            setUser(null);
            setRedirectUrl(undefined);
            setLoading(false);
            return;
        }

        // si recién limpiamos la URL, no revalidar otra vez
        if (justCleanedUrlRef.current) {
            justCleanedUrlRef.current = false;
            setLoading(false);
            return;
        }

        // --------- PRIORIDAD: token en URL -----------
        if (tParam) {
            if (processedTokenRef.current === tParam) {
                // si quedó el query, limpiarlo
                cleanQueryToken();
                setLoading(false);
                return;
            }

            processedTokenRef.current = tParam;

            const myId = ++requestIdRef.current;
            (async () => {
                setLoading(true);
                let ok = false;
                let serverUser: User | null = null;
                let serverRedirect: string | undefined;

                try {
                    const res = await fetch(`/api/auth/verify?t=${encodeURIComponent(tParam)}`, { cache: 'no-store' });
                    const data = await res.json().catch(() => ({ autorizado: false }));
                    ok = !!data?.autorizado;
                    if (ok) {
                        serverUser = data?.user || null;
                        serverRedirect = data?.redirectUrl || undefined;
                    }
                } catch {
                    ok = false;
                }

                if (myId !== requestIdRef.current) return;

                if (!ok) {
                    deleteLocalAuth();
                    setAuthorized(false);
                    setToken(undefined);
                    setUser(null);
                    setRedirectUrl(undefined);
                    setLoading(false);
                    router.replace('/unauthorized');
                    return;
                }

                // persistir en localStorage 1h
                const payload: CookiePayload = {
                    token: tParam,
                    validatedAt: Date.now(),
                    ...(serverUser ? { user: serverUser } : {}),
                    ...(serverRedirect ? { redirectUrl: serverRedirect } : {}),
                };
                setLocalAuth(payload, 60 * 60);

                // estado ok
                setToken(tParam);
                setUser(serverUser);
                setRedirectUrl(serverRedirect);
                setAuthorized(true);
                setLoading(false);

                // Redirect con full reload: el token ya está guardado en localStorage,
                // así que el nuevo mount lo leerá sin race condition.
                const path = resolveRedirect(serverRedirect);
                if (path && path !== pathname) {
                    window.location.replace(path);
                } else {
                    // mismo path → limpiar ?t= de la URL sin navegar
                    cleanQueryToken();
                }
            })();

            return; // no continuar con rama de cookie si hay t
        }

        // --------- SIN t: usar localStorage -----------
        const parsed = getLocalAuth();
        if (!parsed?.token) {
            deleteLocalAuth();
            setAuthorized(false);
            setToken(undefined);
            setUser(null);
            setRedirectUrl(undefined);
            setLoading(false);
            router.replace('/unauthorized');
            return;
        }

        const ageMs = Date.now() - parsed.validatedAt;
        const shouldRevalidate = ageMs > 5 * 60 * 1000; // 5 min

        if (!shouldRevalidate) {
            setToken(parsed.token);
            setUser(parsed.user || null);
            setRedirectUrl(parsed.redirectUrl);
            setAuthorized(true);
            setLoading(false);

            // REDIRECT mapeado si hubiera en cookie
            const path = resolveRedirect(parsed.redirectUrl);
            if (path && path !== pathname) {
                router.replace(path);
            }
            return;
        }

        // cookie vieja → revalidar una vez
        const myId = ++requestIdRef.current;
        (async () => {
            setLoading(true);
            let ok = false;
            let serverUser: User | null = null;
            let serverRedirect: string | undefined;

            try {
                const res = await fetch(`/api/auth/verify?t=${encodeURIComponent(parsed!.token)}`, { cache: 'no-store' });
                const data = await res.json().catch(() => ({ autorizado: false }));
                ok = !!data?.autorizado;
                if (ok) {
                    serverUser = data?.user || null;
                    serverRedirect = data?.redirectUrl || undefined;
                }
            } catch {
                ok = false;
            }

            if (myId !== requestIdRef.current) return;

            if (!ok) {
                deleteLocalAuth();
                setAuthorized(false);
                setToken(undefined);
                setUser(null);
                setRedirectUrl(undefined);
                setLoading(false);
                router.replace('/unauthorized');
                return;
            }

            const finalUser = serverUser ?? parsed!.user ?? null;
            const finalRedirect = serverRedirect ?? parsed!.redirectUrl;

            const payload: CookiePayload = {
                token: parsed!.token,
                validatedAt: Date.now(),
                ...(finalUser ? { user: finalUser } : {}),
                ...(finalRedirect ? { redirectUrl: finalRedirect } : {}),
            };
            setLocalAuth(
                payload,
                // NEXT_PUBLIC_MIN_AUTH está en minutos → convertir a segundos
                process.env.NEXT_PUBLIC_MIN_AUTH !== undefined
                    ? +process.env.NEXT_PUBLIC_MIN_AUTH * 60
                    : 30 * 60
            );

            setToken(parsed!.token);
            setUser(finalUser);
            setRedirectUrl(finalRedirect);
            setAuthorized(true);
            setLoading(false);

            const path = resolveRedirect(finalRedirect);
            if (path && path !== pathname) {
                router.replace(path);
            }
        })();
    }, [tParam, router]);

    const value = useMemo<Ctx>(() => {
        return {
            user,
            token,
            isAuthorized: authorized,
            loading,
            redirectUrl,
        };
    }, [token, authorized, loading, user, redirectUrl]);

    // Gate: loader mientras valida; oculta children si no autorizado
    if (loading) {
        return <UserAuthContext.Provider value={value}><LoadingScreen /></UserAuthContext.Provider>;
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (!authorized && pathname !== '/unauthorized') {
        return <UserAuthContext.Provider value={value}>{null}</UserAuthContext.Provider>;
    }

    return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
    return useContext(UserAuthContext);
}

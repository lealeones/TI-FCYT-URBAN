// useDashboard.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '@/lib/apiClient'
import { useUserAuth } from '@/app/context/UserAuth'

export type DashboardUser = {
    message: string
    accessLog: { currentAccess: string; lastAccess: string }
    cardDetails: { sessions: number; users: number; assistants: number; revenue: number }
    sessions: { id: string; description: string; instructors: string; startDate: string }[]
}

type Options = {
    auto?: boolean
}

type UseDashboardResult = {
    data: DashboardUser | null
    loading: boolean
    error: unknown
    refresh: () => Promise<void>
}

export function useDashboard(opts: Options = {}): UseDashboardResult {
    const { token } = useUserAuth()
    const { auto = true } = opts

    const [data, setData] = useState<DashboardUser | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<unknown>(null)

    const abortRef = useRef<AbortController | null>(null)

    const refresh = useCallback(async () => {
        // si no hay token aún, no pidas nada ni cambies loading
        if (!token) return

        setLoading(true)
        setError(null)

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
            const res = await apiClient.get<DashboardUser>('/dashboard', { signal: ac.signal })
            setData(res.data ?? null)
        } catch (e: any) {
            if (e?.name === 'CanceledError' || e?.message === 'canceled') return
            setError(e)
            console.error('Error al obtener dashboard:', e)
        } finally {
            if (!ac.signal.aborted) setLoading(false)
        }
    }, [token]) // ← incluye token!

    useEffect(() => {
        if (auto && token) refresh() // ← solo cuando haya token
        return () => abortRef.current?.abort()
    }, [auto, token, refresh]) // ← depende de token también

    return { data, loading, error, refresh }
}

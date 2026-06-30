// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const t = searchParams.get('t');

        if (!t) {
            return NextResponse.json({ autorizado: false }, { status: 400 });
        }

        // timeout 10s
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);

        let upstream: Response;
        try {
            upstream = await fetch(
                `${process.env.BACKEND_URL}/auth/verify?t=${encodeURIComponent(t)}`,
                {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller.signal,
                }
            );
        } catch {
            clearTimeout(timer);
            return NextResponse.json({ autorizado: false }, { status: 502 });
        } finally {
            clearTimeout(timer);
        }

        let data: any = null;
        try {
            data = await upstream.json();
        } catch {
            return NextResponse.json({ autorizado: false }, { status: 502 });
        }

        const autorizado = Boolean(data?.autorizado);
        const user = autorizado ? data?.user : undefined;
        const redirectUrl = autorizado ? (data?.redirectUrl as string | undefined) : undefined;

        if (!upstream.ok) {
            const status = upstream.status === 401 || upstream.status === 403 ? 401 : 502;
            return NextResponse.json({ autorizado: false }, { status });
        }

        if (!autorizado) {
            return NextResponse.json({ autorizado: false }, { status: 401 });
        }

        return NextResponse.json({ autorizado: true, user, redirectUrl }, { status: 200 });
    } catch {
        return NextResponse.json({ autorizado: false }, { status: 500 });
    }
}

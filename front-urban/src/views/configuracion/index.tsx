'use client';

import {
    Box, Grid, Card, CardContent, Typography, Chip, Button, CircularProgress,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useUserAuth } from '@/app/context/UserAuth';
import apiClient from '@/lib/apiClient';

const WHATSAPP_STATUS_URL = '/whatsapp/status';

type WhatsappStatusResp = {
    status: 'Correcto' | 'Sin session' | string;
    phone: string | null;
    qr: string | null;
};

const ensureDataUrl = (qr: string | null) => (qr ? (qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`) : null);

const WhatsAppComponent = () => {
    const { token } = useUserAuth();

    const [qrSrc, setQrSrc] = useState<string | null>(null);
    const [waStatus, setWaStatus] = useState<string>('Sin session');
    const [phone, setPhone] = useState<string>('No disponible');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const inFlight = useRef(false); // evita solapar requests del polling

    const applyStatus = (json: WhatsappStatusResp) => {
        setWaStatus(json.status ?? 'Sin session');
        setPhone(json.phone ?? 'No disponible');
        setQrSrc(ensureDataUrl(json.qr ?? null));
        setErr(null);
    };

    const fetchStatus = async (opts?: { silent?: boolean }) => {
        if (!token) return;

        const silent = opts?.silent === true;
        if (!silent) {
            setLoading(true);
            setErr(null);
        }

        try {
            const res = await apiClient.get<WhatsappStatusResp>(WHATSAPP_STATUS_URL);
            applyStatus(res.data);
        } catch (e: any) {
            if (!silent) {
                setErr(e?.response?.data?.message || e?.message || 'Error obteniendo estado de WhatsApp');
                setWaStatus('Sin session');
                setPhone('No disponible');
                setQrSrc(null);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Primer fetch
    useEffect(() => {
        fetchStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Polling cada 5s (silencioso)
    useEffect(() => {
        if (!token) return;

        const tick = async () => {
            if (document.hidden) return;           // opcional: no refrescar si la pestaña está oculta
            if (inFlight.current) return;          // evita superposición
            inFlight.current = true;
            try {
                await fetchStatus({ silent: true });
            } finally {
                inFlight.current = false;
            }
        };

        const id = setInterval(tick, 5000);
        // correr una vez al montar para no esperar 5s
        tick();

        return () => clearInterval(id);
    }, [token]);

    const chipColor = err ? 'error' : waStatus === 'Correcto' ? 'success' : 'warning';

    return (
        <Box p={4} width="100%" sx={{ minHeight: '100vh' }}>
            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} sm={8} md={5} lg={4}>
                    <Card
                        sx={{
                            borderRadius: 5,
                            overflow: 'hidden',
                            bgcolor: '#0f1620',
                            boxShadow: '0 10px 35px rgba(0,0,0,0.45)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'transform .25s ease, box-shadow .25s ease',
                            '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 50px rgba(0,0,0,0.55)' },
                        }}
                    >
                        <Box
                            sx={{
                                position: 'relative', width: '100%', pt: '100%',
                                background: 'radial-gradient(100% 100% at 0% 0%, #1b2230 0%, #101826 60%)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            {loading ? (
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CircularProgress />
                                </Box>
                            ) : qrSrc ? (
                                <Box
                                    component="img"
                                    src={qrSrc}
                                    alt="QR"
                                    sx={{
                                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', p: 4,
                                        filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.35))'
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.6)', p: 2, textAlign: 'center'
                                    }}
                                >
                                    {err || 'No hay QR disponible'}
                                </Box>
                            )}
                        </Box>

                        <CardContent sx={{ p: 3.5 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3, color: 'white' }}>
                                    Bot de WhatsApp
                                </Typography>
                                <Chip label={err ? 'Error' : waStatus} color={chipColor as any} size="small" sx={{ fontWeight: 600, px: 1 }} />
                            </Box>

                            <Box display="flex" gap={1}>
                                <Button variant="contained" onClick={() => fetchStatus()} disabled={loading} sx={{ textTransform: 'none' }}>
                                    {loading ? 'Actualizando…' : 'Actualizar ahora'}
                                </Button>
                            </Box>

                            <Typography variant="body2" sx={{ color: 'rgba(230,237,243,.7)', fontSize: '0.95rem', mt: 1.5 }}>
                                Teléfono:{' '}
                                <Box component="span" sx={{ color: '#e6edf3', fontWeight: 600 }}>
                                    {phone}
                                </Box>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default WhatsAppComponent;

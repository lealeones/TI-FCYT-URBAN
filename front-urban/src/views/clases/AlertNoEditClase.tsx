'use client';

import React, { useMemo, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Button,
    Stack,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import axios from 'axios';
import CustomDialog from '@/utils/CustomDialog';
import { DeactivateDialog } from './DesactivateDialog';
dayjs.locale('es');

/** ===== Tipos ===== */
export type Clase = {
    id: string;
    type: 'ONE_TIME' | 'RECURRING';
    description?: string;
    startDate?: string;
    endDate?: string;
    instructors?: Array<{ id: string; name: string }>;
    SessionDateSnapshot?: Array<{
        dateRange?: { start?: string; end?: string };
    }>;
};

/** ===== Utils de formato ===== */
const fmtD = (iso?: string | null) =>
    iso && dayjs(iso).isValid() ? dayjs(iso).format('DD/MM/YYYY') : '—';

const fmtT = (iso?: string | null) =>
    iso && dayjs(iso).isValid() ? dayjs(iso).format('HH:mm') : '—';

/** ===== Reglas de bloqueo =====
 * ONE_TIME: bloquear SOLO si TODAS las ocurrencias ya comenzaron (start < now)
 * RECURRING: bloquear si TODAS las ocurrencias conocidas ya comenzaron (o el inicio global ya pasó sin snaps)
 */
function computeEditLockReason(clase?: Clase): string | null {
    if (!clase) return null;
    const now = dayjs();
    const snaps = clase.SessionDateSnapshot ?? [];

    const getStart = (s?: { dateRange?: { start?: string } }) =>
        dayjs(s?.dateRange?.start ?? null);

    if (clase.type === 'ONE_TIME') {
        if (snaps.length > 0) {
            const allStarted = snaps.every((s) => {
                const st = getStart(s);
                return st.isValid() && st.isBefore(now);
            });
            if (allStarted) {
                return 'Esta clase puntual ya comenzó (todas sus ocurrencias) y no se puede editar. Solo puedes darla de baja.';
            }
            return null;
        } else {
            if (clase.startDate && dayjs(clase.startDate).isBefore(now)) {
                return 'Esta clase puntual ya comenzó y no se puede editar. Solo puedes darla de baja.';
            }
            return null;
        }
    }

    // RECURRING
    if (snaps.length > 0) {
        const allStarted = snaps.every((s) => {
            const st = getStart(s);
            return st.isValid() && st.isBefore(now);
        });
        if (allStarted) {
            return 'Todas las ocurrencias de esta clase recurrente ya comenzaron. Solo puedes darla de baja.';
        }
    } else {
        if (clase.startDate && dayjs(clase.startDate).isBefore(now)) {
            return 'El rango de esta clase ya comenzó. Solo puedes darla de baja.';
        }
    }

    return null;
}

/** 🔹 Export util: saber si está bloqueada */
export function isClaseEditLocked(clase?: Clase) {
    return !!computeEditLockReason(clase);
}

/** ===== Rango de fechas (snapshots) con fallback ===== */
function computeDateRange(clase?: Clase) {
    if (!clase) return { from: '—', to: '—' };
    const snaps = clase.SessionDateSnapshot ?? [];
    if (snaps.length > 0) {
        const starts = snaps.map((s) => s.dateRange?.start).filter(Boolean) as string[];
        const ends = snaps.map((s) => s.dateRange?.end).filter(Boolean) as string[];
        if (starts.length && ends.length) {
            const minStart = starts.reduce((a, b) => (dayjs(a).isBefore(b) ? a : b));
            const maxEnd = ends.reduce((a, b) => (dayjs(a).isAfter(b) ? a : b));
            return { from: fmtD(minStart), to: fmtD(maxEnd) };
        }
    }
    return { from: fmtD(clase.startDate), to: fmtD(clase.endDate) };
}

/** ===== Rango de horarios (snapshots) con fallback ===== */
function computeTimeRange(clase?: Clase) {
    if (!clase) return { from: '—', to: '—' };
    const snaps = clase.SessionDateSnapshot ?? [];
    if (snaps.length > 0) {
        const startTimes = snaps.map((s) => s.dateRange?.start).filter(Boolean) as string[];
        const endTimes = snaps.map((s) => s.dateRange?.end).filter(Boolean) as string[];

        if (startTimes.length && endTimes.length) {
            const minStart = startTimes
                .map((x) => dayjs(x))
                .filter((d) => d.isValid())
                .sort((a, b) => a.valueOf() - b.valueOf())[0];
            const maxEnd = endTimes
                .map((x) => dayjs(x))
                .filter((d) => d.isValid())
                .sort((a, b) => b.valueOf() - a.valueOf())[0];
            return { from: fmtT(minStart?.toISOString()), to: fmtT(maxEnd?.toISOString()) };
        }
    }
    return { from: fmtT(clase.startDate), to: fmtT(clase.endDate) };
}




/** ===== Alert principal (default) ===== */
type AlertNoEditProps = {
    clase?: Clase;
    hideDeactivateButton?: boolean;
    token?: string;
    onDeactivated?: () => void;
};

const AlertNoEditClase: React.FC<AlertNoEditProps> = ({
    clase,
    hideDeactivateButton,
    token,
    onDeactivated,
}) => {
    const reason = useMemo(() => computeEditLockReason(clase), [clase]);
    const dateRange = useMemo(() => computeDateRange(clase), [clase]);
    const timeRange = useMemo(() => computeTimeRange(clase), [clase]);
    const profesores =
        (clase?.instructors ?? []).map((i) => i.name).join(', ') || '—';

    const [openConfirm, setOpenConfirm] = useState(false);

    if (!reason) return null;

    const canOpenDialog = !!(clase?.id);

    return (
        <>
            <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
                <AlertTitle>No se puede editar</AlertTitle>
                {reason}

                {/* Mini ficha descriptiva */}
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    <Typography variant="body2">
                        <strong>Descripción:</strong> {clase?.description || '—'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Profesor:</strong> {profesores}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Rango de fechas:</strong> {dateRange.from} — {dateRange.to}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Rango de horarios:</strong> {timeRange.from} — {timeRange.to}
                    </Typography>
                </Stack>

                {!hideDeactivateButton && (
                    <Stack direction="row" sx={{ mt: 1 }}>
                        <Button
                            variant="outlined"
                            color="warning"
                            onClick={() => setOpenConfirm(true)}
                        >
                            Dar de baja
                        </Button>
                    </Stack>
                )}
            </Alert>

            {/* Diálogo reutilizable con lógica interna */}
            {clase?.id && (
                <DeactivateDialog
                    open={openConfirm}
                    onClose={() => setOpenConfirm(false)}
                    modelId={clase.id}
                    model='session'
                    claseDescription={clase.description}
                    onSuccess={onDeactivated}
                />
            )}
        </>
    );
};

export default AlertNoEditClase;

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
    IconButton,
    Tooltip,
    Paper,
    Grid,
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '@/lib/apiClient';
import { useUserAuth } from '@/app/context/UserAuth';
import 'dayjs/locale/es';
import AlertNoEditClase, { isClaseEditLocked } from './AlertNoEditClase';
import CustomDialog from '@/utils/CustomDialog';
import { DeactivateDialog } from './DesactivateDialog';
import { DIALOG_INFO } from '@/configs/dialogInfoContent';
dayjs.locale('es');


type Instructor = { id: string; name: string; customId?: string };
type SessionType = 'RECURRING' | 'ONE_TIME';

type OneTimeRow = {
    date: Dayjs | null;
    startTime: Dayjs | null;
    endTime: Dayjs | null;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onRefresh: () => Promise<void> | void;
    clase?: any;
    instructores: Instructor[];
};


const DIAS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const; // 0..6

const toDayIdx = (iso: string) => dayjs(iso).day(); // 0..6
const toHM = (iso: string) => ({
    h: dayjs(iso).hour(),
    m: dayjs(iso).minute(),
});

export default function DialogUpsertClase({
    open,
    onClose,
    onRefresh,
    clase,
    instructores,
}: Props) {
    const { token } = useUserAuth();
    const today = dayjs().startOf('day');
    const editLocked = isClaseEditLocked(clase);

    // --------- Estados base ---------
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState<string>('');
    const [type, setType] = useState<SessionType>('RECURRING');
    const [instructorId, setInstructorId] = useState<string>('');
    const [amount, setAmount] = useState<string>('0');

    // --------- Estado para DeactivateDialog ---------
    const [openDeactivate, setOpenDeactivate] = useState(false);

    // --------- Recurrente (rango + días + horas por día) ---------
    const [recStartDate, setRecStartDate] = useState<Dayjs | null>(dayjs().startOf('day'));
    const [recEndDate, setRecEndDate] = useState<Dayjs | null>(null);
    const [recDays, setRecDays] = useState<number[]>([]);
    const [dayTimes, setDayTimes] = useState<Record<number, { start: Dayjs | null; end: Dayjs | null }>>({
        0: { start: null, end: null },
        1: { start: null, end: null },
        2: { start: null, end: null },
        3: { start: null, end: null },
        4: { start: null, end: null },
        5: { start: null, end: null },
        6: { start: null, end: null },
    });

    // --------- Puntual ---------
    const [rows, setRows] = useState<OneTimeRow[]>([
        { date: dayjs(), startTime: dayjs().hour(18).minute(0), endTime: dayjs().hour(19).minute(0) },
    ]);

    // Precarga si viene clase (editar)
    useEffect(() => {
        if (!clase) return;

        // base
        setTitle(clase.description ?? '');
        setType((clase.type as SessionType) ?? 'RECURRING');
        setAmount(clase.amount != null ? String(clase.amount) : '0');
        if (clase.instructors?.[0]?.id) setInstructorId(clase.instructors[0].id);

        // snapshots -> dateRanges
        const snaps = clase?.SessionDateSnapshot as Array<{
            dateRange: { start: string; end: string };
        }> | undefined;

        const dateRanges =
            snaps?.map((s) => ({ start: s.dateRange.start, end: s.dateRange.end })) ?? [];

        if ((clase.type as SessionType) === 'ONE_TIME') {
            if (dateRanges.length > 0) {
                setRows(
                    dateRanges.map((dr) => {
                        const d = dayjs(dr.start);
                        const { h: sh, m: sm } = toHM(dr.start);
                        const { h: eh, m: em } = toHM(dr.end);
                        return {
                            date: d.startOf('day'),
                            startTime: dayjs().hour(sh).minute(sm).second(0).millisecond(0),
                            endTime: dayjs().hour(eh).minute(em).second(0).millisecond(0),
                        };
                    }),
                );
                const minStart = dayjs(Math.min(...dateRanges.map((r) => dayjs(r.start).valueOf())));
                const maxEnd = dayjs(Math.max(...dateRanges.map((r) => dayjs(r.end).valueOf())));
                setRecStartDate(minStart.startOf('day'));
                setRecEndDate(maxEnd.startOf('day'));
            } else {
                if (clase.startDate && clase.endDate) {
                    const d = dayjs(clase.startDate);
                    setRows([
                        {
                            date: d.startOf('day'),
                            startTime: dayjs(clase.startDate),
                            endTime: dayjs(clase.endDate),
                        },
                    ]);
                }
            }
            return; // no setear recDays en ONE_TIME
        }

        // RECURRING
        if (dateRanges.length > 0) {
            const daysSet = new Set<number>();
            const timesByDay: Record<number, { start: Dayjs | null; end: Dayjs | null }> = {
                0: { start: null, end: null },
                1: { start: null, end: null },
                2: { start: null, end: null },
                3: { start: null, end: null },
                4: { start: null, end: null },
                5: { start: null, end: null },
                6: { start: null, end: null },
            };

            for (const r of dateRanges) {
                const dIdx = toDayIdx(r.start);
                daysSet.add(dIdx);
                const { h: sh, m: sm } = toHM(r.start);
                const { h: eh, m: em } = toHM(r.end);
                if (!timesByDay[dIdx].start || !timesByDay[dIdx].end) {
                    timesByDay[dIdx] = {
                        start: dayjs().hour(sh).minute(sm).second(0).millisecond(0),
                        end: dayjs().hour(eh).minute(em).second(0).millisecond(0),
                    };
                }
            }

            const sortedDays = Array.from(daysSet).sort((a, b) => a - b);
            setRecDays(sortedDays);
            setDayTimes(timesByDay);

            const minStart = dayjs(Math.min(...dateRanges.map((r) => dayjs(r.start).valueOf())));
            const maxEnd = dayjs(Math.max(...dateRanges.map((r) => dayjs(r.end).valueOf())));
            setRecStartDate(minStart.startOf('day'));
            setRecEndDate(maxEnd.startOf('day'));
        } else {
            if (clase.startDate) setRecStartDate(dayjs(clase.startDate).startOf('day'));
            if (clase.endDate) setRecEndDate(dayjs(clase.endDate).startOf('day'));
            setRecDays([]);
        }
    }, [clase, open]);

    const canSave = useMemo(() => {
        if (!title.trim() || !instructorId) return false;
        const money = Number(amount);
        if (Number.isNaN(money) || money < 0) return false;

        if (type === 'RECURRING') {
            if (!recStartDate || !recEndDate || !recDays.length) return false;
            // Fechas: no pasado y fin >= inicio
            if (recStartDate.isBefore(today, 'day')) return false;
            if (recEndDate.isBefore(recStartDate, 'day')) return false;

            // Horas por día: fin > inicio
            for (const d of recDays) {
                const t = dayTimes[d];
                if (!t?.start || !t?.end || !t.end.isAfter(t.start)) return false;
            }
            return true;
        } else {
            if (!rows.length) return false;
            return rows.every((r) => {
                if (!r.date || !r.startTime || !r.endTime) return false;
                // fecha no en pasado
                if (r.date.startOf('day').isBefore(today)) return false;
                // horas fin > inicio
                if (!r.endTime.isAfter(r.startTime)) return false;
                return true;
            });
        }
    }, [title, instructorId, amount, type, recStartDate, recEndDate, recDays, dayTimes, rows, today]);


    const getFirstSelectedTime = (
        _recDays: number[],
        _dayTimes: Record<number, { start: Dayjs | null; end: Dayjs | null }>,
    ) => {
        if (!_recDays.length) return null;
        const t = _dayTimes[_recDays[0]];
        return t?.start && t?.end ? t : null;
    };

    const handleToggleDay = (idx: number) => {
        setRecDays((prev) => {
            const adding = !prev.includes(idx);
            const next = adding ? [...prev, idx].sort((a, b) => a - b) : prev.filter((d) => d !== idx);

            if (adding) {
                const base =
                    getFirstSelectedTime(prev, dayTimes) || {
                        start: dayjs().hour(18).minute(0).second(0).millisecond(0),
                        end: dayjs().hour(19).minute(0).second(0).millisecond(0),
                    };
                setDayTimes((prevTimes) => ({
                    ...prevTimes,
                    [idx]: {
                        start: prevTimes[idx]?.start || base.start,
                        end: prevTimes[idx]?.end || base.end,
                    },
                }));
            }
            return next;
        });
    };

    const copyTimeToAllSelected = (fromDayIdx: number) => {
        const base = dayTimes[fromDayIdx];
        if (!base?.start || !base?.end) return;
        setDayTimes((prev) => {
            const next = { ...prev };
            for (const d of recDays) {
                next[d] = { start: base.start, end: base.end };
            }
            return next;
        });
    };

    const handleAddRow = () => {
        setRows((prev) => [
            ...prev,
            { date: dayjs(), startTime: dayjs().hour(18).minute(0), endTime: dayjs().hour(19).minute(0) },
        ]);
    };

    const handleRemoveRow = (i: number) => {
        setRows((prev) => prev.filter((_, idx) => idx !== i));
    };

    const buildDatesFromRows = () =>
        rows.map((r) => {
            const dateStr = r.date!.format('YYYY-MM-DD');
            const start = dayjs(`${dateStr}T${r.startTime!.format('HH:mm')}`).toISOString();
            const end = dayjs(`${dateStr}T${r.endTime!.format('HH:mm')}`).toISOString();
            return { start, end };
        });

    const handleSave = async () => {
        if (!canSave) return;
        setLoading(true);
        try {
            const payload: any = {
                id: clase?.id,
                title: title.trim(),
                type,
                instructorId,
                amount: Number(amount) || 0,
            };

            if (type === 'RECURRING') {
                // Normalizar horas faltantes con la del primer día
                const firstSel = recDays[0];
                const base =
                    firstSel != null && dayTimes[firstSel]?.start && dayTimes[firstSel]?.end
                        ? { start: dayTimes[firstSel].start!, end: dayTimes[firstSel].end! }
                        : {
                            start: dayjs().hour(18).minute(0).second(0).millisecond(0),
                            end: dayjs().hour(19).minute(0).second(0).millisecond(0),
                        };

                const dayTimesFilled: Record<number, { start: Dayjs; end: Dayjs }> = {} as any;
                for (const d of recDays) {
                    const t = dayTimes[d];
                    dayTimesFilled[d] = {
                        start: (t?.start ?? base.start),
                        end: (t?.end ?? base.end),
                    };
                }

                // Normalización del rango: si hay 2+ días y start==end => extender a 7 días
                let recStart = recStartDate!;
                let recEnd = recEndDate!;
                if (recDays.length > 1 && recEnd.isSame(recStart, 'day')) {
                    recEnd = recStart.add(6, 'day');
                }

                payload.recurrence = {
                    startDate: recStart.format('YYYY-MM-DD'),
                    endDate: recEnd.format('YYYY-MM-DD'),
                    days: recDays,
                    dayTimes: Object.fromEntries(
                        recDays.map((d) => [
                            String(d),
                            {
                                startTime: dayTimesFilled[d].start.format('HH:mm'),
                                endTime: dayTimesFilled[d].end.format('HH:mm'),
                            },
                        ]),
                    ),
                };
            } else {
                payload.dates = buildDatesFromRows();
            }

            await apiClient.post('/sessions/upsert', payload);

            await onRefresh();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(e?.response?.data?.message || 'Error al guardar la clase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <CustomDialog
                open={open}
                onClose={onClose}
                title={clase ? 'Editar clase' : 'Crear nueva clase'}
                disableEscapeKeyDown={loading}
                showCloseButton={!loading}
                maxWidth="md"
                infoContent={DIALOG_INFO.claseUpsert}
                actions={
                    <>
                        <Button onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} variant="contained" disabled={!canSave || loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </>
                }
            >
                <>
                    {
                        editLocked ? (
                            <AlertNoEditClase
                                clase={clase}
                                token={token}
                                onDeactivated={async () => {
                                    await onRefresh?.();
                                    onClose();
                                }}
                            />
                        ) : (
                            <Stack spacing={2} sx={{ mt: 4 }}>
                                <TextField
                                    label="Nombre / Descripción"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    fullWidth
                                />
                                <Stack direction="row" spacing={2}>
                                    {
                                        clase ?
                                            (<FormControl fullWidth>
                                                <Button
                                                    onClick={() => setOpenDeactivate(true)}
                                                    variant='outlined'
                                                    color='warning'
                                                    sx={{ textTransform: 'none', height: '100%' }}
                                                >
                                                    Baja clase
                                                </Button>
                                            </FormControl>)
                                            : (
                                                <FormControl fullWidth>
                                                    <InputLabel id="type-label">Tipo</InputLabel>
                                                    <Select
                                                        labelId="type-label"
                                                        label="Tipo"
                                                        value={type}
                                                        onChange={(e) => setType(e.target.value as SessionType)}
                                                    >
                                                        <MenuItem value="RECURRING">Recurrente</MenuItem>
                                                        <MenuItem value="ONE_TIME">Puntual</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            )
                                    }

                                    <FormControl fullWidth>
                                        <InputLabel id="instructor-label">Instructor</InputLabel>
                                        <Select
                                            labelId="instructor-label"
                                            label="Instructor"
                                            value={instructorId}
                                            onChange={(e) => setInstructorId(e.target.value as string)}
                                        >
                                            {instructores.map((i) => (
                                                <MenuItem key={i.id} value={i.id}>
                                                    {i.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        label="Precio"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        inputProps={{ min: 0, step: 50 }}
                                        fullWidth
                                    />
                                </Stack>
                                <Divider />
                                {type === 'RECURRING' ? (
                                    <Stack spacing={2}>
                                        <Typography variant="subtitle1">Rango habilitado</Typography>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                            <DatePicker
                                                label="Desde"
                                                value={recStartDate}
                                                onChange={(v) => setRecStartDate(v ? v.startOf('day') : v)}
                                                slotProps={{ textField: { fullWidth: true } as any }}
                                                format="DD/MM/YYYY"
                                                disablePast
                                                minDate={today}
                                            />
                                            <DatePicker
                                                label="Hasta"
                                                value={recEndDate}
                                                onChange={(v) => setRecEndDate(v ? v.startOf('day') : v)}
                                                slotProps={{ textField: { fullWidth: true } as any }}
                                                format="DD/MM/YYYY"
                                                disablePast
                                                minDate={recStartDate ?? today}

                                            />
                                        </Stack>

                                        <Typography variant="subtitle1">Días y horarios</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {DIAS_LABELS.map((label, idx) => {
                                                const selected = recDays.includes(idx);
                                                return (
                                                    <Chip
                                                        key={idx}
                                                        label={label}
                                                        variant={selected ? 'filled' : 'outlined'}
                                                        color={selected ? 'primary' : 'default'}
                                                        onClick={() => handleToggleDay(idx)}
                                                        sx={{ mb: 1 }}
                                                    />
                                                );
                                            })}
                                        </Stack>

                                        <Stack spacing={1}>
                                            {recDays.map((d) => {
                                                const t = dayTimes[d] || { start: null, end: null };
                                                return (
                                                    <Paper key={d} variant="outlined" sx={{ p: 1.5 }}>
                                                        <Stack
                                                            direction={{ xs: 'column', md: 'row' }}
                                                            spacing={1.5}
                                                            alignItems="center"
                                                        >
                                                            <Typography sx={{ minWidth: 80 }}>{DIAS_LABELS[d]}</Typography>
                                                            <Grid container
                                                                justifyContent={'space-evenly'}
                                                                alignItems='center'
                                                            >
                                                                <TimePicker
                                                                    label="Inicio"
                                                                    value={t.start}
                                                                    onChange={(v) =>
                                                                        setDayTimes((prev) => ({ ...prev, [d]: { ...prev[d], start: v } }))
                                                                    }
                                                                    sx={{ width: '40%' }}
                                                                />
                                                                <TimePicker
                                                                    label="Fin"
                                                                    value={t.end}
                                                                    onChange={(v) =>
                                                                        setDayTimes((prev) => ({ ...prev, [d]: { ...prev[d], end: v } }))
                                                                    } minTime={t.start ? dayjs().hour(t.start.hour()).minute(t.start.minute()) : undefined}
                                                                    sx={{ width: '40%' }}
                                                                />
                                                                <Tooltip title="Copiar este horario a todos los días seleccionados">
                                                                    <IconButton size="small" onClick={() => copyTimeToAllSelected(d)}>
                                                                        <ContentCopyIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Grid>
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    </Stack>
                                ) : (
                                    <Stack spacing={2}>
                                        <Typography variant="subtitle1">Fechas puntuales</Typography>
                                        <Stack spacing={1}>
                                            {rows.map((row, i) => (
                                                <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                                                    <Stack
                                                        direction={{ xs: 'column', md: 'row' }}
                                                        spacing={1}
                                                        alignItems="center"
                                                    >
                                                        <DatePicker
                                                            label="Fecha"
                                                            value={row.date}
                                                            onChange={(v) =>
                                                                setRows((prev) =>
                                                                    prev.map((r, idx) => (idx === i ? { ...r, date: v ? v.startOf('day') : v } : r)),
                                                                )
                                                            }
                                                            format="DD/MM/YYYY"
                                                            disablePast
                                                            minDate={today}

                                                            slotProps={{ textField: { fullWidth: true } as any }}
                                                        />
                                                        <TimePicker
                                                            label="Inicio"
                                                            value={row.startTime}
                                                            onChange={(v) =>
                                                                setRows((prev) =>
                                                                    prev.map((r, idx) => (idx === i ? { ...r, startTime: v } : r)),
                                                                )
                                                            }
                                                            slotProps={{ textField: { fullWidth: true } as any }}
                                                        />
                                                        <TimePicker
                                                            label="Fin"
                                                            value={row.endTime}
                                                            onChange={(v) =>
                                                                setRows((prev) =>
                                                                    prev.map((r, idx) => (idx === i ? { ...r, endTime: v } : r)),
                                                                )
                                                            }
                                                            minTime={
                                                                row.startTime
                                                                    ? dayjs().hour(row.startTime.hour()).minute(row.startTime.minute())
                                                                    : undefined
                                                            }
                                                            slotProps={{ textField: { fullWidth: true } as any }}
                                                        />

                                                        <Tooltip title="Eliminar fila">
                                                            <span>
                                                                <IconButton
                                                                    onClick={() => handleRemoveRow(i)}
                                                                    disabled={rows.length === 1}
                                                                    size="small"
                                                                >
                                                                    <DeleteOutlineIcon />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </Paper>
                                            ))}
                                        </Stack>

                                        <Box>
                                            <Button startIcon={<AddIcon />} onClick={handleAddRow} variant="outlined">
                                                Agregar fecha
                                            </Button>
                                        </Box>
                                    </Stack>
                                )}
                            </Stack>
                        )
                    }
                </>
            </CustomDialog>

            {/* Diálogo de desactivación */}
            {clase && (
                <DeactivateDialog
                    open={openDeactivate}
                    onClose={() => setOpenDeactivate(false)}
                    modelId={clase.id}
                    model="session"
                    claseDescription={title || clase.description || 'esta clase'}
                    onSuccess={async () => {
                        await onRefresh();
                        onClose();
                    }}
                />
            )}
        </LocalizationProvider>
    );
}

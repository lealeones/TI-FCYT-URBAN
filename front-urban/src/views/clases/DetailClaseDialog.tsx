'use client'

import dayjs from 'dayjs'
import {
    alpha,
    Box,
    Button,
    Chip,
    Divider,
    Stack,
    Typography
} from '@mui/material'
import CustomDialog from '@/utils/CustomDialog'
import { DIALOG_INFO } from '@/configs/dialogInfoContent'
import AsignarParticiapntesAccordion from './AsignarParticiapntesAccordion'
import FechasProgramadasAccordion from './FechasProgramadasAccordion'
import FacturasAsistentesAccordion from './FacturasAsistentesAccordion'

type SessionType = 'RECURRING' | 'ONE_TIME'

export type Clase = {
    id: string
    customId: string
    description: string
    type: SessionType
    startDate: string
    endDate: string
    isActive: boolean
    instructorId: string | null
    amount: number | null
    createdAt: string
    updatedAt: string
    instructors: {
        id: string
        customId: string
        createdAt: string
        name: string
        dni: string | null
        phone: string | null
        birth: string | null
        rfid: string | null
        deleted: string | null
        role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
    }[]
    SessionDateSnapshot: {
        id: string
        createdAt: string
        notes: string | null
        sessionId: string
        dateRangeId: string
        isActive: boolean
        dateRange: {
            id: string
            start: string
            end: string
            sessionId: string
        }
        substituteInstructors: {
            id: string
            name: string
            dni: string
        }[]
    }[]
}

type Props = { open: boolean; onClose: () => void; clase: Clase | null; onDeactivateSuccess?: () => void }

const DetailClaseDialog = ({ open, onClose, clase, onDeactivateSuccess }: Props) => {
    if (!clase) return null

    const isRecurrente = clase.type === 'RECURRING'
    const fmt = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—')
    const currency =
        typeof clase.amount === 'number'
            ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(clase.amount)
            : '—'

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title="Detalle de la clase"
            maxWidth='md'
            infoContent={DIALOG_INFO.claseDetail}
            actions={
                <Button onClick={onClose} variant='outlined'>
                    Cerrar
                </Button>
            }
        >
            {/* Encabezado con chips */}
            <Stack spacing={2.5}>
                <Box
                    sx={theme => ({
                        p: 2.5,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${alpha('#fff', 0.08)}`
                    })}
                >
                    <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
                        <Typography variant='h6' sx={{ fontWeight: 800, mr: 1 }}>
                            {clase.description || '—'}
                        </Typography>

                        <Chip
                            size='small'
                            color={isRecurrente ? 'primary' : 'secondary'}
                            label={isRecurrente ? 'Recurrente' : 'Puntual'}
                            sx={{ fontWeight: 700 }}
                        />

                        <Chip
                            size='small'
                            color={clase.isActive ? 'success' : 'default'}
                            variant={clase.isActive ? 'filled' : 'outlined'}
                            label={clase.isActive ? 'Activa' : 'Inactiva'}
                            sx={{ fontWeight: 700 }}
                        />

                        <Chip
                            size='small'
                            variant='outlined'
                            label={`ID: ${clase.customId}`}
                            sx={theme => ({
                                borderColor: alpha(theme.palette.text.primary, 0.24),
                                color: theme.palette.text.secondary,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                            })}
                        />
                    </Stack>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Grid de detalles rápidos */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1.25
                        }}
                    >
                        <DetailRow label='Desde' value={fmt(clase.startDate)} />
                        <DetailRow label='Hasta' value={fmt(clase.endDate)} />
                        <DetailRow
                            label='Monto'
                            value={currency}
                        />
                        <DetailRow
                            label='Instructores'
                            value={
                                clase.instructors?.length
                                    ? (
                                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                            {clase.instructors.map(i => (
                                                <Chip
                                                    key={i.id}
                                                    size='small'
                                                    label={i.name}
                                                    sx={theme => ({
                                                        height: 24,
                                                        borderRadius: 2,
                                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                                                    })}
                                                />
                                            ))}
                                        </Stack>
                                    )
                                    : '—'
                            }
                        />
                    </Box>
                </Box>

                {/* Secciones funcionales */}
                <Box
                    sx={theme => ({
                        p: 2.5,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${alpha('#fff', 0.06)}`
                    })}
                >
                    <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                        Fechas programadas
                    </Typography>
                    <FechasProgramadasAccordion clase={clase} onDeactivateSuccess={onDeactivateSuccess} />
                </Box>

                <Box
                    sx={theme => ({
                        p: 2.5,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${alpha('#fff', 0.06)}`
                    })}
                >
                    <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                        Participantes
                    </Typography>
                    <AsignarParticiapntesAccordion clase={clase} />
                </Box>

                <Box
                    sx={theme => ({
                        p: 2.5,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${alpha('#fff', 0.06)}`
                    })}
                >
                    <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                        Facturas
                    </Typography>
                    <FacturasAsistentesAccordion sessionId={clase.id} />
                </Box>
            </Stack>
        </CustomDialog>
    )
}

export default DetailClaseDialog

// --- Pequeño subcomponente para filas de detalle
function DetailRow({
    label,
    value
}: {
    label: string
    value: React.ReactNode
}) {
    return (
        <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Typography variant='body2' color='text.secondary' sx={{ minWidth: 88 }}>
                <strong>{label}:</strong>
            </Typography>
            <Typography variant='body2'>{value}</Typography>
        </Box>
    )
}

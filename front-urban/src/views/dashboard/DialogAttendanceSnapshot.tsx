'use client'

import { useEffect, useMemo, useState } from 'react'
import apiClient from '@/lib/apiClient'
import dayjs from 'dayjs'
import CustomDialog from '@/utils/CustomDialog'
import { useUserAuth } from '@/app/context/UserAuth'

import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { MRT_Localization_ES } from 'material-react-table/locales/es'
import {
    Box,
    Chip,
    IconButton,
    Stack,
    Typography,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import HistoryIcon from '@mui/icons-material/History'
import { Snapshot } from '../clases/FechasProgramadasAccordion'
import { useAttendeesSnapshot } from '@/@core/hooks/useAttendeesSnapshot'
import { DIALOG_INFO } from '@/configs/dialogInfoContent'
import DialogAccessLogs from './DialogAccessLogs'

type Props = {
    snapshot: Snapshot | null
    open: boolean
    onClose: () => void
}

type RowUser = {
    id: string
    name: string
    role: 'instructor' | 'assistant'
}

const DialogAttendanceSnapshot = ({ snapshot, open, onClose }: Props) => {
    const { token } = useUserAuth()

    // usa el hook
    const { data, loading, error, refresh } = useAttendeesSnapshot(snapshot?.id, open)

    const [rows, setRows] = useState<RowUser[]>([])
    const [attendedSet, setAttendedSet] = useState<Set<string>>(new Set())
    const [savingSet, setSavingSet] = useState<Set<string>>(new Set())
    const [confirmState, setConfirmState] = useState<{ userId: string | null; isAttended: boolean }>(() => ({ userId: null, isAttended: false }))
    
    // Estado para el diálogo de logs de acceso
    const [accessLogsState, setAccessLogsState] = useState<{ open: boolean; userId: string | null; userName: string }>({
        open: false,
        userId: null,
        userName: ''
    })

    const titleDate = useMemo(
        () =>
        (data?.dateRange?.start
            ? dayjs(data.dateRange.start).format('DD-MM HH:mm')
            : '—'),
        [data]
    )

    // reset locales al cerrar
    useEffect(() => {
        if (!open) {
            setAttendedSet(new Set())
            setSavingSet(new Set())
            setRows([])
            setAccessLogsState({ open: false, userId: null, userName: '' })
        }
    }, [open])

    // hidratar filas y asistencias desde la data del hook
    useEffect(() => {
        if (!data) return
        const merged: RowUser[] = [
            ...data.instructors.map(i => ({ ...i, role: 'instructor' as const })),
            ...data.assistants.map(a => ({ ...a, role: 'assistant' as const }))
        ].sort((a, b) => a.name.localeCompare(b.name))

        setRows(merged)
        setAttendedSet(new Set((data.attendance ?? []).map(a => a.id)))
    }, [data])

    const markAttendance = (userId: string) => {
        if (!snapshot?.id) return
        const isAttended = attendedSet.has(userId)
        setConfirmState({ userId, isAttended })
    }

    const openAccessLogs = (userId: string, userName: string) => {
        setAccessLogsState({ open: true, userId, userName })
    }

    const closeAccessLogs = () => {
        setAccessLogsState({ open: false, userId: null, userName: '' })
    }

    const confirmAttendanceChange = async () => {
        const userId = confirmState.userId
        if (!userId || !snapshot?.id) return
        const isAttended = confirmState.isAttended

        setSavingSet(prev => new Set(prev).add(userId))

        try {
            const base = `/attendance/${userId}/${snapshot.id}`
            const url = isAttended ? `${base}?unmark=true` : base
            await apiClient.put(url, null)
            // optimista + sync con backend
            setAttendedSet(prev => {
                const next = new Set(prev)
                if (isAttended) next.delete(userId)
                else next.add(userId)
                return next
            })
            refresh()
        } finally {
            setSavingSet(prev => {
                const next = new Set(prev)
                next.delete(userId)
                return next
            })
            setConfirmState({ userId: null, isAttended: false })
        }
    }

    const columns = useMemo<MRT_ColumnDef<RowUser>[]>(() => [
        {
            header: 'Nombre',
            accessorKey: 'name',
            size: 15
        },
        {
            header: 'Presencia',
            id: 'presence',
            size: 12,
            Cell: ({ row }) => {
                const present = attendedSet.has(row.original.id)
                return (
                    <Chip
                        size="small"
                        label={present ? 'Presente' : 'Ausente'}
                        color={present ? 'success' : 'default'}
                        sx={{ height: 22, fontWeight: 700 }}
                    />
                )
            },
            enableSorting: false,
            enableColumnFilter: false,
        },
        {
            header: 'Rol',
            accessorKey: 'role',
            size: 15,
            Cell: ({ cell }) => {
                const role = cell.getValue<'instructor' | 'assistant'>()
                const label = role === 'instructor' ? 'Instructor' : 'Asistente'
                return (
                    <Chip
                        size="small"
                        label={label}
                        color={role === 'instructor' ? 'primary' : 'default'}
                        sx={{ height: 22 }}
                    />
                )
            },
            filterVariant: 'select',
            filterSelectOptions: [
                { label: 'Instructor', value: 'instructor' },
                { label: 'Asistente', value: 'assistant' }
            ]
        },
        {
            header: 'Acciones',
            id: 'acciones',
            enableSorting: false,
            enableColumnFilter: false,
            size: 15,
            Cell: ({ row }) => {
                const userId = row.original.id
                const userName = row.original.name
                const attended = attendedSet.has(userId)
                const saving = savingSet.has(userId)

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={attended ? 'Asistencia marcada' : 'Marcar asistencia'} arrow>
                            <span>
                                <IconButton
                                    aria-label="Marcar asistencia"
                                    onClick={() => markAttendance(userId)}
                                    size="small"
                                    color={attended ? 'success' : 'default'}
                                    disabled={saving}
                                >
                                    <HowToRegIcon color={attended ? 'success' : 'inherit'} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Ver log de accesos" arrow>
                            <IconButton
                                aria-label="Ver log de accesos"
                                onClick={() => openAccessLogs(userId, userName)}
                                size="small"
                                color="primary"
                            >
                                <HistoryIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )
            }
        }
    ], [attendedSet, savingSet])

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            title={`Asistentes · ${titleDate}`}
            contentProps={{ dividers: true }}
            infoContent={DIALOG_INFO.attendanceDialog}
        >
            <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                    Listado de instructores y asistentes de la clase.
                </Typography>

                <Box sx={{ width: '100%' }}>
                    <MaterialReactTable<RowUser>
                        columns={columns}
                        data={rows}
                        state={{ isLoading: loading, showAlertBanner: !!error }}
                        enableColumnFilters
                        enableGlobalFilter
                        enableDensityToggle
                        enableHiding={false}
                        localization={MRT_Localization_ES}
                        muiToolbarAlertBannerProps={
                            error ? { color: 'error', children: error } : undefined
                        }
                        muiPaginationProps={{
                            rowsPerPageOptions: [10, 50],
                            showFirstButton: true,
                            showLastButton: true,
                            SelectProps: {
                                native: false,
                                sx: {
                                    '& .MuiSelect-select': {
                                        paddingRight: '32px !important',
                                    },
                                    '& .MuiSelect-icon': {
                                        right: '4px',
                                    }
                                }
                            },
                        }}
                    />
                </Box>
            </Stack>

            {/* Confirmación de asistencia */}
            <Dialog open={!!confirmState.userId} onClose={() => setConfirmState({ userId: null, isAttended: false })}>
                <DialogTitle>{confirmState.isAttended ? 'Desmarcar asistencia' : 'Marcar asistencia'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {confirmState.isAttended
                            ? '¿Confirma que desea desmarcar la asistencia de este usuario?'
                            : '¿Confirma que desea marcar la asistencia de este usuario?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmState({ userId: null, isAttended: false })}>
                        Cancelar
                    </Button>
                    <Button onClick={confirmAttendanceChange} variant="contained">
                        Aceptar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo de logs de acceso */}
            <DialogAccessLogs
                userId={accessLogsState.userId}
                userName={accessLogsState.userName}
                open={accessLogsState.open}
                onClose={closeAccessLogs}
            />
        </CustomDialog>
    )
}

export default DialogAttendanceSnapshot

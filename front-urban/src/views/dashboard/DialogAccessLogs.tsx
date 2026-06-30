'use client'

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import CustomDialog from '@/utils/CustomDialog'
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { MRT_Localization_ES } from 'material-react-table/locales/es'
import {
    Box,
    Chip,
    Stack,
    Typography,
    TextField
} from '@mui/material'
import { useAccessLogs, type AccessLog } from '@/@core/hooks/useAccessLogs'
import { DIALOG_INFO } from '@/configs/dialogInfoContent'

type Props = {
    userId: string | null
    userName: string
    open: boolean
    onClose: () => void
}

const DialogAccessLogs = ({ userId, userName, open, onClose }: Props) => {
    const [selectedDate, setSelectedDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'))

    const { data, loading, error } = useAccessLogs(userId || undefined, selectedDate, open && !!userId)

    // Reset fecha al cerrar
    useEffect(() => {
        if (!open) {
            setSelectedDate(dayjs().format('YYYY-MM-DD'))
        }
    }, [open])

    const columns = useMemo<MRT_ColumnDef<AccessLog>[]>(() => [
        {
            header: 'Tipo',
            accessorKey: 'direction',
            size: 15,
            Cell: ({ cell }) => {
                const direction = cell.getValue<'INGRESS' | 'EGRESS'>()
                const label = direction === 'INGRESS' ? 'Ingreso' : 'Egreso'
                const color = direction === 'INGRESS' ? 'success' : 'warning'
                return (
                    <Chip
                        size="small"
                        label={label}
                        color={color}
                        sx={{ height: 22, fontWeight: 700 }}
                    />
                )
            },
            filterVariant: 'select',
            filterSelectOptions: [
                { label: 'Ingreso', value: 'INGRESS' },
                { label: 'Egreso', value: 'EGRESS' }
            ]
        },
        {
            header: 'Fecha y Hora',
            accessorKey: 'timestamp',
            size: 20,
            Cell: ({ cell }) => {
                const timestamp = cell.getValue<string>()
                return dayjs(timestamp).format('DD/MM/YYYY HH:mm')
            }
        }
    ], [])

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            title={`Registro de Accesos · ${userName}`}
            contentProps={{ dividers: true }}
            infoContent={DIALOG_INFO.accessLogsDialog}
        >
            <Stack spacing={2}>
                <Box>
                    <TextField
                        label="Fecha"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        size="small"
                    />
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Registros de ingreso y egreso de {data?.name || userName} para el día seleccionado.
                </Typography>

                <Box sx={{ width: '100%' }}>
                    <MaterialReactTable<AccessLog>
                        columns={columns}
                        data={data?.accessLogs || []}
                        state={{ isLoading: loading, showAlertBanner: !!error }}
                        enableColumnFilters
                        enableGlobalFilter={false}
                        enableDensityToggle
                        enableHiding={false}
                        localization={MRT_Localization_ES}
                        muiToolbarAlertBannerProps={
                            error ? { color: 'error', children: error } : undefined
                        }
                        muiPaginationProps={{
                            rowsPerPageOptions: [10, 25, 50],
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
                        initialState={{
                            sorting: [{ id: 'timestamp', desc: false }],
                            pagination: { pageSize: 10, pageIndex: 0 }
                        }}
                    />
                </Box>
            </Stack>
        </CustomDialog>
    )
}

export default DialogAccessLogs

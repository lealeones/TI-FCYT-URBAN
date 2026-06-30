'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    Chip,
    CircularProgress,
    Stack,
    Typography,
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    ToggleButtonGroup,
    ToggleButton,
    alpha,
    Tooltip
} from '@mui/material';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useSessionInvoicesByMonth, type InvoiceStatus, type AssistantInvoice } from '@/@core/hooks/useSessionInvoicesByMonth';
import { useUserAuth } from '@/app/context/UserAuth';

type Props = {
    sessionId: string;
};

const FacturasAsistentesAccordion = ({ sessionId }: Props) => {
    const { token } = useUserAuth();

    // Estado para mes y año
    const [selectedMonth, setSelectedMonth] = useState(dayjs().format('MM'));
    const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));

    // Estado para filtro de status (en memoria)
    const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus | 'no-invoice'>('all');

    const { data, loading, error } = useSessionInvoicesByMonth({
        sessionId,
        month: selectedMonth,
        year: selectedYear,
    });

    // Filtrado en memoria por status
    const filteredAssistants = useMemo(() => {
        if (!data?.assistants) return [];

        if (statusFilter === 'all') return data.assistants;

        if (statusFilter === 'no-invoice') {
            return data.assistants.filter((a: AssistantInvoice) => !a.hasInvoice);
        }

        return data.assistants.filter((a: AssistantInvoice) => a.invoiceStatus === statusFilter);
    }, [data?.assistants, statusFilter]);

    // Verificar si estamos en un mes futuro
    const isCurrentOrPastMonth = useMemo(() => {
        const selectedDate = dayjs(`${selectedYear}-${selectedMonth}-01`);
        const now = dayjs();
        return selectedDate.isBefore(now, 'month') || selectedDate.isSame(now, 'month');
    }, [selectedMonth, selectedYear]);

    // Generar años (últimos 3 años + próximos 2)
    const years = useMemo(() => {
        const currentYear = dayjs().year();
        const yearsList = [];
        for (let i = currentYear - 3; i <= currentYear + 2; i++) {
            yearsList.push(i.toString());
        }
        return yearsList;
    }, []);

    // Meses
    const months = [
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ];

    // Columnas para la tabla
    const columns = useMemo(() => [
        {
            header: 'Asistente',
            accessorKey: 'name',
            size: 180,
            Cell: ({ row }) => (
                <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                        {row.original.name || '—'}
                    </Typography>
                    {!row.original.hasInvoice && isCurrentOrPastMonth && (
                        <Tooltip title='La factura todavía puede no estar generada'>
                            <Chip size='small' color='warning' label='Pend. Gen.' sx={{ fontSize: '0.65rem', height: 20 }} />
                        </Tooltip>
                    )}
                </Stack>
            )
        },
        {
            header: 'Estado',
            accessorKey: 'invoiceStatus',
            size: 90,
            Cell: ({ row }) => {
                const status = row.original.invoiceStatus;
                const colorMap: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
                    PAID: 'success',
                    PENDING: 'warning',
                    CANCELED: 'error'
                };
                return (
                    <Chip
                        size='small'
                        label={status ? (status === 'PAID' ? 'Pagada' : status === 'PENDING' ? 'Pendiente' : 'Cancelada') : 'Sin factura'}
                        color={status ? colorMap[status] : 'default'}
                        sx={{ fontWeight: 600 }}
                    />
                );
            }
        },
        {
            header: 'Monto',
            accessorKey: 'amount',
            size: 80,
            Cell: ({ row }) => (
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {row.original.amount === null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(row.original.amount)}
                </Typography>
            )
        },
        {
            header: 'Factura ID',
            accessorKey: 'invoiceId',
            size: 160,
            Cell: ({ row }) => (
                <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                    {row.original.invoiceId || '—'}
                </Typography>
            )
        }
    ], [isCurrentOrPastMonth]) as MRT_ColumnDef<AssistantInvoice>[];

    // UI fragments para evitar problemas de inferencia
    const loadingUI: React.ReactNode = loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
        </Box>
    ) : null;

    const errorUI: React.ReactNode = !loading && error ? (
        <Alert severity='error'>Error al cargar las facturas. Por favor, intenta nuevamente.</Alert>
    ) : null;

    const warningUI: React.ReactNode = !loading && !error && !isCurrentOrPastMonth ? (
        <Alert severity='warning' icon={<WarningAmberIcon />}>Las facturas para este mes todavía pueden no estar generadas.</Alert>
    ) : null;

    const tableUI: React.ReactNode = !loading && !error ? (
        <MaterialReactTable
            columns={columns}
            data={filteredAssistants}
            state={{ isLoading: loading }}
            enableColumnFilters={false}
            enableGlobalFilter={false}
            enablePagination={false}
            enableBottomToolbar={false}
            enableDensityToggle={false}
            initialState={{ density: 'compact' }}
            localization={MRT_Localization_ES}
            muiTablePaperProps={{ sx: { width: '100%' } }}
            muiTableContainerProps={{ sx: { width: '100%' } }}
            muiTableHeadCellProps={{ sx: { fontWeight: 'bold' } }}
            muiTableBodyCellProps={{ sx: { whiteSpace: 'nowrap' } }}
        />
    ) : null;

    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                    Facturas por Asistente
                </Typography>
            </AccordionSummary>

            <AccordionDetails>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Filtros de Mes y Año */}
                    <Stack direction='row' spacing={2} flexWrap='wrap'>
                        <FormControl size='small' sx={{ minWidth: 140 }}>
                            <InputLabel>Mes</InputLabel>
                            <Select
                                value={selectedMonth}
                                label='Mes'
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {months.map((month) => (
                                    <MenuItem key={month.value} value={month.value}>
                                        {month.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size='small' sx={{ minWidth: 120 }}>
                            <InputLabel>Año</InputLabel>
                            <Select
                                value={selectedYear}
                                label='Año'
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {years.map((year) => (
                                    <MenuItem key={year} value={year}>
                                        {year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <StatusFilter value={statusFilter} onChange={setStatusFilter} />
                    {loadingUI}
                    {errorUI}
                    {warningUI}
                    {tableUI}
                </div>
            </AccordionDetails>
        </Accordion>
    );
};

export default FacturasAsistentesAccordion;

// --- Filtro de estado extraído para evitar problemas de sobrecarga de tipos
type StatusFilterProps = {
    value: 'all' | InvoiceStatus | 'no-invoice';
    onChange: (v: 'all' | InvoiceStatus | 'no-invoice') => void;
};

function StatusFilter({ value, onChange }: StatusFilterProps) {
    const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
        if (newValue !== null) onChange(newValue as 'all' | InvoiceStatus | 'no-invoice');
    };
    return (
        // @ts-ignore: MUI type inference edge case for ToggleButtonGroup inside Box
        <Box>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                Filtrar por estado:
            </Typography>
            <ToggleButtonGroup
                value={value}
                exclusive
                onChange={handleChange}
                size='small'
                sx={{ flexWrap: 'wrap' }}
            >
                <ToggleButton value='all'>Todos</ToggleButton>
                <ToggleButton value='PENDING'>Pendientes</ToggleButton>
                <ToggleButton value='PAID'>Pagadas</ToggleButton>
                <ToggleButton value='CANCELED'>Canceladas</ToggleButton>
                <ToggleButton value='no-invoice'>Sin Factura</ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
}

// (Listado original reemplazado por MaterialReactTable)

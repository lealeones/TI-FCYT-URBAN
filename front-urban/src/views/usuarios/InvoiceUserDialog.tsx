'use client';
import { downloadInvoicePdf } from '@/@core/hooks/downloadInvoicePdf';
import { InvoiceStatus, InvoiceWithDescription, useInvoices } from '@/@core/hooks/useInvoices';
import { useUpdateInvoiceStatus } from '@/@core/hooks/useUpdateInvoiceStatus';
import { useUserAuth } from '@/app/context/UserAuth';
import CustomDialog from '@/utils/CustomDialog';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import {
    Alert,
    Box,
    Button,
    Chip,
    ClickAwayListener,
    Grow,
    IconButton,
    Paper,
    Portal,
    Snackbar,
    Typography
} from '@mui/material';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import { useMemo, useState } from 'react';
import { Usuario } from './usuarios.dto';

type Props = {
    open: boolean;
    usuario: Usuario | null;
    onClose: () => void;
    onRefresh: () => Promise<void>;
};

export const InvoiceUserDialog = ({ open, usuario, onClose, onRefresh }: Props) => {

    const { token } = useUserAuth();
    const { data, loading, error, refresh } = useInvoices(usuario?.id ?? '', { auto: open });

    // Estado para controlar qué factura tiene el diálogo de acciones abierto
    const [openActionDialog, setOpenActionDialog] = useState<string | null>(null);

    // Estados para el Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Hook para actualizar el estado de la factura
    const { mutate: updateInvoiceStatus, loading: updating } = useUpdateInvoiceStatus({
        onSuccess: async () => {
            setSnackbar({
                open: true,
                message: 'Factura actualizada exitosamente',
                severity: 'success'
            });
            await refresh();
        },
        onError: (error: any) => {
            setSnackbar({
                open: true,
                message: error?.response?.data?.message || 'Error al actualizar la factura',
                severity: 'error'
            });
        }
    });

    // Función para cambiar el estado de la factura
    const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: 'PAID' | 'CANCELED') => {
        if (!usuario?.id) return;

        try {
            await updateInvoiceStatus({
                userId: usuario.id,
                invoiceId,
                status: newStatus
            });
        } catch (error) {
            // El error ya se maneja en onError del hook
            console.error('Error al actualizar factura:', error);
        }
    };

    // Función para cerrar el Snackbar
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Función para obtener el mes y año en formato "Mes/AAAA"
    const getMonthYear = (dateString: string) => {
        const date = new Date(dateString);
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${month}/${year}`;
    };

    // Componente simplificado para el botón de editar
    const ActionButton = ({ invoice }: { invoice: InvoiceWithDescription }) => {
        const isOpen = openActionDialog === invoice.id;
        const isDisabled = invoice.status === 'PAID' || invoice.status === 'CANCELED';

        const handleClick = () => {
            if (isDisabled) return;
            setOpenActionDialog(isOpen ? null : invoice.id);
        };

        return (
            <IconButton
                size="small"
                onClick={handleClick}
                disabled={isDisabled}
                sx={{
                    transition: 'all 0.2s ease-in-out',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    bgcolor: isOpen ? 'action.selected' : 'transparent',
                    '&:hover': {
                        bgcolor: isDisabled ? 'transparent' : 'action.hover',
                        transform: isDisabled ? 'none' : 'scale(1.1)'
                    },
                    opacity: isDisabled ? 0.3 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                }}
            >
                <EditIcon fontSize="small" />
            </IconButton>
        );
    }; const columns = useMemo<MRT_ColumnDef<InvoiceWithDescription>[]>(() => [
        {
            header: 'Estado',
            accessorKey: 'status',
            size: 15,
            Cell: ({ cell }) => {
                const estado = (cell.getValue<string | null>() ?? '') as InvoiceStatus | '';
                const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
                    PENDING: 'warning',
                    PAID: 'success',
                    FAILED: 'error',
                    CANCELED: 'default',
                };
                return <Chip label={estado || '—'} color={colorMap[estado] ?? 'default'} size="small" sx={{ fontWeight: 'bold' }} />;
            },
        },
        {
            header: 'Descripción',
            accessorKey: 'description',
            size: 20,
            Cell: ({ cell }) => {
                const description = (cell.getValue<string | null>() ?? '') as string | '';
                return <Typography variant="body2">{description || '—'}</Typography>;
            },
        },
        {
            header: 'Mes',
            accessorKey: 'createdAt',
            size: 15,
            Cell: ({ cell }) => {
                const createdAt = cell.getValue<string>();
                return <Typography variant="body2">{createdAt ? getMonthYear(createdAt) : '—'}</Typography>;
            },
        },
        {
            header: 'Monto',
            accessorKey: 'amount',
            size: 15,
            Cell: ({ cell }) => {
                const amount = cell.getValue<number>();
                return <Typography variant="body2">{amount ? `$${amount}` : '—'}</Typography>;
            },
        },
        {
            header: 'Acciones',
            id: 'acciones',
            size: 180,
            Cell: ({ row }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ActionButton invoice={row.original} />
                    {/* <IconButton size="small" onClick={() => console.log('Ver:', row.original)}>
                        <VisibilityIcon fontSize="small" />
                    </IconButton> */}
                    <IconButton size="small" onClick={() => downloadInvoicePdf(row.original.id)}>
                        <DownloadIcon fontSize="small" />
                    </IconButton>
                </Box >
            ),
            enableSorting: false,
            enableColumnFilter: false,
        },
    ], []);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            title={`Facturas de ${usuario?.name || 'Usuario'}`}
            contentProps={{ dividers: true }}
        >
            <MaterialReactTable
                columns={columns}
                data={data}
                state={{ isLoading: loading }}
                enableColumnFilters={false}
                enableGlobalFilter={false}
                enableDensityToggle={false}
                enablePagination={false}
                enableBottomToolbar={false}
                localization={MRT_Localization_ES}
                initialState={{
                    density: 'compact',
                    sorting: [{ id: 'createdAt', desc: true }],
                }}
                muiTableContainerProps={{ sx: { width: '100%' } }}
                muiTablePaperProps={{ sx: { width: '100%' } }}
                muiTableHeadCellProps={{ sx: { fontWeight: 'bold' } }}
                muiTableBodyCellProps={{ sx: { whiteSpace: 'nowrap' } }}
            />

            {/* Diálogo flotante para las acciones */}
            {openActionDialog && (
                <Portal>
                    <ClickAwayListener onClickAway={() => setOpenActionDialog(null)}>
                        <Box
                            sx={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 1400,
                            }}
                        >
                            <Grow in={!!openActionDialog} timeout={300}>
                                <Paper
                                    elevation={12}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        p: 3,
                                        minWidth: 200,
                                        borderRadius: 3,
                                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            textAlign: 'center',
                                            color: 'text.secondary',
                                            fontWeight: 600,
                                            mb: 1
                                        }}
                                    >
                                        Cambiar estado de factura
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        color="success"
                                        fullWidth
                                        disabled={updating}
                                        onClick={() => {
                                            handleUpdateInvoiceStatus(openActionDialog, 'PAID');
                                            setOpenActionDialog(null);
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            py: 1.2,
                                            background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                                            boxShadow: '0 4px 15px rgba(76, 175, 80, .4)',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 25px rgba(76, 175, 80, .4)',
                                            },
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        {updating ? 'Actualizando...' : '✓ Marcar como Pagada'}
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="error"
                                        fullWidth
                                        disabled={updating}
                                        onClick={() => {
                                            handleUpdateInvoiceStatus(openActionDialog, 'CANCELED');
                                            setOpenActionDialog(null);
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            py: 1.2,
                                            background: 'linear-gradient(45deg, #f44336 30%, #ef5350 90%)',
                                            boxShadow: '0 4px 15px rgba(244, 67, 54, .4)',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 25px rgba(244, 67, 54, .4)',
                                            },
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        {updating ? 'Actualizando...' : '✕ Cancelar Factura'}
                                    </Button>
                                </Paper>
                            </Grow>
                        </Box>
                    </ClickAwayListener>
                </Portal>
            )}

            {/* Snackbar para notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </CustomDialog>
    );
};

export default InvoiceUserDialog;

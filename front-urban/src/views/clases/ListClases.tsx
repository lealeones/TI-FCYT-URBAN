'use client';

import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Chip, Grid, IconButton, Tooltip, Typography, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ViewListIcon from '@mui/icons-material/ViewList';
import { MaterialReactTable } from 'material-react-table';
import { useMemo, useState } from 'react';
import DetailClaseDialog, { Clase } from './DetailClaseDialog';
import useInstructors from '@/@core/hooks/useInstructors';
import DialogUpsertClase from './DialogUpsertClase';
import { useUserAuth } from '@/app/context/UserAuth';

type Props = {
    data: Clase[];
    loading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
    statusFilter: 'all' | 'active' | 'inactive';
    onStatusFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
};

const ListClases = ({ data, loading, error, refresh, statusFilter, onStatusFilterChange }: Props) => {
    const { user } = useUserAuth();

    const [claseSeleccionada, setClaseSeleccionada] = useState<Clase | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetalle, setOpenDetalle] = useState(false);

    // Hook de instructores
    const {
        data: instructores = [],
        loading: loadingInstructores,
        error: errorInstructores,
    } = useInstructors(user?.role === 'ADMIN');

    // Ya no necesitamos filtrar aquí porque viene filtrado del backend
    // const filteredData = useMemo(() => { ... }, [data, statusFilter]);

    const handleFilterChange = (
        event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        if (newFilter !== null) {
            onStatusFilterChange(newFilter);
        }
    };

    const columns = useMemo(
        () => [
            {
                header: 'Descripción',
                accessorKey: 'description',
                Cell: ({ row }: any) => {
                    const desc = row.original.description || '—';
                    return (
                        <Typography noWrap title={desc} sx={{ maxWidth: 560 }}>
                            {desc}
                        </Typography>
                    );
                },
            },
            {
                header: 'Estado',
                accessorKey: 'estado',
                size: 10,
                Cell: ({ row }: any) => {
                    const desc = row.original.isActive ? 'Activo' : 'Inactivo';
                    return (
                        <Chip color={row.original.isActive ? 'success' : 'error'} label={desc} />
                    );
                },
            },
            {
                header: 'Acciones',
                id: 'acciones',
                enableSorting: false,
                enableColumnFilter: false,
                size: 140,
                Cell: ({ row }: any) => (
                    <>
                        {user && user.role === 'ADMIN' && (

                            <Tooltip title="Editar">
                                <IconButton
                                    onClick={() => {
                                        setClaseSeleccionada(row.original);
                                        setOpenDialog(true);
                                    }}
                                    aria-label="Editar clase"
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>

                        )}
                        <Tooltip title="Ver detalle">
                            <IconButton
                                onClick={() => {
                                    setClaseSeleccionada(row.original);
                                    setOpenDetalle(true);
                                }}
                                aria-label="Ver detalle de clase"
                            >
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>
                    </>
                ),
            },
        ],
        []
    );

    return (
        <>
            <Grid container width="100%" spacing={2}>
                {/* Botones de filtro */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                        <ToggleButtonGroup
                            value={statusFilter}
                            exclusive
                            onChange={handleFilterChange}
                            aria-label="filtro de estado"
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 2,
                                    py: 1,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    fontSize: '0.875rem',
                                },
                            }}
                        >
                            <ToggleButton value="all" aria-label="todas">
                                <ViewListIcon sx={{ mr: 1, fontSize: '1.125rem' }} />
                                Todas
                            </ToggleButton>
                            <ToggleButton value="active" aria-label="activas">
                                <CheckCircleIcon sx={{ mr: 1, fontSize: '1.125rem' }} />
                                Activas
                            </ToggleButton>
                            <ToggleButton value="inactive" aria-label="inactivas">
                                <CancelIcon sx={{ mr: 1, fontSize: '1.125rem' }} />
                                Inactivas
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Typography
                            variant="caption"
                            sx={{ ml: 2, alignSelf: 'center', color: 'text.secondary' }}
                        >
                            {data.length} {data.length === 1 ? 'clase' : 'clases'}
                        </Typography>
                    </Box>
                </Grid>

                {/* Tabla */}
                <Grid item xs={12}>
                    <MaterialReactTable
                        columns={columns as any}
                        data={data}
                        state={{ isLoading: loading }}
                        enableColumnFilters={false}
                        enableGlobalFilter
                        muiTableContainerProps={{ sx: { width: '100%' } }}
                        muiTablePaperProps={{ sx: { width: '100%' } }}
                        muiTableHeadCellProps={{ sx: { fontWeight: 'bold' } }}
                        muiTableBodyCellProps={{ sx: { whiteSpace: 'nowrap' } }}
                        muiPaginationProps={{
                            rowsPerPageOptions: [5, 10, 20, 50],
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
                        localization={{
                            rowsPerPage: 'Filas por página'
                        }}
                    />
                </Grid>
            </Grid>

            <DialogUpsertClase
                open={openDialog}
                onClose={() => { setOpenDialog(false) }}
                clase={claseSeleccionada}
                onRefresh={refresh}
                instructores={instructores}
            />
            <DetailClaseDialog
                open={openDetalle}
                onClose={() => { setOpenDetalle(false) }}
                clase={claseSeleccionada}
            />
        </>
    );
};

export default ListClases;

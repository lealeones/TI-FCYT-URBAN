'use client';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Chip, Grid, IconButton, Tooltip } from '@mui/material';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import {
    useMemo
} from 'react';
import { UserRole, Usuario } from './usuarios.dto';

export type ListUsuariosHandle = { fetchUsers: () => Promise<void> };

type Props = {
    data: Usuario[]
    loading: boolean
    error: unknown
    refresh: () => Promise<void>
    onEdit?: (u: Usuario) => void;
    onView?: (u: Usuario) => void;
};

const ListUsuarios = ({ data, loading, error, refresh, onEdit, onView }: Props) => {


    const columns = useMemo<MRT_ColumnDef<Usuario>[]>(() => [
        { header: 'Nombre', accessorKey: 'name', size: 20 },
        { header: 'DNI', accessorKey: 'dni', size: 10 },
        // {
        //     header: 'Teléfono',
        //     accessorKey: 'phone',
        //     size: 10,
        //     Cell: ({ cell }) => cell.getValue<string | null>() ?? '',
        // },
        {
            header: 'Rol',
            accessorKey: 'role',
            size: 10,
            Cell: ({ cell }) => {
                const role = (cell.getValue<string | null>() ?? '') as UserRole | '';
                const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
                    ADMIN: 'error',
                    INSTRUCTOR: 'secondary',
                    USER: 'primary',
                    GUEST: 'default',
                };
                return <Chip label={role || '—'} color={colorMap[role] ?? 'default'} size="small" sx={{ fontWeight: 'bold' }} />;
            },
        },
        {
            header: 'Acciones',
            id: 'acciones',
            size: 120,
            Cell: ({ row }) => (
                <>
                    <Tooltip title="Editar usuario">
                        <IconButton size="small" onClick={() => onEdit?.(row.original)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver facturas">
                        <IconButton size="small" onClick={() => onView?.(row.original)}>
                            <ReceiptIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            ),
            enableSorting: false,
            enableColumnFilter: false,
        },
    ], [onEdit, onView]);

    return (
        <Grid container width="100%">
            <MaterialReactTable
                columns={columns}
                data={data}
                state={{ isLoading: loading }}
                enableColumnFilters
                enableGlobalFilter
                enableDensityToggle
                localization={MRT_Localization_ES}
                initialState={{
                    density: 'compact',
                    sorting: [{ id: 'name', desc: false }],
                    pagination: { pageSize: 20, pageIndex: 0 },
                }}
                muiTableContainerProps={{ sx: { width: '100%' } }}
                muiTablePaperProps={{ sx: { width: '100%' } }}
                muiTableHeadCellProps={{ sx: { fontWeight: 'bold' } }}
                muiTableBodyCellProps={{ sx: { whiteSpace: 'nowrap' } }}
                muiPaginationProps={{
                    rowsPerPageOptions: [10, 20, 50],
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
        </Grid>
    );
}

export default ListUsuarios;

import React from 'react'
import { Typography, Stack, Box, List, ListItem, ListItemText } from '@mui/material'

/**
 * Configuración centralizada de contenidos informativos para los CustomDialog
 * Usar como: infoContent={DIALOG_INFO.claseUpsert}
 */
export const DIALOG_INFO = {
    claseUpsert: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Crear o editar clases
            </Typography>

            <Typography variant="body2">
                Acá podés crear o editar clases. Tenés dos tipos:
            </Typography>

            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Clase recurrente"
                        secondary={
                            <>
                                Se repite semanalmente. Primero elegís un rango de fechas
                                (por ejemplo, del 1 al 30 del mes) y luego seleccionás
                                qué días querés dar clase (domingo, lunes, martes, etc.)
                                y en qué horario.
                                <br />
                                Ejemplo: “Reggaetón todo el mes, lunes y miércoles de 19:00 a 20:00”.
                            </>
                        }
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Clase puntual"
                        secondary="Pensada para un único encuentro: elegís un día, hora de inicio y hora de fin."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>

            <Typography variant="body2" fontWeight={500}>
                Edición y baja de clases
            </Typography>
            <Typography variant="body2">
                Solo se pueden editar clases que aún no hayan pasado (no se pueden modificar clases en fechas anteriores al día de hoy).
                También podés dar de baja una clase para que deje de mostrarse en el sistema.
            </Typography>
        </Stack>
    ),

    usuarioForm: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Alta y edición de usuarios
            </Typography>

            <Typography variant="body2">
                En este formulario podés dar de alta nuevos usuarios o editar los existentes.
            </Typography>

            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Custom ID"
                        secondary="Es un identificador generado por el sistema. No hace falta que lo completes: se crea automáticamente."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Nombre"
                        secondary="Es obligatorio. Se usa también para la facturación, por eso debe estar completo y correctamente escrito."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Teléfono"
                        secondary="Debe comenzar con la característica, por ejemplo 343 para Paraná (Entre Ríos). Ingresalo sin símbolos ni guiones, solo números."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="RFID"
                        secondary="Este campo vincula al usuario con su llavero/tarjeta RFID para el control de acceso."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>

            <Typography variant="body2">
                En el modo edición también vas a poder dar de baja al usuario para que ya no aparezca como activo en el sistema.
            </Typography>
        </Stack>
    ),

    configuracion: (
        <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
                Configuración del sistema
            </Typography>
            <Typography variant="body2">
                Ajusta los parámetros generales de la aplicación.
            </Typography>
        </Stack>
    ),

    // Agregar más contenidos según necesites...
    // Ejemplo con componente más complejo:
    invoiceDetail: (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Detalles de factura
            </Typography>
            <Typography variant="body2" paragraph>
                Aquí puedes ver y gestionar la información de la factura.
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Nota: Las facturas pagadas no pueden ser editadas.
            </Typography>
        </Box>
    ),

    claseDetail: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Detalle de la clase
            </Typography>
            <Typography variant="body2">
                En esta vista podés ver toda la información de la clase:
            </Typography>
            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Fechas programadas"
                        secondary="Todas las sesiones planificadas con sus horarios y estado"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Participantes"
                        secondary="Lista de alumnos inscriptos en esta clase"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>
        </Stack>
    ),

    dashboard: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Dashboard - Panel de control
            </Typography>
            <Typography variant="body2">
                Vista general con estadísticas y métricas del sistema:
            </Typography>
            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Clases"
                        secondary="Total de clases con discriminación entre activas e inactivas"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Asistentes"
                        secondary="Cantidad de usuarios participando en clases activas"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Usuarios (Solo Admin)"
                        secondary="Total de usuarios del sistema con distribución activos/inactivos"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Facturas (Solo Admin)"
                        secondary="Total de facturas con estado: pagadas y pendientes"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Ingresos (Solo Admin)"
                        secondary="Total de ingresos generados"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>
            <Typography variant="body2" fontWeight={500}>
                Gráficos de distribución
            </Typography>
            <Typography variant="body2">
                Los gráficos de torta muestran la proporción entre clases/usuarios activos e inactivos,
                y el estado de las facturas (pagadas vs pendientes). Se adaptan automáticamente al tamaño
                de pantalla mostrando hasta 3 gráficos en desktop y 2 en mobile.
            </Typography>
        </Stack>
    ),
    attendanceDialog: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Control de asistencias
            </Typography>

            <Typography variant="body2">
                En esta ventana vas a poder ver la lista de asistentes de la clase y marcar quiénes
                están presentes.
            </Typography>

            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Presentes"
                        secondary="Los asistentes marcados como presentes se verán en verde."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Ausentes / sin marcar"
                        secondary="Los que no estén presentes o todavía no se hayan marcado se verán en gris."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>

            <Typography variant="body2">
                Podés cambiar el estado de cada asistente haciendo clic sobre su fila o usando el
                control que aparezca a la derecha.
            </Typography>
        </Stack>
    ),

    accessLogsDialog: (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
                Registro de Accesos
            </Typography>

            <Typography variant="body2">
                Acá podés ver todos los ingresos y egresos de un usuario en una fecha específica.
            </Typography>

            <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Filtro por fecha"
                        secondary="Seleccioná la fecha que querés consultar en el selector superior."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Tipos de registro"
                        secondary="Ingreso (verde) marca cuando el usuario entró. Egreso (naranja) marca cuando salió."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>

                <ListItem sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="Ordenamiento"
                        secondary="Por defecto se muestran ordenados desde el más antiguo al más reciente del día."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                </ListItem>
            </List>
        </Stack>
    )
} as const

/**
 * Type helper para autocompletado
 */
export type DialogInfoKey = keyof typeof DIALOG_INFO

/**
 * Helper function para obtener contenido con validación
 */
export const getDialogInfo = (key: DialogInfoKey) => DIALOG_INFO[key]

'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, Typography, Grid, alpha, useTheme, Box } from '@mui/material'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { CardDetailsData } from './CardDashboardDetailProfesor'

type Props = {
    cardDetails: CardDetailsData | undefined
    userRole: 'ADMIN' | 'INSTRUCTOR'
}

const DashboardCharts = memo(({ cardDetails, userRole }: Props) => {
    const theme = useTheme()

    // Validación temprana para evitar errores
    if (!cardDetails || !cardDetails.sessions || !cardDetails.users) {
        return null
    }

    // Asegurar que los valores sean números válidos
    const sessionsActive = Math.max(0, Number(cardDetails.sessions?.active) || 0)
    const sessionsInactive = Math.max(0, Number(cardDetails.sessions?.inactive) || 0)
    const sessionsTotal = sessionsActive + sessionsInactive

    const usersActive = Math.max(0, Number(cardDetails.users?.active) || 0)
    const usersInactive = Math.max(0, Number(cardDetails.users?.inactive) || 0)
    const usersTotal = usersActive + usersInactive

    const invoicesPaid = Math.max(0, Number(cardDetails.invoices?.paid) || 0)
    const invoicesPending = Math.max(0, Number(cardDetails.invoices?.pending) || 0)
    const invoicesTotal = invoicesPaid + invoicesPending

    // Color adaptativo según el tema
    const textColor = theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary

    // Preparar datos para Recharts (formato array de objetos)
    const sessionsData = [
        { name: 'Activas', value: sessionsActive },
        { name: 'Inactivas', value: sessionsInactive }
    ].filter(d => d.value > 0)

    const usersData = [
        { name: 'Activos', value: usersActive },
        { name: 'Inactivos', value: usersInactive }
    ].filter(d => d.value > 0)

    const invoicesData = [
        { name: 'Pagadas', value: invoicesPaid },
        { name: 'Pendientes', value: invoicesPending }
    ].filter(d => d.value > 0)

    // Colores para gráficos
    const sessionsColors = ['#10b981', '#ef4444']
    const usersColors = ['#3b82f6', '#94a3b8']
    const invoicesColors = ['#10b981', '#f59e0b']

    // Si el usuario es instructor y no hay datos de usuarios, no mostramos ese gráfico
    const showUsersChart = userRole === 'ADMIN' && usersTotal > 0
    const showInvoicesChart = userRole === 'ADMIN'

    // Determinar el tamaño de los gráficos según cuántos se mostrarán
    const chartsToShow = [true, showUsersChart, showInvoicesChart].filter(Boolean).length
    const chartSize = chartsToShow === 3 ? 4 : chartsToShow === 2 ? 6 : 12

    // No renderizar si no hay datos válidos en sesiones
    if (sessionsTotal === 0) {
        return (
            <Card
                sx={theme => ({
                    borderRadius: 3,
                    backdropFilter: 'blur(6px)',
                    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
                        theme.palette.background.paper,
                        0.72
                    )} 100%)`,
                    boxShadow: `0 10px 30px ${alpha('#000', 0.2)}`,
                    p: 4,
                    textAlign: 'center'
                })}
            >
                <Typography variant="body2" color="text.secondary">
                    No hay datos suficientes para mostrar gráficos
                </Typography>
            </Card>
        )
    }

    // Componente reutilizable para gráficos Recharts
    const DonutChart = ({
        data,
        colors,
        tooltipLabel
    }: {
        data: Array<{ name: string; value: number }>
        colors: string[]
        tooltipLabel: string
    }) => {
        const total = data.reduce((sum, d) => sum + d.value, 0)
        const percentOf = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0)

        // Etiqueta personalizada colocada dentro del sector para evitar overflow
        const RADIAN = Math.PI / 180
        const renderLabel = (props: any) => {
            const { cx, cy, midAngle, innerRadius, outerRadius, value, name } = props
            const percent = percentOf(Number(value))
            // Punto a medio camino entre inner y outer radius
            const radius = innerRadius + (outerRadius - innerRadius) * 0.6
            const x = cx + radius * Math.cos(-midAngle * RADIAN)
            const y = cy + radius * Math.sin(-midAngle * RADIAN)
            // No mostrar etiquetas en sectores muy pequeños
            if (percent < 5) return null
            return (
                <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 600 }}>
                    {`${percent}%`}
                </text>
            )
        }
        return (
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        label={renderLabel}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '8px',
                            color: textColor
                        }}
                        formatter={(value: number, name: string) => [
                            `${value} ${tooltipLabel} (${percentOf(Number(value))}%)`,
                            name
                        ]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ color: textColor, paddingTop: '20px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        )
    }

    return (
        <Grid container spacing={6}>
            {/* Gráfico de Sesiones */}
            <Grid item xs={12} sm={6} md={chartSize}>
                <Card
                    sx={theme => ({
                        borderRadius: 3,
                        backdropFilter: 'blur(6px)',
                        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
                            theme.palette.background.paper,
                            0.72
                        )} 100%)`,
                        boxShadow: `0 10px 30px ${alpha('#000', 0.2)}`
                    })}
                >
                    <CardHeader
                        title={
                            <Typography
                                variant='h6'
                                sx={theme => ({
                                    fontWeight: 800,
                                    letterSpacing: 0.2,
                                    background: `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(
                                        theme.palette.text.primary,
                                        0.55
                                    )} 100%)`,
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text'
                                })}
                            >
                                Distribución de Clases
                            </Typography>
                        }
                        subheader={
                            <span className='text-textSecondary'>
                                {sessionsTotal} clases • {sessionsActive} activas
                            </span>
                        }
                    />
                    <CardContent>
                        {sessionsData.length > 0 ? (
                            <DonutChart
                                data={sessionsData}
                                colors={sessionsColors}
                                tooltipLabel="clases"
                            />
                        ) : (
                            <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant='body2' color='text.secondary'>Sin datos para sesiones</Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Gráfico de Usuarios (solo para ADMIN) */}
            {showUsersChart && (
                <Grid item xs={12} sm={6} md={chartSize}>
                    <Card
                        sx={theme => ({
                            borderRadius: 3,
                            backdropFilter: 'blur(6px)',
                            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
                                theme.palette.background.paper,
                                0.72
                            )} 100%)`,
                            boxShadow: `0 10px 30px ${alpha('#000', 0.2)}`
                        })}
                    >
                        <CardHeader
                            title={
                                <Typography
                                    variant='h6'
                                    sx={theme => ({
                                        fontWeight: 800,
                                        letterSpacing: 0.2,
                                        background: `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(
                                            theme.palette.text.primary,
                                            0.55
                                        )} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text'
                                    })}
                                >
                                    Distribución de Usuarios
                                </Typography>
                            }
                            subheader={
                                <span className='text-textSecondary'>
                                    {usersTotal} usuarios • {usersActive} activos
                                </span>
                            }
                        />
                        <CardContent>
                            {usersData.length > 0 ? (
                                <DonutChart
                                    data={usersData}
                                    colors={usersColors}
                                    tooltipLabel="usuarios"
                                />
                            ) : (
                                <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant='body2' color='text.secondary'>Sin datos para usuarios</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            )}

            {/* Gráfico de Facturas (solo para ADMIN) */}
            {showInvoicesChart && (
                <Grid item xs={12} sm={6} md={chartSize}>
                    <Card
                        sx={theme => ({
                            borderRadius: 3,
                            backdropFilter: 'blur(6px)',
                            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
                                theme.palette.background.paper,
                                0.72
                            )} 100%)`,
                            boxShadow: `0 10px 30px ${alpha('#000', 0.2)}`
                        })}
                    >
                        <CardHeader
                            title={
                                <Typography
                                    variant='h6'
                                    sx={theme => ({
                                        fontWeight: 800,
                                        letterSpacing: 0.2,
                                        background: `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(
                                            theme.palette.text.primary,
                                            0.55
                                        )} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text'
                                    })}
                                >
                                    Estado de Facturas
                                </Typography>
                            }
                            subheader={
                                <span className='text-textSecondary'>
                                    {invoicesTotal} facturas • {invoicesPending} pendientes
                                </span>
                            }
                        />
                        <CardContent>
                            {invoicesData.length > 0 ? (
                                <DonutChart
                                    data={invoicesData}
                                    colors={invoicesColors}
                                    tooltipLabel="facturas"
                                />
                            ) : (
                                <Box
                                    sx={{
                                        height: 280,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 2
                                    }}
                                >
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: 'text.secondary',
                                            fontWeight: 500
                                        }}
                                    >
                                        📋
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            textAlign: 'center'
                                        }}
                                    >
                                        No hay facturas este mes
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            )}
        </Grid>
    )
})

DashboardCharts.displayName = 'DashboardCharts'

export default DashboardCharts

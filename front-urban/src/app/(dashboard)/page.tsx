'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Components Imports
import CustomAvatar from '@/@core/components/mui/Avatar'
import { useDashboard } from '@/@core/hooks/useDashboard'
import CardAccess from '@/components/card-statistics/CardAccess'
import Link from '@/components/Link'
import { Snapshot } from '@/views/clases/FechasProgramadasAccordion'
import CardDashboardDetail from '@/views/dashboard/CardDashboardDetailProfesor'
import DashboardCharts from '@/views/dashboard/DashboardCharts'
import DialogAttendanceSnapshot from '@/views/dashboard/DialogAttendanceSnapshot'
import { alpha, Card, CardContent, CardHeader, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { useUserAuth } from '../context/UserAuth'

enum RoleDashboard {
  ADMIN = 'ADMIN',
  PROFESOR = 'PROFESOR'
}

const DashboardAnalytics = () => {
  const { user } = useUserAuth()
  const { data, error, loading, refresh } = useDashboard()

  const { role, customId, dni, phone, birth, rfid, deleted, name } = user || {}

  const dashboardUser = {
    'ADMIN': <DashboardAdmin data={data} loading={loading} />,
    'INSTRUCTOR': <DashboardInstructor data={data} loading={loading} />
  }

  return <>{dashboardUser[role as keyof typeof dashboardUser] ?? null}</>
}

export default DashboardAnalytics

// de profesor / admin
const DashboardAdmin = ({ data, loading }: { data: any; loading: boolean }) => {
  const sessions = data?.sessions ?? []

  // ---- estado del diálogo de asistencia
  const [attDialogOpen, setAttDialogOpen] = useState(false)
  const [attSnapshot, setAttSnapshot] = useState<Partial<Snapshot> | null>(null)

  const handleOpenAttendance = (item: any) => {
    // armamos un objeto Snapshot mínimo con los campos que usa el dialog
    const snap: Partial<Snapshot> = {
      id: item.id,
      // el tipo Snapshot real puede tener más campos; los no usados por el dialog se pueden omitir
      substituteInstructors: []
    }

    setAttSnapshot(snap)
    setAttDialogOpen(true)
  }

  const handleCloseAttendance = () => {
    setAttDialogOpen(false)
    setAttSnapshot(null)
  }

  if (loading) return <div>Loading...</div>

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4}>
        <CardAccess accessLog={data?.accessLog!} />
      </Grid>
      <Grid item xs={12} md={8} lg={8}>
        <CardDashboardDetail cardDetails={data?.cardDetails} />
      </Grid>

      {/* Gráficos de torta */}
      <Grid item xs={12}>
        <DashboardCharts cardDetails={data?.cardDetails} userRole="ADMIN" />
      </Grid>

      <Grid item xs={12}>
        <Grid item xs={12} className='border-be md:border-be-0 md:border-ie'>
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
                  Clases futuras
                </Typography>
              }
              action={
                <Typography component={Link} className='font-medium' color='primary' href='/clases'>
                  Ver todas
                </Typography>
              }
              subheader={<span className='text-textSecondary'>Próximas 10 sesiones</span>}
            />
            <CardContent className='flex flex-col gap-5'>
              {sessions.length === 0 ? (
                <Typography color='text.secondary'>No hay clases próximas.</Typography>
              ) : (
                sessions.map((item: any) => (
                  <div key={item.id} className='flex items-center gap-4'>
                    <CustomAvatar
                      variant='rounded'
                      color='primary'
                      className='shadow-xs'
                      sx={{
                        transition: 'transform .18s ease, box-shadow .18s ease',
                        willChange: 'transform',
                        '&:hover': { transform: 'translateY(-2px) scale(1.03)' }
                      }}
                    >
                      <i className='ri-calendar-event-line' />
                    </CustomAvatar>

                    <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                      <div className='flex flex-col gap-0.5'>
                        <Typography color='text.primary' className='font-medium'>
                          {item.description}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {item.instructors || '—'}
                        </Typography>
                      </div>

                      <div>
                        <Tooltip arrow title={'Marcar asistencia'} placement='top'>
                          <IconButton onClick={() => handleOpenAttendance(item)}>
                            <div className='ri-timer-line' />
                          </IconButton>
                        </Tooltip>

                        <Tooltip arrow title={formatDateTime(item.startDate)} placement='top'>
                          <Chip
                            label={`${formatTime(item.startDate)} hs`}
                            color='info'
                            variant='filled'
                            sx={theme => ({
                              fontWeight: 700,
                              letterSpacing: 0.2,
                              border: `1px solid ${alpha(theme.palette.info.main, 0.5)}`,
                              transition: 'transform .15s ease, box-shadow .15s ease, filter .15s ease',
                              '&:hover': {
                                transform: 'scale(1.04)',
                                boxShadow: `0 8px 22px ${alpha(theme.palette.info.main, 0.35)}`,
                                filter: 'saturate(1.05)'
                              }
                            })}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de asistencia */}
      <DialogAttendanceSnapshot
        snapshot={attSnapshot as Snapshot}
        open={attDialogOpen}
        onClose={handleCloseAttendance}
      />
    </Grid>
  )
}



const DashboardInstructor = ({ data, loading }: { data: any; loading: boolean }) => {
  const sessions = data?.sessions ?? []

  // ---- estado del diálogo de asistencia
  const [attDialogOpen, setAttDialogOpen] = useState(false)
  const [attSnapshot, setAttSnapshot] = useState<Partial<Snapshot> | null>(null)

  const handleOpenAttendance = (item: any) => {
    // armamos un objeto Snapshot mínimo con los campos que usa el dialog
    const snap: Partial<Snapshot> = {
      id: item.id,
      // el tipo Snapshot real puede tener más campos; los no usados por el dialog se pueden omitir
      substituteInstructors: []
    }

    setAttSnapshot(snap)
    setAttDialogOpen(true)
  }

  const handleCloseAttendance = () => {
    setAttDialogOpen(false)
    setAttSnapshot(null)
  }

  if (loading) return <div>Loading...</div>

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4}>
        <CardAccess accessLog={data?.accessLog!} />
      </Grid>
      <Grid item xs={12} md={8} lg={8}>
        <CardDashboardDetail cardDetails={data?.cardDetails} />
      </Grid>

      {/* Gráficos de torta */}
      <Grid item xs={12}>
        <DashboardCharts cardDetails={data?.cardDetails} userRole="INSTRUCTOR" />
      </Grid>

      <Grid item xs={12}>
        <Grid item xs={12} className='border-be md:border-be-0 md:border-ie'>
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
                  Clases futuras
                </Typography>
              }
              action={
                <Typography component={Link} className='font-medium' color='primary' href='/clases'>
                  Ver todas
                </Typography>
              }
              subheader={<span className='text-textSecondary'>Próximas 10 sesiones</span>}
            />
            <CardContent className='flex flex-col gap-5'>
              {sessions.length === 0 ? (
                <Typography color='text.secondary'>No hay clases próximas.</Typography>
              ) : (
                sessions.map((item: any) => (
                  <div key={item.id} className='flex items-center gap-4'>
                    <CustomAvatar
                      variant='rounded'
                      color='primary'
                      className='shadow-xs'
                      sx={{
                        transition: 'transform .18s ease, box-shadow .18s ease',
                        willChange: 'transform',
                        '&:hover': { transform: 'translateY(-2px) scale(1.03)' }
                      }}
                    >
                      <i className='ri-calendar-event-line' />
                    </CustomAvatar>

                    <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                      <div className='flex flex-col gap-0.5'>
                        <Typography color='text.primary' className='font-medium'>
                          {item.description}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {item.instructors || '—'}
                        </Typography>
                      </div>

                      <div>
                        <Tooltip arrow title={'Marcar asistencia'} placement='top'>
                          <IconButton onClick={() => handleOpenAttendance(item)}>
                            <div className='ri-timer-line' />
                          </IconButton>
                        </Tooltip>

                        <Tooltip arrow title={formatDateTime(item.startDate)} placement='top'>
                          <Chip
                            label={`${formatTime(item.startDate)} hs`}
                            color='info'
                            variant='filled'
                            sx={theme => ({
                              fontWeight: 700,
                              letterSpacing: 0.2,
                              border: `1px solid ${alpha(theme.palette.info.main, 0.5)}`,
                              transition: 'transform .15s ease, box-shadow .15s ease, filter .15s ease',
                              '&:hover': {
                                transform: 'scale(1.04)',
                                boxShadow: `0 8px 22px ${alpha(theme.palette.info.main, 0.35)}`,
                                filter: 'saturate(1.05)'
                              }
                            })}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de asistencia */}
      <DialogAttendanceSnapshot
        snapshot={attSnapshot as Snapshot}
        open={attDialogOpen}
        onClose={handleCloseAttendance}
      />
    </Grid>
  )
}


const formatTime = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

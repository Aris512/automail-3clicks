import { Head } from '@inertiajs/react'
import { useState } from 'react'
import AppSidebar from '~/components/AppSidebar'
import StatsCards from '~/components/dashboard/StatsCards'
import SendingsOverTimeChart from '~/components/dashboard/SendingsOverTimeChart'
import SendingsByCampaignPieChart from '~/components/dashboard/SendingsByCampaignPieChart'
import CampaignsList from '~/components/dashboard/CampaignsList'

interface User {
  id: number
  fullName: string
  email: string
}

interface DashboardStats {
  totals: {
    sendings: { total: number; sent: number; failed: number }
    campaigns: { total: number; active: number; paused: number; completed: number }
    stages: number
  }
  sendingsOverTime: Array<{ period: string; count: number }>
  sendingsByCampaign: Array<{ campaignId: number; campaignName: string; count: number }>
  sendingsByStage: Array<{
    campaignId: number
    campaignName: string
    stageId: number
    stageName: string
    count: number
  }>
  deliverability: {
    totalSent: number
    delivered: number
    failed: number
    deliverabilityRate: number
    overTime: Array<{ period: string; sent: number; delivered: number }>
  }
}

interface DashboardProps {
  user: User
  isFirstVisit: boolean
  stats: DashboardStats | null
}

export default function Dashboard({ user, isFirstVisit, stats }: DashboardProps) {
  const [sendingsOverTime, setSendingsOverTime] = useState<Array<{ period: string; count: number }>>(
    stats?.sendingsOverTime || []
  )

  // Función para obtener el token CSRF
  const getCsrfToken = () => {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    return metaTag?.getAttribute('content') || ''
  }

  // Función para cargar datos de envíos por tiempo según el período
  const loadSendingsOverTime = async (period: 'minute' | 'hour' | 'day' | 'week') => {
    try {
      const response = await fetch(`/api/dashboard/stats/sendings-over-time?period=${period}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success) {
        setSendingsOverTime(result.data || [])
      }
    } catch (error) {
      console.error('Error al cargar datos de envíos por tiempo:', error)
    }
  }

  // Si no hay stats, mostrar mensaje
  if (!stats) {
    return (
      <>
        <Head title="Dashboard" />
        <AppSidebar user={user} pageTitle="Dashboard" isFirstVisit={isFirstVisit}>
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="max-w-md w-full text-center">
              <p className="text-lg text-gray-600">
                No se pudieron cargar las estadísticas. Por favor, intenta nuevamente.
              </p>
            </div>
          </div>
        </AppSidebar>
      </>
    )
  }

  return (
    <>
      <Head title="Dashboard" />
      <AppSidebar user={user} pageTitle="Dashboard" isFirstVisit={isFirstVisit}>
        <div className="container mx-auto p-6 space-y-6">
          {/* Tarjetas de Resumen */}
          <StatsCards totals={stats.totals} />

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {/* Gráfico de Envíos por Tiempo */}
            <div className="lg:col-span-2">
              <SendingsOverTimeChart
                data={sendingsOverTime}
                onPeriodChange={loadSendingsOverTime}
              />
            </div>

            {/* Lista de Campañas con Etapas */}
            <CampaignsList 
              campaigns={stats.sendingsByCampaign} 
              stages={stats.sendingsByStage} 
            />

            {/* Gráfico Circular de Envíos por Campaña */}
            <SendingsByCampaignPieChart campaigns={stats.sendingsByCampaign} />
          </div>
        </div>
      </AppSidebar>
    </>
  )
}

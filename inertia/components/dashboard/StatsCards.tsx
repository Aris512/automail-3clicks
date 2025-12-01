import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Mail, Megaphone, Layers, CheckCircle2, XCircle } from 'lucide-react'

interface StatsCardsProps {
  totals: {
    sendings: { total: number; sent: number; failed: number }
    campaigns: { total: number; active: number; paused: number; completed: number }
    stages: number
  }
}

export default function StatsCards({ totals }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Tarjeta de Envíos Totales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Envíos</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.sendings.total.toLocaleString()}</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>{totals.sendings.sent.toLocaleString()} enviados</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>{totals.sendings.failed.toLocaleString()} fallidos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de Campañas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campañas</CardTitle>
          <Megaphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.campaigns.total.toLocaleString()}</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="text-green-600">{totals.campaigns.active} activas</span>
            <span className="text-yellow-600">{totals.campaigns.paused} pausadas</span>
            <span className="text-gray-600">{totals.campaigns.completed} completadas</span>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de Etapas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Etapas</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.stages.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Total de etapas configuradas
          </p>
        </CardContent>
      </Card>

      {/* Tarjeta de Tasa de Éxito */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totals.sendings.total > 0
              ? ((totals.sendings.sent / totals.sendings.total) * 100).toFixed(1)
              : '0'}
            %
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {totals.sendings.sent} de {totals.sendings.total} envíos exitosos
          </p>
        </CardContent>
      </Card>
    </div>
  )
}






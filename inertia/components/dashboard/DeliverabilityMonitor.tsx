import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { DateTime } from 'luxon'

interface DeliverabilityMonitorProps {
  data: {
    totalSent: number
    delivered: number
    failed: number
    deliverabilityRate: number
    overTime: Array<{ period: string; sent: number; delivered: number }>
  }
}

export default function DeliverabilityMonitor({ data }: DeliverabilityMonitorProps) {
  // Preparar datos para el gráfico
  const chartData = data.overTime.map((item) => {
    // Si el periodo viene en formato ISO, convertirlo a formato legible
    let formattedPeriod = item.period
    try {
      const date = DateTime.fromISO(item.period)
      if (date.isValid) {
        formattedPeriod = date.toFormat('dd/MM/yyyy')
      }
    } catch {
      // Si ya está formateado, usar tal cual
    }
    
    return {
      period: formattedPeriod,
      'Enviados': item.sent,
      'Entregados': item.delivered,
    }
  })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Monitor de Entregabilidad (Deliverability)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
              <div className="p-3 bg-blue-100 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Enviados</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalSent.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Entregados</p>
                <p className="text-2xl font-bold text-green-600">{data.delivered.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg">
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Entregabilidad</p>
                <p className="text-2xl font-bold text-orange-600">{data.deliverabilityRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={chartData.length > 15 ? Math.floor(chartData.length / 15) : 0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), '']}
                />
                <Legend />
                <Bar dataKey="Enviados" fill="#8884d8" name="Emails Enviados" />
                <Bar dataKey="Entregados" fill="#82ca9d" name="Emails Entregados" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No hay datos disponibles
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


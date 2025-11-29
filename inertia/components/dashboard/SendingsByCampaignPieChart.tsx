import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SendingsByCampaignPieChartProps {
  campaigns: Array<{ campaignId: number; campaignName: string; count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function SendingsByCampaignPieChart({ campaigns }: SendingsByCampaignPieChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([])
  const [loading, setLoading] = useState(false)

  // Función para obtener el token CSRF
  const getCsrfToken = () => {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    return metaTag?.getAttribute('content') || ''
  }

  // Cargar datos según el período seleccionado
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/dashboard/stats/sendings-by-campaign?period=${selectedPeriod}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
          },
          credentials: 'include',
        })

        const result = await response.json()

        if (result.success) {
          const data = result.data || []
          setChartData(
            data.map((item: { campaignId: number; campaignName: string; count: number }) => ({
              name: item.campaignName,
              value: item.count,
            }))
          )
        }
      } catch (error) {
        console.error('Error al cargar datos de envíos por campaña:', error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedPeriod])

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Envíos por Campaña</CardTitle>
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'daily' | 'weekly' | 'monthly')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diarios</SelectItem>
              <SelectItem value="weekly">Semanales</SelectItem>
              <SelectItem value="monthly">Mensuales</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Cargando datos...
          </div>
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), 'Envíos']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-sm text-muted-foreground">
              Total de envíos ({selectedPeriod === 'daily' ? 'diarios' : selectedPeriod === 'weekly' ? 'semanales' : 'mensuales'}):{' '}
              <span className="font-semibold">{total.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos disponibles para el período seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  )
}


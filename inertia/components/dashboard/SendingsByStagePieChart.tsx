import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SendingsByStagePieChartProps {
  data: Array<{
    campaignId: number
    campaignName: string
    stageId: number
    stageName: string
    count: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function SendingsByStagePieChart({ data }: SendingsByStagePieChartProps) {
  // Obtener lista única de campañas
  const campaigns = useMemo(() => {
    const uniqueCampaigns = new Map<number, string>()
    data.forEach((item) => {
      if (!uniqueCampaigns.has(item.campaignId)) {
        uniqueCampaigns.set(item.campaignId, item.campaignName)
      }
    })
    return Array.from(uniqueCampaigns.entries()).map(([id, name]) => ({ id, name }))
  }, [data])

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    campaigns.length > 0 ? campaigns[0].id : null
  )

  // Filtrar y preparar datos para el gráfico circular
  const chartData = useMemo(() => {
    if (!selectedCampaignId) return []

    const filteredData = data.filter((item) => item.campaignId === selectedCampaignId)

    return filteredData.map((item) => ({
      name: item.stageName,
      value: item.count,
    }))
  }, [data, selectedCampaignId])

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Envíos por Etapa (Gráfico Circular)</CardTitle>
          <Select
            value={selectedCampaignId?.toString() || ''}
            onValueChange={(value) => {
              setSelectedCampaignId(value ? Number(value) : null)
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Seleccionar campaña" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
              Total de envíos: <span className="font-semibold">{total.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {selectedCampaignId
              ? 'No hay datos disponibles para esta campaña'
              : 'Selecciona una campaña para ver los datos'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}






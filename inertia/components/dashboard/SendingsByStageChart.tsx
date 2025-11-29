import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SendingsByStageChartProps {
  data: Array<{
    campaignId: number
    campaignName: string
    stageId: number
    stageName: string
    count: number
  }>
}

export default function SendingsByStageChart({ data }: SendingsByStageChartProps) {
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

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | 'all'>(
    campaigns.length > 0 ? campaigns[0].id : 'all'
  )

  // Filtrar y agrupar datos según la campaña seleccionada
  const chartData = useMemo(() => {
    let filteredData = data

    if (selectedCampaignId !== 'all') {
      filteredData = data.filter((item) => item.campaignId === selectedCampaignId)
    }

    // Agrupar por etapa y sumar los conteos
    const stageMap = new Map<string, number>()
    filteredData.forEach((item) => {
      const key = selectedCampaignId === 'all' 
        ? `${item.campaignName} - ${item.stageName}`
        : item.stageName
      const currentCount = stageMap.get(key) || 0
      stageMap.set(key, currentCount + item.count)
    })

    return Array.from(stageMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15) // Limitar a top 15 para mejor visualización
  }, [data, selectedCampaignId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Envíos por Etapa</CardTitle>
          <Select
            value={selectedCampaignId === 'all' ? 'all' : selectedCampaignId.toString()}
            onValueChange={(value) => {
              setSelectedCampaignId(value === 'all' ? 'all' : Number(value))
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Seleccionar campaña" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las campañas</SelectItem>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Envíos']}
              />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" name="Envíos" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {selectedCampaignId === 'all'
              ? 'No hay datos disponibles'
              : 'No hay datos disponibles para esta campaña'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


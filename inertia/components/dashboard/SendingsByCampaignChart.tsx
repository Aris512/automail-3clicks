import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SendingsByCampaignChartProps {
  data: Array<{ campaignId: number; campaignName: string; count: number }>
}

export default function SendingsByCampaignChart({ data }: SendingsByCampaignChartProps) {
  // Limitar a las top 10 campañas para mejor visualización
  const chartData = data
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      name: item.campaignName.length > 20 ? `${item.campaignName.substring(0, 20)}...` : item.campaignName,
      fullName: item.campaignName,
      count: item.count,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envíos por Campaña</CardTitle>
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
                labelFormatter={(value) => {
                  const item = chartData.find((d) => d.name === value)
                  return item ? item.fullName : value
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Envíos" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos disponibles
          </div>
        )}
      </CardContent>
    </Card>
  )
}








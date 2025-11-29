import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DateTime } from 'luxon'

interface SendingsOverTimeChartProps {
  data: Array<{ period: string; count: number }>
  onPeriodChange?: (period: 'minute' | 'hour' | 'day' | 'week') => void
}

export default function SendingsOverTimeChart({ data, onPeriodChange }: SendingsOverTimeChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'minute' | 'hour' | 'day' | 'week'>('day')

  const handlePeriodChange = (value: string) => {
    const period = value as 'minute' | 'hour' | 'day' | 'week'
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  // Formatear los datos para el gráfico
  const chartData = data.map((item) => {
    const date = DateTime.fromISO(item.period)
    let formattedDate = ''

    switch (selectedPeriod) {
      case 'minute':
        formattedDate = date.toFormat('HH:mm')
        break
      case 'hour':
        formattedDate = date.toFormat('dd/MM HH:mm')
        break
      case 'day':
        formattedDate = date.toFormat('dd/MM/yyyy')
        break
      case 'week':
        formattedDate = `Semana ${date.weekNumber} - ${date.year}`
        break
    }

    return {
      period: formattedDate,
      count: item.count,
      fullDate: date.toISO(),
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Envíos por Tiempo</CardTitle>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">Por Minuto</SelectItem>
              <SelectItem value="hour">Por Hora</SelectItem>
              <SelectItem value="day">Por Día</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                labelFormatter={(value) => {
                  const item = chartData.find((d) => d.period === value)
                  return item ? DateTime.fromISO(item.fullDate).toFormat('dd/MM/yyyy HH:mm') : value
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                strokeWidth={2}
                name="Envíos"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos disponibles para el período seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  )
}


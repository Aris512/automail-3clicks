import { DateTime } from 'luxon'
import Sending from '#models/sending'
import Campaign from '#models/campaign'
import CampaignStage from '#models/campaign_stage'
import Database from '@adonisjs/lucid/services/db'

export interface DashboardStats {
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

export default class DashboardStatsService {
  /**
   * Obtiene todas las estadísticas del dashboard para un tenant
   */
  async getDashboardStats(tenantId: number): Promise<DashboardStats> {
    const [totals, sendingsOverTime, sendingsByCampaign, sendingsByStage, deliverability] = await Promise.all([
      this.getTotals(tenantId),
      this.getSendingsOverTime(tenantId, 'day'), // Por defecto día
      this.getSendingsByCampaign(tenantId),
      this.getSendingsByStage(tenantId),
      this.getDeliverabilityStats(tenantId),
    ])

    return {
      totals,
      sendingsOverTime,
      sendingsByCampaign,
      sendingsByStage,
      deliverability,
    }
  }

  /**
   * Obtiene los totales de envíos, campañas y etapas
   */
  private async getTotals(tenantId: number) {
    // Total de envíos
    const totalSendings = await Sending.query()
      .where('tenantId', tenantId)
      .count('* as total')
      .first()

    const sentSendings = await Sending.query()
      .where('tenantId', tenantId)
      .where('deliveryStatus', 'enviado')
      .count('* as total')
      .first()

    const failedSendings = await Sending.query()
      .where('tenantId', tenantId)
      .where('deliveryStatus', 'no enviado')
      .count('* as total')
      .first()

    // Total de campañas por estado
    const campaigns = await Campaign.query()
      .where('tenantId', tenantId)
      .select('status')
      .count('* as count')
      .groupBy('status')

    const campaignsByStatus = {
      active: 0,
      paused: 0,
      completed: 0,
    }

    campaigns.forEach((campaign: any) => {
      const status = campaign.status as 'active' | 'paused' | 'completed'
      const count = Number(campaign.$extras.count || 0)
      campaignsByStatus[status] = count
    })

    const totalCampaigns = campaignsByStatus.active + campaignsByStatus.paused + campaignsByStatus.completed

    // Total de etapas
    const totalStages = await CampaignStage.query()
      .where('tenantId', tenantId)
      .count('* as total')
      .first()

    return {
      sendings: {
        total: Number(totalSendings?.$extras.total || 0),
        sent: Number(sentSendings?.$extras.total || 0),
        failed: Number(failedSendings?.$extras.total || 0),
      },
      campaigns: {
        total: totalCampaigns,
        active: campaignsByStatus.active,
        paused: campaignsByStatus.paused,
        completed: campaignsByStatus.completed,
      },
      stages: Number(totalStages?.$extras.total || 0),
    }
  }

  /**
   * Obtiene envíos agrupados por período de tiempo
   * @param period - 'minute', 'hour', 'day', 'week'
   */
  async getSendingsOverTime(tenantId: number, period: 'minute' | 'hour' | 'day' | 'week' = 'day') {
    // Mapear períodos a formato PostgreSQL DATE_TRUNC
    const truncFormat = {
      minute: 'minute',
      hour: 'hour',
      day: 'day',
      week: 'week',
    }[period]

    // Usar consulta raw con Knex para DATE_TRUNC de PostgreSQL
    // Interpolamos el formato de truncamiento directamente ya que viene de un enum controlado
    // y el tenantId es un número validado
    const query = `
      SELECT 
        DATE_TRUNC('${truncFormat}', sent_at) as period,
        COUNT(*) as count
      FROM sendings
      WHERE tenant_id = ${tenantId} AND sent_at IS NOT NULL
      GROUP BY DATE_TRUNC('${truncFormat}', sent_at)
      ORDER BY period ASC
    `
    
    const results = await Database.rawQuery(query)

    // En PostgreSQL con Knex, los resultados vienen en results.rows
    const rows = Array.isArray(results) ? results : (results.rows || [])

    return rows.map((row: any) => ({
      period: row.period ? (DateTime.fromJSDate(new Date(row.period)).toISO() || '') : '',
      count: Number(row.count || 0),
    }))
  }

  /**
   * Obtiene todas las campañas con su conteo de envíos (incluye campañas sin envíos)
   */
  private async getSendingsByCampaign(tenantId: number) {
    // Obtener todas las campañas del tenant
    const allCampaigns = await Campaign.query()
      .where('tenantId', tenantId)
      .orderBy('createdAt', 'desc')

    // Obtener conteos de envíos por campaña
    const sendingsCounts = await Database.from('sendings')
      .select('campaign_id as campaignId')
      .count('* as count')
      .where('tenant_id', tenantId)
      .whereNotNull('campaign_id')
      .groupBy('campaign_id')

    // Crear un mapa de conteos
    const countsMap = new Map<number, number>()
    sendingsCounts.forEach((row: any) => {
      countsMap.set(Number(row.campaignId), Number(row.count || 0))
    })

    // Combinar campañas con sus conteos
    return allCampaigns.map((campaign) => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      count: countsMap.get(campaign.id) || 0,
    }))
  }

  /**
   * Obtiene todas las etapas con su conteo de envíos (incluye etapas sin envíos)
   */
  private async getSendingsByStage(tenantId: number) {
    // Obtener todas las etapas del tenant con sus campañas
    const allStages = await CampaignStage.query()
      .where('tenantId', tenantId)
      .preload('campaign')
      .orderBy('campaignId', 'asc')
      .orderBy('stageNumber', 'asc')

    // Obtener conteos de envíos por etapa
    const sendingsCounts = await Database.from('sendings')
      .select('campaign_stage_id as stageId')
      .count('* as count')
      .where('tenant_id', tenantId)
      .whereNotNull('campaign_stage_id')
      .groupBy('campaign_stage_id')

    // Crear un mapa de conteos
    const countsMap = new Map<number, number>()
    sendingsCounts.forEach((row: any) => {
      countsMap.set(Number(row.stageId), Number(row.count || 0))
    })

    // Combinar etapas con sus conteos
    return allStages.map((stage) => ({
      campaignId: stage.campaignId,
      campaignName: stage.campaign?.name || 'Sin campaña',
      stageId: stage.id,
      stageName: stage.name,
      count: countsMap.get(stage.id) || 0,
    }))
  }

  /**
   * Obtiene estadísticas de deliverability (entregabilidad)
   */
  private async getDeliverabilityStats(tenantId: number) {
    // Total de envíos enviados
    const totalSent = await Sending.query()
      .where('tenantId', tenantId)
      .where('deliveryStatus', 'enviado')
      .count('* as total')
      .first()

    // Total de envíos entregados (consideramos 'enviado' como entregado)
    const delivered = await Sending.query()
      .where('tenantId', tenantId)
      .where('deliveryStatus', 'enviado')
      .whereNotNull('sentAt')
      .count('* as total')
      .first()

    // Total de envíos fallidos
    const failed = await Sending.query()
      .where('tenantId', tenantId)
      .where('deliveryStatus', 'no enviado')
      .count('* as total')
      .first()

    const totalSentCount = Number(totalSent?.$extras.total || 0)
    const deliveredCount = Number(delivered?.$extras.total || 0)
    const failedCount = Number(failed?.$extras.total || 0)

    // Calcular tasa de entregabilidad
    const deliverabilityRate = totalSentCount > 0 
      ? (deliveredCount / totalSentCount) * 100 
      : 0

    // Obtener datos por tiempo (últimos 30 días)
    const query = `
      SELECT 
        DATE_TRUNC('day', sent_at) as period,
        COUNT(*) FILTER (WHERE delivery_status = 'enviado') as sent,
        COUNT(*) FILTER (WHERE delivery_status = 'enviado' AND sent_at IS NOT NULL) as delivered
      FROM sendings
      WHERE tenant_id = ${tenantId} 
        AND sent_at IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', sent_at)
      ORDER BY period ASC
    `
    
    const results = await Database.rawQuery(query)
    const rows = Array.isArray(results) ? results : (results.rows || [])

    const overTime = rows.map((row: any) => ({
      period: row.period 
        ? DateTime.fromJSDate(new Date(row.period)).toFormat('dd/MM/yyyy')
        : '',
      sent: Number(row.sent || 0),
      delivered: Number(row.delivered || 0),
    }))

    return {
      totalSent: totalSentCount,
      delivered: deliveredCount,
      failed: failedCount,
      deliverabilityRate,
      overTime,
    }
  }

  /**
   * Obtiene envíos por campaña filtrados por período
   * @param tenantId - ID del tenant
   * @param period - 'daily', 'weekly', 'monthly'
   */
  async getSendingsByCampaignByPeriod(
    tenantId: number,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ) {
    // Calcular la fecha de inicio según el período
    const now = DateTime.now()
    let startDate: DateTime

    switch (period) {
      case 'daily':
        // Últimas 24 horas
        startDate = now.minus({ days: 1 })
        break
      case 'weekly':
        // Últimos 7 días
        startDate = now.minus({ days: 7 })
        break
      case 'monthly':
        // Últimos 30 días
        startDate = now.minus({ days: 30 })
        break
    }

    // Obtener todas las campañas del tenant
    const allCampaigns = await Campaign.query()
      .where('tenantId', tenantId)
      .orderBy('createdAt', 'desc')

    // Obtener conteos de envíos por campaña en el período
    const startDateSQL = startDate.toSQL()
    if (!startDateSQL) {
      return []
    }

    const sendingsCounts = await Database.from('sendings')
      .select('campaign_id as campaignId')
      .count('* as count')
      .where('tenant_id', tenantId)
      .whereNotNull('campaign_id')
      .whereNotNull('sent_at')
      .where('sent_at', '>=', startDateSQL)
      .groupBy('campaign_id')

    // Crear un mapa de conteos
    const countsMap = new Map<number, number>()
    sendingsCounts.forEach((row: any) => {
      countsMap.set(Number(row.campaignId), Number(row.count || 0))
    })

    // Combinar campañas con sus conteos, filtrando solo las que tienen envíos en el período
    return allCampaigns
      .map((campaign) => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        count: countsMap.get(campaign.id) || 0,
      }))
      .filter((campaign) => campaign.count > 0) // Solo mostrar campañas con envíos en el período
  }
}


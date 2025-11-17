import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import Campaign from './campaign.js'
import Template from './template.js'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class CampaignStage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare campaignId: number

  @column()
  declare stageNumber: number

  @column()
  declare name: string

  @column.dateTime()
  declare startsAt?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @manyToMany(() => Template, {
    pivotTable: 'campaign_stage_templates',
    pivotForeignKey: 'campaign_stage_id',
    pivotRelatedForeignKey: 'templates_id',
  })
  declare templates: ManyToMany<typeof Template>
}

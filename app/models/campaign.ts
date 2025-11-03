import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import User from './user.js'
import CampaignStage from './campaign_stage.js'
import Template from './template.js'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Campaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare description?: string

  @column()
  declare status: 'active' | 'paused' | 'completed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => CampaignStage)
  declare campaignStages: HasMany<typeof CampaignStage>

  @manyToMany(() => Template, {
    pivotTable: 'campaign_stage_templates',
    pivotForeignKey: 'campaign_id',
    pivotRelatedForeignKey: 'templates_id',
  })
  declare templates: ManyToMany<typeof Template>
}

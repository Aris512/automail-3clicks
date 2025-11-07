import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import Subscriber from './subscriber.js'
import Template from './template.js'
import Campaign from './campaign.js'
import CampaignStage from './campaign_stage.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Sending extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare contactId: number

  @column()
  declare templateId: number | null

  @column()
  declare campaignId: number | null

  @column()
  declare campaignStageId: number | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column()
  declare sentSubject: string | null

  @column()
  declare sentBody: string | null

  @column()
  declare deliveryStatus: string

  @column()
  declare messageId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Subscriber, {
    foreignKey: 'contactId',
  })
  declare contact: BelongsTo<typeof Subscriber>

  @belongsTo(() => Template)
  declare template: BelongsTo<typeof Template> | null

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign> | null

  @belongsTo(() => CampaignStage)
  declare campaignStage: BelongsTo<typeof CampaignStage> | null
}


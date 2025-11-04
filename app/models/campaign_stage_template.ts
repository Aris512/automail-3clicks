import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import CampaignStage from './campaign_stage.js'
import Template from './template.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignStageTemplate extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare campaignStageId: number

  @column()
  declare templatesId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CampaignStage)
  declare campaignStage: BelongsTo<typeof CampaignStage>

  @belongsTo(() => Template, {
    foreignKey: 'templatesId'
  })
  declare template: BelongsTo<typeof Template>
}

import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Campaign from './campaign.js'
import Template from './template.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignStageTemplate extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare campaignId: number

  @column()
  declare templatesId: number

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => Template, {
    foreignKey: 'templatesId'
  })
  declare template: BelongsTo<typeof Template>
}

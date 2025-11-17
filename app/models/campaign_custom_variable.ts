import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import CustomVariable from './custom_variable.js'
import Campaign from './campaign.js'
import CampaignStage from './campaign_stage.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignCustomVariable extends BaseModel {
  static table = 'campaign_custom_variables'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'custom_var_id' })
  declare customVarId: number

  @column({ columnName: 'campaign_id' })
  declare campaignId: number

  @column({ columnName: 'campaign_stage_id' })
  declare campaignStageId: number | null

  @column()
  declare valor: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CustomVariable, {
    foreignKey: 'customVarId',
  })
  declare customVariable: BelongsTo<typeof CustomVariable>

  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => CampaignStage, {
    foreignKey: 'campaignStageId',
  })
  declare campaignStage: BelongsTo<typeof CampaignStage> | null
}


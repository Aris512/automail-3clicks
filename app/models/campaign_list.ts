import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Campaign from './campaign.js'
import List from './list.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignList extends BaseModel {
  static table = 'campaign_lists'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare campaignId: number

  @column()
  declare listId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => List)
  declare list: BelongsTo<typeof List>
}


import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Campaign from './campaign.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class CustomVariable extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description?: string

  @column()
  declare valor: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relación many-to-many con Campaign a través de CampaignCustomVariable
   */
  @manyToMany(() => Campaign, {
    pivotTable: 'campaign_custom_variables',
    pivotForeignKey: 'custom_var_id',
    pivotRelatedForeignKey: 'campaign_id',
    pivotTimestamps: true,
  })
  declare campaigns: ManyToMany<typeof Campaign>
}


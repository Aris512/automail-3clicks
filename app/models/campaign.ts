import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import User from './user.js'
import CampaignStage from './campaign_stage.js'
import EmailSetup from './email_setup.js'
import List from './list.js'
import CustomVariable from './custom_variable.js'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Campaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare userId: number

  @column()
  declare emailSetupId: number | null

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

  @belongsTo(() => EmailSetup, {
    foreignKey: 'emailSetupId'
  })
  declare emailSetup: BelongsTo<typeof EmailSetup>

  @hasMany(() => CampaignStage)
  declare campaignStages: HasMany<typeof CampaignStage>

  @manyToMany(() => List, {
    pivotTable: 'campaign_lists',
    pivotForeignKey: 'campaign_id',
    pivotRelatedForeignKey: 'list_id',
  })
  declare lists: ManyToMany<typeof List>

  /**
   * Relación many-to-many con CustomVariable a través de CampaignCustomVariable
   */
  @manyToMany(() => CustomVariable, {
    pivotTable: 'campaign_custom_variables',
    pivotForeignKey: 'campaign_id',
    pivotRelatedForeignKey: 'custom_var_id',
    pivotTimestamps: true,
  })
  declare customVariables: ManyToMany<typeof CustomVariable>
}

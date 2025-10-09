import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js' 
import User from './user.js'

export default class TenantUser extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare userId: number

  @column()
  declare role: string

  @column()
  declare active: boolean

  @belongsTo(() => Tenant)
  declare tenant: any

  @belongsTo(() => User)
  declare user: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
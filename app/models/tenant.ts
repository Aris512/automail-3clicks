import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import TenantUser from './tenant_user.js'
import User from './user.js'

export default class Tenant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare active: boolean

  @column()
  declare ownerId: number

  @hasMany(() => TenantUser)
  declare tenantUsers: any

  @belongsTo(() => User, {
    foreignKey: 'ownerId'
  })
  declare owner: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
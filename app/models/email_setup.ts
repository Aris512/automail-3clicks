import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import User from './user.js'
import SmtpConfig from './smtp_config.js'


export default class EmailSetup extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare userId: number

  @column()
  declare email: string

  @column()
  declare name: string | null

  @column()
  declare from: string | null

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime


  // relaciones
  @belongsTo(() => Tenant, {
    foreignKey: 'tenantId'
  })
  declare tenant: any

  @belongsTo(() => User, {
    foreignKey: 'userId'
  })
  declare user: any

  @hasOne(() => SmtpConfig, {
    foreignKey: 'emailSetupId'
  })
  declare smtpConfig: any
}
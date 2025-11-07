import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import EmailSetup from './email_setup.js'

export default class SmtpConfig extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare emailSetupId: number

  @column()
  declare name: string | null

  @column()
  declare user: string

  @column()
  declare password: string

  @column()
  declare host: string

  @column()
  declare port: string

  @column()
  declare protocole: 'insecure' | 'ssl' | 'tls'

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // relaciones
  @belongsTo(() => EmailSetup, {
    foreignKey: 'emailSetupId'
  })
  declare emailSetup: any
}
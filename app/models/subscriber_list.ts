import { DateTime } from 'luxon'
import { BaseModel, column} from '@adonisjs/lucid/orm'

export default class SubscriberList extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare subscriberId: number

  @column()
    declare listID: number

  @column()
    declare source: 'manual' | 'form' | 'import'

  @column()
    declare status: 'active' | 'unsubscribed'

  @column.dateTime()
    declare subscribedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

}
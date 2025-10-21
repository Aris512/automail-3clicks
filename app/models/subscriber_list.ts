import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Subscriber from './subscriber.js'
import List from './list.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SubscriberList extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare subscriberId: number

  @column()
  declare listId: number

  @column()
  declare source: 'manual' | 'import'

  @column()
  declare status: 'active' | 'unsubscribed'

  @column.dateTime()
  declare subscribedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Subscriber)
  declare subscriber: BelongsTo<typeof Subscriber>

  @belongsTo(() => List)
  declare list: BelongsTo<typeof List>
}
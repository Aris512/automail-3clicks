import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import List from './list.js'
import type {BelongsTo, ManyToMany} from '@adonisjs/lucid/types/relations'


export default class Subscriber extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare description?: string

  @column()
  declare status: 'active' | 'inactive' | 'archived' | 'unsubscribed'

  @column.dateTime()
  declare lastSentAt?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime


  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @manyToMany(() => List, {
    pivotTable: 'subscribers_lists',
    pivotForeignKey: 'subscriber_id',
    pivotRelatedForeignKey: 'list_id',
  })
  declare lists: ManyToMany<typeof List>

}
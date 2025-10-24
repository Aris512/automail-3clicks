import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import Subscriber from './subscriber.js'
import type {BelongsTo, ManyToMany} from '@adonisjs/lucid/types/relations'

export default class List extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description?: string

  @column()
  declare status: 'active' | 'inactive' | 'archived'

  @column()
  declare isActivated: boolean

  @column()
  declare createdBy?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime


  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @manyToMany(() => Subscriber, {
    pivotTable: 'subscriber_lists',
  })
  declare subscribers: ManyToMany<typeof Subscriber>
}
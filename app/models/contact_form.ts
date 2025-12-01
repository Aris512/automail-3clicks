import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Tenant from './tenant.js'
import User from './user.js'
import List from './list.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ContactForm extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare uniqueId: string

  @column({
    prepare: (value: Record<string, boolean>) => JSON.stringify(value),
    consume: (value: string | Record<string, boolean>) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare fields: Record<string, boolean>

  @column()
  declare listId: number | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => List)
  declare list: BelongsTo<typeof List> | null

  /**
   * Verificar si el formulario ha expirado
   */
  isExpired(): boolean {
    return DateTime.now() > this.expiresAt
  }

  /**
   * Verificar si el formulario está disponible (activo y no expirado)
   */
  isAvailable(): boolean {
    return this.active && !this.isExpired()
  }
}


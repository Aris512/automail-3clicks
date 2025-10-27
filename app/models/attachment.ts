import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Template from './template.js'

export default class Attachment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare path: string

  @column()
  declare name: string

  @column()
  declare fileName: string

  @column()
  declare size?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relación many-to-many con templates
   */
  @manyToMany(() => Template, {
    pivotTable: 'templates_attachments',
    pivotForeignKey: 'attachment_id',
    pivotRelatedForeignKey: 'template_id',
    pivotTimestamps: true,
  })
  declare templates: any
}
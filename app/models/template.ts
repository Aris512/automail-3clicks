import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Attachment from './attachment.js'
import CustomVariable from './custom_variable.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Template extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: number

  @column()
  declare name: string

  @column()
  declare subject: string

  @column({
    columnName: 'body_markdown',
    serializeAs: 'bodyMarkdown'
  })
  declare bodyMarkdown: string

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relación many-to-many con attachments
   */
  @manyToMany(() => Attachment, {
    pivotTable: 'templates_attachments',
    pivotForeignKey: 'template_id',
    pivotRelatedForeignKey: 'attachment_id',
    pivotTimestamps: true,
  })
  declare attachments: any

  /**
   * Relación many-to-many con CustomVariable a través de TemplateCustomVariable
   */
  @manyToMany(() => CustomVariable, {
    pivotTable: 'template_custom_variables',
    pivotForeignKey: 'template_id',
    pivotRelatedForeignKey: 'custom_var_id',
    pivotTimestamps: true,
  })
  declare customVariables: ManyToMany<typeof CustomVariable>
}
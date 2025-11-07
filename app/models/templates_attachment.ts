import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Template from './template.js'
import Attachment from './attachment.js'

export default class TemplateAttachment extends BaseModel {
  public static table = 'templates_attachments'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'tenant_id' })
  declare tenantId: number

  @column({ columnName: 'attachment_id' })
  declare attachmentId: number

  @column({ columnName: 'template_id' })
  declare templateId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Template, {
    foreignKey: 'templateId'
  })
  declare template: any

  @belongsTo(() => Attachment, {
    foreignKey: 'attachmentId'
  })
  declare attachment: any
}
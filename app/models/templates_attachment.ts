import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Template from './template.js'
import Attachment from './attachment.js'

export default class TemplateAttachment extends BaseModel {
  public static table = 'templates_attachments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare attachmentId: number

  @column()
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
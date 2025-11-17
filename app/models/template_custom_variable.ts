import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import CustomVariable from './custom_variable.js'
import Template from './template.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class TemplateCustomVariable extends BaseModel {
  static table = 'template_custom_variables'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'custom_var_id' })
  declare customVarId: number

  @column({ columnName: 'template_id' })
  declare templateId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CustomVariable, {
    foreignKey: 'customVarId',
  })
  declare customVariable: BelongsTo<typeof CustomVariable>

  @belongsTo(() => Template, {
    foreignKey: 'templateId',
  })
  declare template: BelongsTo<typeof Template>
}


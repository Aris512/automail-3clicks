import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'template_custom_variables'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('custom_var_id').unsigned().notNullable().index()
      table.integer('template_id').unsigned().notNullable().index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table
        .foreign('custom_var_id')
        .references('id')
        .inTable('custom_variables')
        .onDelete('cascade')

      table
        .foreign('template_id')
        .references('id')
        .inTable('templates')
        .onDelete('cascade')

      // Índice único para evitar duplicados: una variable por template
      table.unique(['custom_var_id', 'template_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
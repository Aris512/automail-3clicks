import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_custom_variables'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('custom_var_id').unsigned().notNullable().index()
      table.integer('campaign_id').unsigned().notNullable().index()
      table.integer('campaign_stage_id').unsigned().nullable().index()
      table.text('valor').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table
        .foreign('custom_var_id')
        .references('id')
        .inTable('custom_variables')
        .onDelete('cascade')

      table
        .foreign('campaign_id')
        .references('id')
        .inTable('campaigns')
        .onDelete('cascade')

      table
        .foreign('campaign_stage_id')
        .references('id')
        .inTable('campaign_stages')
        .onDelete('cascade')

      // Índice único para evitar duplicados: una variable por campaign/stage
      table.unique(['custom_var_id', 'campaign_id', 'campaign_stage_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
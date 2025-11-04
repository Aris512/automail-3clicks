import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_stage_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('campaign_id').unsigned().notNullable().index()
      table.integer('templates_id').unsigned().notNullable().index()

      table
        .foreign('campaign_id')
        .references('id')
        .inTable('campaigns')
        .onDelete('cascade')

      table
        .foreign('templates_id')
        .references('id')
        .inTable('templates')
        .onDelete('cascade')

      table.unique(['campaign_id', 'templates_id'])
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

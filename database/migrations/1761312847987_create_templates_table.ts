import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().index()
      table.integer('stage_id').unsigned().notNullable().index()
      table.string('name', 255).notNullable()
      table.string('subject', 500).notNullable()
      table.text('body_markdown').notNullable
      table.jsonb('available_variables').defaultTo('[]')
      table.boolean('active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')



      table
      .foreign('tenant_id')
      .references('id')
      .inTable('tenants')
      .onDelete('cascade')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
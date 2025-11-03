import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_stages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().index()
      table.integer('campaign_id').unsigned().notNullable().index()
      table.integer('stage_number').notNullable()
      table.string('name', 255).notNullable()
      table.timestamp('starts_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table
        .foreign('tenant_id')
        .references('id')
        .inTable('tenants')
        .onDelete('cascade')

      table
        .foreign('campaign_id')
        .references('id')
        .inTable('campaigns')
        .onDelete('cascade')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

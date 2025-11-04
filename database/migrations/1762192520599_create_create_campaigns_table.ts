import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaigns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().index()
      table.integer('user_id').unsigned().notNullable().index()
      table.integer('email_setup_id').unsigned().nullable().index()
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.enum('status', ['active', 'paused', 'completed']).notNullable().defaultTo('active')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table
        .foreign('tenant_id')
        .references('id')
        .inTable('tenants')
        .onDelete('cascade')

      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('cascade')

      table
        .foreign('email_setup_id')
        .references('id')
        .inTable('email_setups')
        .onDelete('set null')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

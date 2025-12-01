import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_forms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      table
        .integer('tenant_id')
        .unsigned()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      
      table.string('name').notNullable()
      table.string('unique_id').notNullable().unique()
      table.json('fields').notNullable()
      table
        .integer('list_id')
        .unsigned()
        .references('id')
        .inTable('lists')
        .onDelete('SET NULL')
        .nullable()
      
      table.timestamp('expires_at').notNullable()
      table.boolean('active').notNullable().defaultTo(true)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
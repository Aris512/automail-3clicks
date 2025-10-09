import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenant_users'

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
      
      table.enum('role', ['owner', 'admin', 'member']).notNullable().defaultTo('member')
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamps(true, true)


      table.unique(['tenant_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
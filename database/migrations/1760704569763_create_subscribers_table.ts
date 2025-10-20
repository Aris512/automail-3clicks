import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscribers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
      .integer('tenant_id')
      .unsigned()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')


      table.string('name').notNullable()
      table.string('email').notNullable()
      table.text('description').nullable()
      table.enum('status', ['active', 'inactive', 'archived']).notNullable().defaultTo('active')
      table.string('company').nullable()
      table.string('current_stage').nullable()
      table.timestamp('last_sent_at').nullable()

      
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['tenant_id', 'email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
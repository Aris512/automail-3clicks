import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lists'

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
      table.string('slug').notNullable()
      table.text('description').nullable()
      table.enum('status', ['active', 'inactive', 'archived']).notNullable().defaultTo('active')
      table.boolean('is_activated').notNullable().defaultTo(false)

      table
      .integer('created_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .nullable()

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())

      table.unique(['tenant_id', 'slug'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
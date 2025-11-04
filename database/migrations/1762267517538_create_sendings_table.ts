import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sendings'

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
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('subscribers')
        .onDelete('CASCADE')

      table
        .integer('template_id')
        .unsigned()
        .references('id')
        .inTable('templates')
        .onDelete('SET NULL')
        .nullable()

      table.timestamp('sent_at').nullable()

      table.string('sent_subject', 500).nullable()

      table.text('sent_body').nullable()

      table.string('delivery_status', 50).defaultTo('pending')

      table.string('message_id', 255).nullable()

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}


import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscribers_lists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')


      table
      .integer('subscriber_id')
      .unsigned()
      .references('id')
      .inTable('subscribers')
      .onDelete('CASCADE')


      table
      .integer('list_id')
      .unsigned()
      .references('id')
      .inTable('lists')
      .onDelete('CASCADE')
      
      table
      .enum('source', ['manual', 'form', 'import']).notNullable().defaultTo('manual')

      table
      .enum('status', ['active', 'unsubscribed']).notNullable().defaultTo('active')

      table.timestamp('subscribed_at').defaultTo(this.now())
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())

      table.unique(['subscriber_id', 'list_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
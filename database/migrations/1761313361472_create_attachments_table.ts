import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attachments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().index()
      table.string('path',1024).notNullable()
      table.string('name',255).notNullable()
      table.string('file_name',255).notNullable()
      table.bigInteger('size').notNullable()
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
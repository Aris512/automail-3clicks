import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'templates_attachments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().index()
      table.integer('attachment_id').unsigned().notNullable().index()
      table.integer('template_id').unsigned().notNullable().index()

      table.timestamp('created_at')
      table.timestamp('updated_at')


      table
      .foreign('tenant_id')
      .references('id')
      .inTable('tenants')
      .onDelete('cascade')


      table
      .foreign('attachment_id')
      .references('id')
      .inTable('attachments')
      .onDelete('cascade')


      table
      .foreign('template_id')
      .references('id')
      .inTable('templates')
      .onDelete('cascade')


      table.unique(['attachment_id', 'template_id'], 'u_templates_attachments')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
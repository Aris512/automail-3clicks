import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixTemplatesAttachments extends BaseCommand {
  static commandName = 'fix:templates-attachments'
  static description = 'Agregar la columna tenant_id a la tabla templates_attachments'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info('🔧 Iniciando ejecución del script de corrección...\n')
      
      // Paso 1: Verificar y agregar la columna tenant_id si no existe
      this.logger.info('📝 Paso 1: Verificando si existe la columna tenant_id...')
      const columnExists = await db.rawQuery(`
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'templates_attachments' 
        AND column_name = 'tenant_id'
      `)
      
      if (columnExists.rows.length === 0) {
        this.logger.info('➕ Agregando columna tenant_id...')
        await db.rawQuery(`
          ALTER TABLE templates_attachments 
          ADD COLUMN tenant_id INTEGER
        `)
        this.logger.success('✅ Columna tenant_id agregada\n')
      } else {
        this.logger.info('ℹ️  La columna tenant_id ya existe\n')
      }
      
      // Paso 2: Actualizar registros existentes con tenant_id
      this.logger.info('📝 Paso 2: Actualizando registros existentes con tenant_id...')
      const updateResult = await db.rawQuery(`
        UPDATE templates_attachments ta
        SET tenant_id = t.tenant_id
        FROM templates t
        WHERE ta.template_id = t.id
          AND ta.tenant_id IS NULL
      `)
      this.logger.success(`✅ ${updateResult.rowCount || 0} registros actualizados\n`)
      
      // Paso 3: Verificar si hay NULLs y hacer la columna NOT NULL
      this.logger.info('📝 Paso 3: Verificando registros con tenant_id NULL...')
      const nullCount = await db.rawQuery(`
        SELECT COUNT(*) as count
        FROM templates_attachments
        WHERE tenant_id IS NULL
      `)
      
      if (parseInt(nullCount.rows[0].count) === 0) {
        this.logger.info('✅ No hay registros con tenant_id NULL, configurando como NOT NULL...')
        await db.rawQuery(`
          ALTER TABLE templates_attachments 
          ALTER COLUMN tenant_id SET NOT NULL
        `)
        this.logger.success('✅ Columna configurada como NOT NULL\n')
      } else {
        this.logger.warning(`⚠️  Hay ${nullCount.rows[0].count} registros con tenant_id NULL. No se puede configurar como NOT NULL.\n`)
      }
      
      // Paso 4: Agregar índice
      this.logger.info('📝 Paso 4: Agregando índice...')
      try {
        await db.rawQuery(`
          CREATE INDEX idx_templates_attachments_tenant_id 
          ON templates_attachments(tenant_id)
        `)
        this.logger.success('✅ Índice agregado\n')
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          this.logger.info('ℹ️  El índice ya existe\n')
        } else {
          throw error
        }
      }
      
      // Paso 5: Agregar foreign key constraint
      this.logger.info('📝 Paso 5: Agregando foreign key constraint...')
      const fkExists = await db.rawQuery(`
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'templates_attachments_tenant_id_foreign'
        AND table_name = 'templates_attachments'
      `)
      
      if (fkExists.rows.length === 0) {
        await db.rawQuery(`
          ALTER TABLE templates_attachments
          ADD CONSTRAINT templates_attachments_tenant_id_foreign
          FOREIGN KEY (tenant_id)
          REFERENCES tenants(id)
          ON DELETE CASCADE
        `)
        this.logger.success('✅ Foreign key constraint agregada\n')
      } else {
        this.logger.info('ℹ️  La foreign key constraint ya existe\n')
      }
      
      // Paso 6: Verificar estructura final
      this.logger.info('📊 Paso 6: Verificando estructura final...\n')
      const columns = await db.rawQuery(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'templates_attachments'
        ORDER BY ordinal_position
      `)
      
      this.logger.info('📋 Estructura de la tabla templates_attachments:')
      console.table(columns.rows)
      
      // Paso 7: Mostrar estadísticas
      this.logger.info('\n📊 Paso 7: Estadísticas de registros:\n')
      const stats = await db.rawQuery(`
        SELECT 
          COUNT(*) as total_registros,
          COUNT(DISTINCT tenant_id) as tenants_unicos,
          COUNT(DISTINCT template_id) as templates_unicos,
          COUNT(DISTINCT attachment_id) as attachments_unicos
        FROM templates_attachments
      `)
      
      console.table(stats.rows)
      
      this.logger.success('\n✅ Script ejecutado exitosamente!')
      
    } catch (error: any) {
      this.logger.error('\n❌ Error ejecutando el script:', error.message)
      this.logger.error(error.stack)
      process.exit(1)
    } finally {
      await db.manager.closeAll()
    }
  }
}


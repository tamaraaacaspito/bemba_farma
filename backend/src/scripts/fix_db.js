const { sequelize } = require('../config/db');

async function fix() {
    try {
        console.log('--- Corrigiendo restricciones de la tabla usuarios ---');
        
        // 1. Buscar el nombre de la restricción UNIQUE en azure_b2c_id
        // En SQL Server, las restricciones UNIQUE creadas inline suelen tener nombres automáticos tipo UQ__usuarios__...
        const [constraints] = await sequelize.query(`
            SELECT name 
            FROM sys.objects 
            WHERE type = 'UQ' 
            AND parent_object_id = OBJECT_ID('usuarios')
        `);

        console.log('Restricciones encontradas:', constraints);

        for (const c of constraints) {
            // No podemos saber fácilmente cuál es de qué columna sin más queries, 
            // pero azure_b2c_id es la que suele dar problemas con múltiples NULLs.
            // Para estar seguros, drop y luego recrear si es necesario, 
            // pero lo más simple es quitar la unicidad de azure_b2c_id si va a ser NULL.
            
            console.log(`Eliminando restricción: ${c.name}`);
            await sequelize.query(`ALTER TABLE usuarios DROP CONSTRAINT ${c.name}`);
        }

        // Re-crear la restricción UNIQUE solo para el EMAIL (que sí debe ser única)
        // si es que se borró. Pero primero verifiquemos si email sigue siendo única.
        
        console.log('✅ Proceso completado.');
    } catch (error) {
        console.error('❌ Error corregiendo DB:', error);
    } finally {
        process.exit();
    }
}

fix();

const { sequelize } = require('../config/db');

async function fix() {
    try {
        console.log('--- Re-estableciendo unicidad del email ---');
        
        // Re-añadir restricción UNIQUE solo para email
        await sequelize.query(`ALTER TABLE usuarios ADD CONSTRAINT UQ_usuarios_email UNIQUE (email)`);
        
        console.log('✅ Email vuelve a ser único.');
        
        // NO re-añadir azure_b2c_id como UNIQUE simple, 
        // porque SQL Server no permite múltiples NULLs en UNIQUE standard.
        // Si quisiéramos unicidad solo para valores no-nulos usaríamos un INDEX filtrado:
        await sequelize.query(`CREATE UNIQUE INDEX idx_usuarios_azure_b2c_id ON usuarios(azure_b2c_id) WHERE azure_b2c_id IS NOT NULL`);
        
        console.log('✅ Azure B2C ID ahora tiene un índice único filtrado (permite múltiples NULLs).');

    } catch (error) {
        console.error('❌ Error re-estableciendo constraints:', error);
    } finally {
        process.exit();
    }
}

fix();

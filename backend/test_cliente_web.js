const { sequelize } = require('./src/config/db');

(async () => {
    try {
        await sequelize.authenticate();
        
        // Eliminar tabla incompleta y recrearla con la estructura correcta
        await sequelize.query('DROP TABLE IF EXISTS [clientes_web]');
        console.log('Tabla anterior eliminada.');

        await sequelize.query(`
            CREATE TABLE [clientes_web] (
                [id]              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [nombre_completo] NVARCHAR(150) NOT NULL,
                [entidad]         NVARCHAR(150) NULL,
                [ruc_dni]         NVARCHAR(20) NULL,
                [email]           NVARCHAR(100) NOT NULL UNIQUE,
                [telefono]        NVARCHAR(20) NULL,
                [password_hash]   NVARCHAR(255) NOT NULL,
                [tipo]            NVARCHAR(20) NOT NULL DEFAULT 'HOSPITAL',
                [activo]          BIT NOT NULL DEFAULT 1,
                [ultimo_acceso]   DATETIMEOFFSET NULL,
                [fecha_registro]  DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
            )
        `);
        console.log('Tabla clientes_web recreada con la estructura correcta.');

        // Test de inserción
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('12345678', 10);
        await sequelize.query(
            `INSERT INTO clientes_web (nombre_completo, entidad, ruc_dni, email, telefono, password_hash, tipo)
             VALUES (N'DOC TEST', N'HOSPITAL TEST', N'12332453', N'djahary@gmail.com', N'123232323', N'${hash}', N'HOSPITAL')`
        );
        const [[{count}]] = await sequelize.query('SELECT COUNT(*) as count FROM clientes_web');
        console.log('INSERT OK. Total registros:', count);
        process.exit(0);
    } catch(e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
})();

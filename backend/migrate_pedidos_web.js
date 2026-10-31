const { sequelize } = require('./src/config/db');

(async () => {
    try {
        await sequelize.authenticate();

        await sequelize.query(
            "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='pedidos_web' AND COLUMN_NAME='cliente_web_id') ALTER TABLE pedidos_web ADD cliente_web_id INT NULL;"
        );
        console.log('cliente_web_id OK');

        await sequelize.query(
            "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='pedidos_web' AND COLUMN_NAME='productos_cotizados') ALTER TABLE pedidos_web ADD productos_cotizados NVARCHAR(MAX) NULL;"
        );
        console.log('productos_cotizados OK');

        console.log('Todas las columnas actualizadas correctamente.');
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
})();

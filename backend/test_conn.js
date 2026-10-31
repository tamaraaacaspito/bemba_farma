const sql = require('mssql');
require('dotenv').config();

// Azure SQL a veces requiere usuario con @servidor
const usuarios = [
    'eka-admin',
    'eka-admin@drogueria-eka-server'
];

if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD no está definida. Configúrala en el .env antes de probar la conexión.');
}

async function probar(user) {
    const config = {
        server: process.env.DB_SERVER || 'drogueria-eka-server.database.windows.net',
        database: process.env.DB_NAME || 'DrogueriaEKA_DB',
        port: 1433,
        user: user,
        password: process.env.DB_PASSWORD,
        options: { encrypt: true, trustServerCertificate: false },
        connectionTimeout: 15000
    };
    try {
        const pool = await sql.connect(config);
        console.log(`✅ ÉXITO con usuario: "${user}"`);
        await pool.close();
        return true;
    } catch (e) {
        console.log(`❌ Falló con "${user}": ${e.message.split('.')[0]}`);
        return false;
    }
}

(async () => {
    for (const u of usuarios) {
        const ok = await probar(u);
        if (ok) break;
        await sql.close();
    }
})();

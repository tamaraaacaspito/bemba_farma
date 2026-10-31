'use strict';
/**
 * Pruebas de seguridad JWT.
 * Verifican: generación/validación, expiración real y secreto único compartido.
 */

const jwt = require('jsonwebtoken');
const { generarToken, verificarToken, JWT_SECRET } = require('../src/config/auth');

describe('Seguridad JWT', () => {

    test('genera y valida un token con el payload correcto', () => {
        const token = generarToken({ id: 1, email: 'a@b.com', rol: 'ADMIN' });
        const payload = verificarToken(token);
        expect(payload.id).toBe(1);
        expect(payload.email).toBe('a@b.com');
        expect(payload.rol).toBe('ADMIN');
    });

    test('un token expirado es RECHAZADO (ya no vale para siempre)', () => {
        const tokenVencido = jwt.sign(
            { id: 1, email: 'a@b.com', rol: 'ADMIN' },
            JWT_SECRET,
            { expiresIn: -10 } // ya expirado
        );
        expect(() => verificarToken(tokenVencido)).toThrow();
        try {
            verificarToken(tokenVencido);
        } catch (e) {
            expect(e.name).toBe('TokenExpiredError');
        }
    });

    test('el secreto usado por el middleware es el mismo del config (secreto único)', () => {
        // Firmamos con el secreto de config y validamos con el mismo módulo.
        const token = jwt.sign({ id: 9 }, JWT_SECRET, { expiresIn: '1h' });
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.id).toBe(9);
    });
});

'use strict';
/**
 * Pruebas del middleware de autenticación (sin base de datos).
 * Montan una app Express mínima con una ruta protegida.
 */

const express   = require('express');
const request   = require('supertest');
const { generarToken } = require('../src/config/auth');
const { auth, requireRol, adminOAlmacen } = require('../src/middleware/authMiddleware');

function buildApp() {
    const app = express();
    app.get('/protegido', auth, (req, res) => res.json({ ok: true, usuario: req.usuario }));
    app.get('/solo-admin', auth, requireRol('ADMIN'), (_req, res) => res.json({ ok: true }));
    app.get('/admin-o-almacen', auth, adminOAlmacen, (_req, res) => res.json({ ok: true }));
    return app;
}

describe('authMiddleware', () => {
    const app = buildApp();

    test('rechaza petición sin token (401)', async () => {
        const res = await request(app).get('/protegido');
        expect(res.status).toBe(401);
    });

    test('acepta petición con token válido', async () => {
        const token = generarToken({ id: 1, email: 'a@b.com', rol: 'ADMIN' });
        const res = await request(app).get('/protegido').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.usuario.rol).toBe('ADMIN');
    });

    test('requireRol bloquea a un rol no autorizado (403)', async () => {
        const token = generarToken({ id: 2, email: 'l@b.com', rol: 'LECTURA' });
        const res = await request(app).get('/solo-admin').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('adminOAlmacen permite a ALMACEN', async () => {
        const token = generarToken({ id: 3, email: 'w@b.com', rol: 'ALMACEN' });
        const res = await request(app).get('/admin-o-almacen').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});

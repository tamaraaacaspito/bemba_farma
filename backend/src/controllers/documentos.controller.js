'use strict';
// src/controllers/documentos.controller.js — Stub (completo en Sprint 3 – Documentos)
const stub = (nombre) => async (_req, res) => res.status(501).json({ mensaje: `[STUB] ${nombre}` });
module.exports = {
    listar : stub('documentos.listar'),
    obtener: stub('documentos.obtener'),
    subir  : stub('documentos.subir'),
    eliminar: stub('documentos.eliminar')
};

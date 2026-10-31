'use strict';

const express = require('express');
const router = express.Router();
const { 
    kardexResumen, inventarioDetalle, 
    exportarKardexExcel, exportarKardexPdf, 
    exportarInventarioExcel, exportarInventarioPdf,
    stockValorizado, reporteCaducidad
} = require('../controllers/reportesController');
const { auth, requireRol } = require('../middleware/authMiddleware');

router.use(auth);

// Nuevos Endpoints de Reportes
router.get('/stock-valorizado', requireRol('ADMIN', 'ALMACEN'), stockValorizado);
router.get('/caducidad', requireRol('ADMIN', 'ALMACEN'), reporteCaducidad);

// Endpoints JSON
router.get('/kardex', requireRol('ADMIN', 'ALMACEN'), kardexResumen);
router.get('/inventario', requireRol('ADMIN', 'ALMACEN'), inventarioDetalle);

// Endpoints Exportación Kardex
router.get('/kardex/excel', requireRol('ADMIN', 'ALMACEN'), exportarKardexExcel);
router.get('/kardex/pdf', requireRol('ADMIN', 'ALMACEN'), exportarKardexPdf);

// Endpoints Exportación Inventario
router.get('/inventario/excel', requireRol('ADMIN', 'ALMACEN'), exportarInventarioExcel);
router.get('/inventario/pdf', requireRol('ADMIN', 'ALMACEN'), exportarInventarioPdf);

module.exports = router;

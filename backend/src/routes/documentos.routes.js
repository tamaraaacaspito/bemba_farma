'use strict';
/**
 * src/routes/documentos.routes.js
 * Gestión de documentos (facturas, guías de remisión, órdenes de compra en PDF).
 * Los archivos se almacenan en Azure Blob Storage (prod) o carpeta /uploads (dev).
 *
 *  GET    /api/documentos         → listar documentos con filtros
 *  GET    /api/documentos/:id     → metadatos de un documento
 *  POST   /api/documentos/upload  → subir archivo (multipart/form-data)
 *  DELETE /api/documentos/:id     → eliminar documento (solo ADMIN)
 */

const express                        = require('express');
const router                         = express.Router();
const multer                         = require('multer');
const path                           = require('path');
const { autenticar, soloAdmin, adminOAlmacen } = require('../middleware/authMiddleware');
const documentosController           = require('../controllers/documentos.controller');

// ── Configuración de multer para almacenamiento local (dev) ─────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        // Nombre único: timestamp + nombre original saneado
        const nombreSeguro = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${nombreSeguro}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // máximo 10 MB
    fileFilter: (_req, file, cb) => {
        const permitidos = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (permitidos.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF, imágenes o Excel'));
        }
    }
});

router.get('/',    autenticar, documentosController.listar);
router.get('/:id', autenticar, documentosController.obtener);
router.post('/upload', autenticar, adminOAlmacen, upload.single('archivo'), documentosController.subir);
router.delete('/:id', autenticar, soloAdmin, documentosController.eliminar);

module.exports = router;

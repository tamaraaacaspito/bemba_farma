-- ============================================================
-- DROGUERÍA EKA S.A.C. — Base de Datos Principal (v2)
-- SQL Server 2022 / Azure SQL Database
-- Proyecto: Sistema de Gestión de Inventarios (Tesis SENATI 2026)
-- Autores: Deniss Figueroa · Tamara Solano
-- ============================================================
-- CÓMO EJECUTAR:
--   1. Abrir SSMS → conectar a tcp:localhost,1433 con Windows Auth
--   2. Archivo → Abrir → este init.sql
--   3. F5 para ejecutar TODO
--   4. Luego ejecutar: node seed_admin.js
-- ============================================================

USE master;
GO

IF DB_ID('DrogueriaEKA_DB') IS NOT NULL
BEGIN
    ALTER DATABASE DrogueriaEKA_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE DrogueriaEKA_DB;
    PRINT 'Base de datos preexistente eliminada.';
END
GO

CREATE DATABASE DrogueriaEKA_DB
    COLLATE Latin1_General_CI_AS;
GO

USE DrogueriaEKA_DB;
GO

PRINT 'Base de datos DrogueriaEKA_DB creada.';
GO

-- ============================================================
-- SECCIÓN 1: SEGURIDAD — Roles y Usuarios
-- ============================================================

CREATE TABLE roles (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);
GO

CREATE TABLE usuarios (
    id            INT IDENTITY PRIMARY KEY,
    -- NULL en desarrollo local; requerido en producción con Azure AD B2C
    azure_b2c_id  VARCHAR(100) UNIQUE NULL,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    -- password_hash: bcryptjs (saltRounds=10). NULL cuando se usa Azure B2C en producción
    password_hash VARCHAR(255) NULL,
    rol_id        INT NOT NULL,
    estado        BIT NOT NULL DEFAULT 1,
    created_at    DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
);
GO

CREATE INDEX idx_usuarios_email ON usuarios(email);
GO

-- ============================================================
-- SECCIÓN 2: CATÁLOGOS NORMALIZADOS
-- ============================================================

CREATE TABLE categorias (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);
GO

-- Tipos de movimiento de Kardex: ENTRADA | SALIDA | AJUSTE
CREATE TABLE tipos_movimiento (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL
);
GO

CREATE TABLE estados_orden (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

CREATE TABLE estados_factura (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

CREATE TABLE estados_guia (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

CREATE TABLE estados_lote (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

CREATE TABLE tipos_alerta (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);
GO

-- ============================================================
-- SECCIÓN 3: ENTIDADES PRINCIPALES
-- ============================================================

CREATE TABLE productos (
    id              INT IDENTITY PRIMARY KEY,
    codigo          VARCHAR(50)   UNIQUE NOT NULL,
    nombre          VARCHAR(200)  NOT NULL,
    categoria_id    INT           NOT NULL,
    unidad_medida   VARCHAR(20)   NULL,
    stock_actual    DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo    DECIMAL(10,2) NULL,
    -- precio_unitario: PRECIO DE REFERENCIA (no operativo).
    -- El Ingeniero de Ventas lo define aquí como sugerencia.
    -- El precio real de cada transacción se registra en
    -- detalle_facturas.precio_unitario y detalle_guias.precio_unitario.
    precio_unitario DECIMAL(10,2) NULL,
    estado          BIT           NOT NULL DEFAULT 1,

    CONSTRAINT chk_stock_no_negativo
        CHECK (stock_actual >= 0),
    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
GO

CREATE UNIQUE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_stock ON productos(stock_actual);
GO

CREATE TABLE proveedores (
    id           INT IDENTITY PRIMARY KEY,
    ruc          VARCHAR(11)  UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion    VARCHAR(255) NULL,
    telefono     VARCHAR(20)  NULL,
    email        VARCHAR(100) NULL
);
GO

CREATE TABLE clientes (
    id           INT IDENTITY PRIMARY KEY,
    ruc          VARCHAR(11)  UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion    VARCHAR(255) NULL,
    telefono     VARCHAR(20)  NULL,
    email        VARCHAR(100) NULL
);
GO

-- ============================================================
-- SECCIÓN 4: PRODUCCIÓN — Lotes
-- (va ANTES de kardex porque kardex tiene FK a lotes)
-- ============================================================

CREATE TABLE lotes_produccion (
    id                 INT IDENTITY PRIMARY KEY,
    producto_id        INT           NOT NULL,
    numero_lote        VARCHAR(50)   UNIQUE NULL,
    cantidad_producida DECIMAL(10,2) NOT NULL,
    fecha_produccion   DATETIME2     NULL,
    -- R3/R8: Fecha de vencimiento del lote — usada por el Cron Job (8 AM)
    -- para generar alertas automáticas cuando quedan < 90 días.
    -- También alimenta el Tab de Caducidad en Reportes.
    fecha_vencimiento  DATE          NULL,
    estado_id          INT           NOT NULL,
    registrado_por     INT           NOT NULL,

    CONSTRAINT fk_lote_producto FOREIGN KEY (producto_id)    REFERENCES productos(id),
    CONSTRAINT fk_lote_estado   FOREIGN KEY (estado_id)      REFERENCES estados_lote(id),
    CONSTRAINT fk_lote_usuario  FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);
GO

-- ============================================================
-- SECCIÓN 5: KARDEX — Control Central de Inventario
-- REGLAS DE NEGOCIO:
--   R1: SALIDA solo si cantidad <= stock_actual (validado en backend)
--   R2: Siempre grabar stock_anterior y stock_nuevo (trazabilidad total)
--   R3: stock_nuevo <= stock_minimo → crear alerta automática
-- Trazabilidad extendida: referencia al documento origen del movimiento
-- ============================================================

CREATE TABLE movimientos_kardex (
    id                 INT IDENTITY PRIMARY KEY,
    producto_id        INT             NOT NULL,
    usuario_id         INT             NOT NULL,
    tipo_movimiento_id INT             NOT NULL,
    cantidad           DECIMAL(10,2)   NOT NULL,
    stock_anterior     DECIMAL(10,2)   NOT NULL,
    stock_nuevo        DECIMAL(10,2)   NOT NULL,

    -- Trazabilidad: qué documento originó el movimiento
    referencia_tipo    VARCHAR(50)     NULL,  -- 'FACTURA' | 'GUIA' | 'PRODUCCION' | 'ORDEN'
    referencia_id      INT             NULL,  -- ID del documento de origen
    -- R7 Trazabilidad Médica: Todo movimiento de Kardex DEBE tener un lote asignado
    lote_id            INT             NOT NULL,  -- FK a lotes_produccion

    motivo             VARCHAR(255)    NULL,
    fecha_movimiento   DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_kardex_producto FOREIGN KEY (producto_id)        REFERENCES productos(id),
    CONSTRAINT fk_kardex_usuario  FOREIGN KEY (usuario_id)         REFERENCES usuarios(id),
    CONSTRAINT fk_kardex_tipo     FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
    CONSTRAINT fk_kardex_lote     FOREIGN KEY (lote_id)            REFERENCES lotes_produccion(id),
    CONSTRAINT chk_kardex_cantidad CHECK (cantidad > 0)
);
GO

CREATE INDEX idx_kardex_producto_fecha
    ON movimientos_kardex(producto_id, fecha_movimiento);
GO

-- ============================================================
-- SECCIÓN 6: COMPRAS — Órdenes a Proveedores
-- ============================================================

CREATE TABLE ordenes_compra (
    id            INT IDENTITY PRIMARY KEY,
    proveedor_id  INT           NOT NULL,
    usuario_id    INT           NOT NULL,
    numero_orden  VARCHAR(50)   UNIQUE NULL,
    estado_id     INT           NOT NULL,
    fecha_emision DATETIME2     NOT NULL DEFAULT GETDATE(),
    total         DECIMAL(12,2) NULL,

    CONSTRAINT fk_orden_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT fk_orden_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
    CONSTRAINT fk_orden_estado    FOREIGN KEY (estado_id)    REFERENCES estados_orden(id)
);
GO

CREATE INDEX idx_ordenes_proveedor ON ordenes_compra(proveedor_id);
GO

CREATE TABLE detalle_ordenes (
    id              INT IDENTITY PRIMARY KEY,
    orden_compra_id INT           NOT NULL,
    producto_id     INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalle_orden    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)     REFERENCES productos(id)
);
GO

-- ============================================================
-- SECCIÓN 7: VENTAS — Facturas
-- ============================================================

CREATE TABLE facturas (
    id             INT IDENTITY PRIMARY KEY,
    cliente_id     INT           NOT NULL,
    usuario_id     INT           NOT NULL,
    numero_factura VARCHAR(50)   UNIQUE NULL,
    fecha_emision  DATETIME2     NULL,
    total          DECIMAL(12,2) NULL,
    estado_id      INT           NOT NULL,

    CONSTRAINT fk_factura_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_factura_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_factura_estado  FOREIGN KEY (estado_id)  REFERENCES estados_factura(id)
);
GO

CREATE TABLE detalle_facturas (
    id              INT IDENTITY PRIMARY KEY,
    factura_id      INT           NOT NULL,
    producto_id     INT           NOT NULL,
    -- R7 Trazabilidad Médica: lote_id obligatorio en cada línea de factura
    lote_id         INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    -- Precio real de la transacción (ingresado manualmente, puede diferir del precio_referencia del producto)
    precio_unitario DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_det_factura         FOREIGN KEY (factura_id)  REFERENCES facturas(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_det_factura_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_det_factura_lote     FOREIGN KEY (lote_id)     REFERENCES lotes_produccion(id)
);
GO

-- ============================================================
-- SECCIÓN 8: GUÍAS DE REMISIÓN
-- ============================================================

CREATE TABLE guias_remision (
    id            INT IDENTITY PRIMARY KEY,
    cliente_id    INT          NOT NULL,
    usuario_id    INT          NOT NULL,
    numero_guia   VARCHAR(50)  NULL,
    fecha_emision DATETIME2    NULL,
    estado_id     INT          NOT NULL,
    factura_id    INT          NULL,
    -- R5: Discriminador de tipo de guía
    -- DESPACHO    → entrega normal de mercadería
    -- REPOSICION  → corrección por unidades faltantes (sin nueva factura)
    tipo_guia     VARCHAR(20)  NOT NULL DEFAULT 'DESPACHO',

    CONSTRAINT chk_guia_tipo    CHECK (tipo_guia IN ('DESPACHO', 'REPOSICION')),
    CONSTRAINT fk_guia_cliente  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_guia_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_guia_estado   FOREIGN KEY (estado_id)  REFERENCES estados_guia(id),
    CONSTRAINT fk_guia_factura  FOREIGN KEY (factura_id) REFERENCES facturas(id)
);
GO

CREATE TABLE detalle_guias (
    id              INT IDENTITY PRIMARY KEY,
    guia_id         INT           NOT NULL,
    producto_id     INT           NOT NULL,
    -- R7 Trazabilidad Médica: lote_id obligatorio en cada línea de guía
    -- R3 Multi-Lote: una guía puede tener N filas con distintos lote_id
    lote_id         INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    -- Precio real de la transacción (ingresado manualmente)
    precio_unitario DECIMAL(10,2) NULL,

    CONSTRAINT fk_det_guia         FOREIGN KEY (guia_id)     REFERENCES guias_remision(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_det_guia_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_det_guia_lote     FOREIGN KEY (lote_id)     REFERENCES lotes_produccion(id)
);
GO

-- ============================================================
-- SECCIÓN 9: DOCUMENTOS (Azure Blob Storage / uploads local)
-- ============================================================

CREATE TABLE documentos (
    id         INT IDENTITY PRIMARY KEY,
    -- 'FACTURA' | 'GUIA_REMISION' | 'ORDEN_COMPRA' | 'OTRO'
    tipo_doc   VARCHAR(50)   NOT NULL,
    numero_doc VARCHAR(50)   NULL,
    fecha      DATETIME2     NOT NULL DEFAULT GETDATE(),
    cliente_id INT           NULL,
    blob_url   VARCHAR(500)  NULL,
    estado     VARCHAR(30)   NOT NULL DEFAULT 'ACTIVO',
    usuario_id INT           NOT NULL,

    CONSTRAINT fk_documento_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_documento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
GO

-- ============================================================
-- SECCIÓN 9.5: PEDIDOS WEB (PORTAL B2B / COMERCIALES)
-- Regla R-OFFLINE: Las solicitudes comerciales caen aquí como borrador
-- y NO afectan al Kardex hasta que son despachadas oficialmente.
-- ============================================================

CREATE TABLE pedidos_web (
    id                    INT IDENTITY PRIMARY KEY,
    nombre_completo       VARCHAR(200)  NOT NULL,
    entidad               VARCHAR(200)  NULL,
    email                 VARCHAR(100)  NOT NULL,
    telefono              VARCHAR(50)   NULL,
    mensaje_requerimiento VARCHAR(1000) NOT NULL,
    estado                VARCHAR(50)   NOT NULL DEFAULT 'NUEVO',
    fecha_recepcion       DATETIME2     NOT NULL DEFAULT GETDATE(),
    cliente_web_id        INT           NULL,
    productos_cotizados   NVARCHAR(MAX) NULL
);
GO

-- ============================================================
-- SECCIÓN 10: ALERTAS
-- Generadas automáticamente cuando stock_nuevo <= stock_minimo
-- ============================================================

CREATE TABLE alertas (
    id             INT IDENTITY PRIMARY KEY,
    tipo_id        INT          NOT NULL,
    mensaje        VARCHAR(500) NULL,
    producto_id    INT          NULL,
    usuario_id     INT          NULL,
    leida          BIT          NOT NULL DEFAULT 0,
    fecha_creacion DATETIME2    NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_alerta_tipo     FOREIGN KEY (tipo_id)     REFERENCES tipos_alerta(id),
    CONSTRAINT fk_alerta_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_alerta_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
);
GO

CREATE INDEX idx_alertas_no_leidas ON alertas(leida) WHERE leida = 0;
GO

-- ============================================================
-- SECCIÓN 11: DATOS INICIALES (SEED)
-- ============================================================

PRINT 'Insertando datos iniciales...';
GO

INSERT INTO roles (nombre) VALUES ('ADMIN'), ('ALMACEN'), ('LECTURA');
GO

INSERT INTO categorias (nombre) VALUES
    ('Equipos de Infusión'),
    ('Sondas'),
    ('Oxigenoterapia'),
    ('Dispositivos Vesicales'),
    ('Otros Insumos');
GO

-- Tipos base
INSERT INTO tipos_movimiento (nombre) VALUES ('ENTRADA'), ('SALIDA'), ('AJUSTE');
-- R5-A: Reposición → salida por unidades faltantes reportadas por el cliente (sin nueva factura)
INSERT INTO tipos_movimiento (nombre) VALUES ('REPOSICION');
-- R5-B: Canje → entrada del producto defectuoso + salida del lote de reemplazo
INSERT INTO tipos_movimiento (nombre) VALUES ('CANJE_ENTRADA'), ('CANJE_SALIDA');
GO

INSERT INTO estados_orden (nombre) VALUES
    ('PENDIENTE'), ('APROBADA'), ('RECIBIDA'), ('CANCELADA');
GO

INSERT INTO estados_factura (nombre) VALUES
    ('BORRADOR'), ('EMITIDA'), ('PAGADA'), ('ANULADA');
GO

INSERT INTO estados_guia (nombre) VALUES
    ('PENDIENTE'), ('EN_TRANSITO'), ('ENTREGADA'), ('ANULADA');
GO

INSERT INTO estados_lote (nombre) VALUES
    ('EN_PROCESO'), ('COMPLETADO'), ('RECHAZADO');
GO

INSERT INTO tipos_alerta (nombre) VALUES
    ('STOCK_MINIMO'), ('STOCK_CRITICO'), ('VENCIMIENTO_PROXIMO'), ('ANOMALIA_DETECTADA');
GO

-- ============================================================
-- USUARIO ADMINISTRADOR INICIAL
-- Contraseña: Admin123!
-- Ejecutar seed_admin.js después para actualizar el hash bcrypt correcto
-- ============================================================
INSERT INTO usuarios (azure_b2c_id, nombre, email, password_hash, rol_id, estado)
VALUES (
    NULL,
    'Admin EKA',
    'admin@drogueria-eka.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p4cWPp4JvCV59/G7es/mXS',
    1, 1
);
GO

-- ============================================================
-- PRODUCTOS REALES DE DROGUERÍA EKA S.A.C.
-- ============================================================
DECLARE @inf INT = (SELECT id FROM categorias WHERE nombre = 'Equipos de Infusión');
DECLARE @son INT = (SELECT id FROM categorias WHERE nombre = 'Sondas');
DECLARE @oxi INT = (SELECT id FROM categorias WHERE nombre = 'Oxigenoterapia');
DECLARE @ves INT = (SELECT id FROM categorias WHERE nombre = 'Dispositivos Vesicales');
DECLARE @ins INT = (SELECT id FROM categorias WHERE nombre = 'Otros Insumos');

INSERT INTO productos (codigo, nombre, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_unitario)
VALUES
    ('EKA-INF-001', 'Equipo de venoclisis con buretrol 150ml',         @inf, 'UNIDAD', 120, 30,  3.50),
    ('EKA-INF-002', 'Equipo de venoclisis macro gotero adulto',         @inf, 'UNIDAD', 250, 50,  1.80),
    ('EKA-SON-001', 'Sonda nasogástrica N°16 FR silicona',              @son, 'UNIDAD',  85, 20,  2.10),
    ('EKA-SON-002', 'Sonda nasogástrica N°18 FR silicona',              @son, 'UNIDAD',  75, 20,  2.10),
    ('EKA-SON-003', 'Sonda de alimentación enteral pediátrica N°8 FR', @son, 'UNIDAD',  40, 10,  3.20),
    ('EKA-OXI-001', 'Cánula binasal adulto para oxígeno',              @oxi, 'UNIDAD', 300, 60,  0.90),
    ('EKA-OXI-002', 'Máscara de oxígeno con reservorio adulto',        @oxi, 'UNIDAD', 150, 30,  4.50),
    ('EKA-VES-001', 'Catéter de Foley 2 vías N°14 CH látex',           @ves, 'UNIDAD',  60, 15,  3.80),
    ('EKA-VES-002', 'Catéter de Foley 2 vías N°16 CH látex',           @ves, 'UNIDAD',  55, 15,  3.80),
    ('EKA-INS-001', 'Guante de examen de nitrilo talla M (caja x100)', @ins, 'CAJA',    40, 10, 28.00);
GO

-- ============================================================
-- CLIENTES HOSPITALARIOS INICIALES
-- ============================================================
INSERT INTO clientes (ruc, razon_social, direccion, telefono, email)
VALUES
    ('20521569898', 'Hospital Nacional Arzobispo Loayza',
        'Av. Alfonso Ugarte 848, Breña, Lima',           '(01) 613-6565', 'logistica@hnloayza.gob.pe'),
    ('20521589645', 'Hospital Nacional Cayetano Heredia',
        'Av. Honorio Delgado 262, San Martín de Porres', '(01) 319-1800', 'abastecimiento@hnch.gob.pe'),
    ('20396802956', 'Hospital Regional de Ica',
        'Av. Cutervo S/N, Parcona, Ica',                 '(056) 234-798', 'logistica@hospitalica.gob.pe');
GO

-- ============================================================
-- VERIFICACIÓN: conteo de registros por tabla
-- ============================================================
SELECT 'roles'            AS tabla, COUNT(*) AS registros FROM roles            UNION ALL
SELECT 'categorias',       COUNT(*) FROM categorias                              UNION ALL
SELECT 'tipos_movimiento', COUNT(*) FROM tipos_movimiento                        UNION ALL
SELECT 'usuarios',         COUNT(*) FROM usuarios                                UNION ALL
SELECT 'productos',        COUNT(*) FROM productos                               UNION ALL
SELECT 'clientes',         COUNT(*) FROM clientes;
GO

PRINT '';
PRINT 'DrogueriaEKA_DB creada y poblada correctamente.';
PRINT 'Ejecuta: node seed_admin.js  para confirmar el hash bcrypt del admin.';
GO

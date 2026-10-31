-- ============================================================
-- DROGUERÍA EKA S.A.C. — Estructura de Base de Datos (Limpia)
-- Optimizado para: Azure SQL Database
-- ============================================================

-- SECCIÓN 1: SEGURIDAD
CREATE TABLE roles (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE usuarios (
    id            INT IDENTITY PRIMARY KEY,
    azure_b2c_id  VARCHAR(100) UNIQUE NULL,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    rol_id        INT NOT NULL,
    estado        BIT NOT NULL DEFAULT 1,
    created_at    DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- SECCIÓN 2: CATÁLOGOS
CREATE TABLE categorias (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE tipos_movimiento (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE estados_orden (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE estados_factura (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE estados_guia (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE estados_lote (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE tipos_alerta (
    id     INT IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- SECCIÓN 3: ENTIDADES
CREATE TABLE productos (
    id              INT IDENTITY PRIMARY KEY,
    codigo          VARCHAR(50)   UNIQUE NOT NULL,
    nombre          VARCHAR(200)  NOT NULL,
    categoria_id    INT           NOT NULL,
    unidad_medida   VARCHAR(20)   NULL,
    stock_actual    DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo    DECIMAL(10,2) NULL,
    -- PRECIO DE REFERENCIA: ingresado manualmente por Ingeniero de Ventas.
    -- El precio real por transacción va en detalle_facturas / detalle_guias.
    precio_unitario DECIMAL(10,2) NULL,
    estado          BIT           NOT NULL DEFAULT 1,
    CONSTRAINT chk_stock_no_negativo CHECK (stock_actual >= 0),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
CREATE UNIQUE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_stock ON productos(stock_actual);

CREATE TABLE proveedores (
    id           INT IDENTITY PRIMARY KEY,
    ruc          VARCHAR(11)  UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion    VARCHAR(255) NULL,
    telefono     VARCHAR(20)  NULL,
    email        VARCHAR(100) NULL
);

CREATE TABLE clientes (
    id           INT IDENTITY PRIMARY KEY,
    ruc          VARCHAR(11)  UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion    VARCHAR(255) NULL,
    telefono     VARCHAR(20)  NULL,
    email        VARCHAR(100) NULL
);

CREATE TABLE lotes_produccion (
    id                 INT IDENTITY PRIMARY KEY,
    producto_id        INT           NOT NULL,
    numero_lote        VARCHAR(50)   UNIQUE NULL,
    cantidad_producida DECIMAL(10,2) NOT NULL,
    fecha_produccion   DATETIME2     NULL,
    -- R3/R8: Alertas automáticas cuando < 90 días para vencer
    fecha_vencimiento  DATE          NULL,
    estado_id          INT           NOT NULL,
    registrado_por     INT           NOT NULL,
    CONSTRAINT fk_lote_producto FOREIGN KEY (producto_id)    REFERENCES productos(id),
    CONSTRAINT fk_lote_estado   FOREIGN KEY (estado_id)      REFERENCES estados_lote(id),
    CONSTRAINT fk_lote_usuario  FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

CREATE TABLE movimientos_kardex (
    id                 INT IDENTITY PRIMARY KEY,
    producto_id        INT             NOT NULL,
    usuario_id         INT             NOT NULL,
    tipo_movimiento_id INT             NOT NULL,
    cantidad           DECIMAL(10,2)   NOT NULL,
    stock_anterior     DECIMAL(10,2)   NOT NULL,
    stock_nuevo        DECIMAL(10,2)   NOT NULL,
    referencia_tipo    VARCHAR(50)     NULL,
    referencia_id      INT             NULL,
    lote_id            INT             NULL,
    motivo             VARCHAR(255)    NULL,
    fecha_movimiento   DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_kardex_producto FOREIGN KEY (producto_id)        REFERENCES productos(id),
    CONSTRAINT fk_kardex_usuario  FOREIGN KEY (usuario_id)         REFERENCES usuarios(id),
    CONSTRAINT fk_kardex_tipo     FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
    CONSTRAINT fk_kardex_lote     FOREIGN KEY (lote_id)            REFERENCES lotes_produccion(id),
    CONSTRAINT chk_kardex_cantidad CHECK (cantidad > 0)
);
CREATE INDEX idx_kardex_producto_fecha ON movimientos_kardex(producto_id, fecha_movimiento);

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

CREATE TABLE detalle_ordenes (
    id              INT IDENTITY PRIMARY KEY,
    orden_compra_id INT           NOT NULL,
    producto_id     INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_orden    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)     REFERENCES productos(id)
);

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

CREATE TABLE detalle_facturas (
    id              INT IDENTITY PRIMARY KEY,
    factura_id      INT           NOT NULL,
    producto_id     INT           NOT NULL,
    -- R7 Trazabilidad Médica: lote_id obligatorio en cada línea
    lote_id         INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    -- Precio real de la transacción (manual, puede diferir del precio de referencia)
    precio_unitario DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_det_factura         FOREIGN KEY (factura_id)  REFERENCES facturas(id) ON DELETE CASCADE,
    CONSTRAINT fk_det_factura_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_det_factura_lote     FOREIGN KEY (lote_id)     REFERENCES lotes_produccion(id)
);

CREATE TABLE guias_remision (
    id            INT IDENTITY PRIMARY KEY,
    cliente_id    INT          NOT NULL,
    usuario_id    INT          NOT NULL,
    numero_guia   VARCHAR(50)  NULL,
    fecha_emision DATETIME2    NULL,
    estado_id     INT          NOT NULL,
    factura_id    INT          NULL,
    -- R5: DESPACHO = entrega normal | REPOSICION = corrección de faltantes (sin nueva factura)
    tipo_guia     VARCHAR(20)  NOT NULL DEFAULT 'DESPACHO',
    CONSTRAINT chk_guia_tipo    CHECK (tipo_guia IN ('DESPACHO', 'REPOSICION')),
    CONSTRAINT fk_guia_cliente  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_guia_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_guia_estado   FOREIGN KEY (estado_id)  REFERENCES estados_guia(id),
    CONSTRAINT fk_guia_factura  FOREIGN KEY (factura_id) REFERENCES facturas(id)
);

CREATE TABLE detalle_guias (
    id              INT IDENTITY PRIMARY KEY,
    guia_id         INT           NOT NULL,
    producto_id     INT           NOT NULL,
    -- R7 Trazabilidad Médica | R3 Multi-Lote: cada fila es un lote distinto
    lote_id         INT           NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL,
    -- Precio real de la transacción (ingresado manualmente)
    precio_unitario DECIMAL(10,2) NULL,
    CONSTRAINT fk_det_guia         FOREIGN KEY (guia_id)     REFERENCES guias_remision(id) ON DELETE CASCADE,
    CONSTRAINT fk_det_guia_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_det_guia_lote     FOREIGN KEY (lote_id)     REFERENCES lotes_produccion(id)
);

CREATE TABLE documentos (
    id         INT IDENTITY PRIMARY KEY,
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
CREATE INDEX idx_alertas_no_leidas ON alertas(leida) WHERE leida = 0;

-- SECCIÓN 4: DATOS SEMILLA (Solo catálogos)
INSERT INTO roles (nombre) VALUES ('ADMIN'), ('ALMACEN'), ('LECTURA');
INSERT INTO categorias (nombre) VALUES ('Equipos de Infusión'), ('Sondas'), ('Oxigenoterapia'), ('Dispositivos Vesicales'), ('Otros Insumos');
-- Tipos base
INSERT INTO tipos_movimiento (nombre) VALUES ('ENTRADA'), ('SALIDA'), ('AJUSTE');
-- R5-A: Reposición de unidades faltantes (sin nueva factura)
INSERT INTO tipos_movimiento (nombre) VALUES ('REPOSICION');
-- R5-B: Canje por producto defectuoso (entrada del defectuoso + salida del reemplazo)
INSERT INTO tipos_movimiento (nombre) VALUES ('CANJE_ENTRADA'), ('CANJE_SALIDA');
INSERT INTO estados_orden (nombre) VALUES ('PENDIENTE'), ('APROBADA'), ('RECIBIDA'), ('CANCELADA');
INSERT INTO estados_factura (nombre) VALUES ('BORRADOR'), ('EMITIDA'), ('PAGADA'), ('ANULADA');
INSERT INTO estados_guia (nombre) VALUES ('PENDIENTE'), ('EN_TRANSITO'), ('ENTREGADA'), ('ANULADA');
INSERT INTO estados_lote (nombre) VALUES ('EN_PROCESO'), ('COMPLETADO'), ('RECHAZADO');
INSERT INTO tipos_alerta (nombre) VALUES ('STOCK_MINIMO'), ('STOCK_CRITICO'), ('VENCIMIENTO_PROXIMO'), ('ANOMALIA_DETECTADA');

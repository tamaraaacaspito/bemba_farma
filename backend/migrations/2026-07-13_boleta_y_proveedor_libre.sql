/* ============================================================================
   Migración: soporte de BOLETA (facturas.tipo_documento)
              + proveedor por texto libre (ordenes_compra.proveedor_nombre)
   Motor: Microsoft SQL Server (T-SQL) — ejecutar en SSMS / Azure Data Studio.

   IMPORTANTE: estas columnas pertenecen a las tablas OPERATIVAS de la app
   (facturas y ordenes_compra, en plural — las de init.sql / Sequelize),
   NO al script de datos de demostración (producto/lote/categoria singular).

   Es IDEMPOTENTE y SEGURO:
     - solo modifica una tabla si existe,
     - solo agrega una columna si no existe.
   Se puede re-ejecutar sin efectos secundarios.
   ============================================================================ */

-- 1) facturas.tipo_documento  (FACTURA | BOLETA)
IF OBJECT_ID(N'dbo.facturas', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.facturas') AND name = N'tipo_documento'
    )
    BEGIN
        ALTER TABLE dbo.facturas
            ADD tipo_documento VARCHAR(20) NOT NULL
            CONSTRAINT DF_facturas_tipo_documento DEFAULT 'FACTURA';
        PRINT 'OK: facturas.tipo_documento agregada.';
    END
    ELSE PRINT 'SKIP: facturas.tipo_documento ya existe.';
END
ELSE PRINT 'AVISO: no existe la tabla dbo.facturas (¿esquema de demo?). Nada que hacer.';
GO

-- 2) ordenes_compra.proveedor_nombre  (proveedor por texto libre)
IF OBJECT_ID(N'dbo.ordenes_compra', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.ordenes_compra') AND name = N'proveedor_nombre'
    )
    BEGIN
        ALTER TABLE dbo.ordenes_compra ADD proveedor_nombre VARCHAR(200) NULL;
        PRINT 'OK: ordenes_compra.proveedor_nombre agregada.';
    END
    ELSE PRINT 'SKIP: ordenes_compra.proveedor_nombre ya existe.';
END
ELSE PRINT 'AVISO: no existe la tabla dbo.ordenes_compra. Nada que hacer.';
GO

-- 3) ordenes_compra.proveedor_id  ->  opcional (NULL), para permitir proveedor libre
IF OBJECT_ID(N'dbo.ordenes_compra', N'U') IS NOT NULL
AND EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ordenes_compra')
      AND name = N'proveedor_id' AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.ordenes_compra ALTER COLUMN proveedor_id INT NULL;
    PRINT 'OK: ordenes_compra.proveedor_id ahora es NULL.';
END
ELSE PRINT 'SKIP: ordenes_compra.proveedor_id ya es opcional o la tabla no existe.';
GO

-- 4) detalle_ordenes: producto por texto libre (producto_nombre) + producto_id/precio opcionales
IF OBJECT_ID(N'dbo.detalle_ordenes', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.detalle_ordenes') AND name = N'producto_nombre')
    BEGIN
        ALTER TABLE dbo.detalle_ordenes ADD producto_nombre VARCHAR(200) NULL;
        PRINT 'OK: detalle_ordenes.producto_nombre agregada.';
    END
    ELSE PRINT 'SKIP: detalle_ordenes.producto_nombre ya existe.';

    IF EXISTS (SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.detalle_ordenes') AND name = N'producto_id' AND is_nullable = 0)
    BEGIN
        ALTER TABLE dbo.detalle_ordenes ALTER COLUMN producto_id INT NULL;
        PRINT 'OK: detalle_ordenes.producto_id ahora es NULL.';
    END

    IF EXISTS (SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.detalle_ordenes') AND name = N'precio_unitario' AND is_nullable = 0)
    BEGIN
        ALTER TABLE dbo.detalle_ordenes ALTER COLUMN precio_unitario DECIMAL(10,2) NULL;
        PRINT 'OK: detalle_ordenes.precio_unitario ahora es NULL.';
    END
END
ELSE PRINT 'AVISO: no existe la tabla dbo.detalle_ordenes. Nada que hacer.';
GO

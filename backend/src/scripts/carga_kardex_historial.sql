-- SQL de carga — movimientos_kardex (ejecutar DESPUÉS de productos y lotes)
-- Paso 1: crear tabla staging en la BD
CREATE TABLE staging_movimientos (
  fuente          VARCHAR(50),
  tipo_movimiento_id INT,
  referencia_tipo VARCHAR(50),
  numero_guia     VARCHAR(50),
  lote            VARCHAR(20),
  cod_pro         VARCHAR(10),
  nombre_producto VARCHAR(200),
  cantidad        DECIMAL(10,2),
  fecha_movimiento DATE,
  cliente         VARCHAR(200),
  motivo          VARCHAR(50)
);

-- Paso 2: importar staging_movimientos_kardex.csv via SSMS o BCP
-- (Se ejecuta manualmente importando el Flat File en SQL Server a la tabla staging_movimientos)


-- Paso 3: insertar en movimientos_kardex calculando stock usando el Cursor CursorKardex
DECLARE @stock DECIMAL(10,2);
DECLARE @cod VARCHAR(10), @lote VARCHAR(20), @tipo INT, @cant DECIMAL(10,2), @fecha DATE, @guia VARCHAR(50), @motivo VARCHAR(50);
DECLARE @pid INT, @lid INT;

DECLARE cur CURSOR FOR
  SELECT s.cod_pro, s.lote, s.tipo_movimiento_id, s.cantidad,
         s.fecha_movimiento, s.numero_guia, s.motivo
  FROM staging_movimientos s
  ORDER BY s.fecha_movimiento ASC;

OPEN cur;
FETCH NEXT FROM cur INTO @cod, @lote, @tipo, @cant, @fecha, @guia, @motivo;

WHILE @@FETCH_STATUS = 0
BEGIN
  -- Identificar los IDs oficiales (Foráneas)
  SELECT @pid = id, @stock = stock_actual FROM productos WHERE codigo = @cod;
  SELECT @lid = id FROM lotes_produccion WHERE numero_lote = @lote;

  -- Regla R1: Validar stock en Salidas
  IF @tipo = 2 AND @cant > @stock
    -- Si falla se anota en una tabla de auditoria log_errores (o print en consola)
    -- Asumiendo existencia de log_errores:
    -- INSERT log_errores VALUES (@guia, @cod, @lote, 'Stock insuficiente');
    PRINT 'Error de Stock: Guia ' + @guia + ' Prod: ' + @cod + ' Lote: ' + @lote;
  ELSE BEGIN
    -- Procesar movimiento válido
    DECLARE @nuevo DECIMAL(10,2) = CASE WHEN @tipo=1 THEN @stock+@cant ELSE @stock-@cant END;
    
    INSERT movimientos_kardex (producto_id, lote_id, usuario_id, tipo_movimiento_id,
      cantidad, stock_anterior, stock_nuevo, referencia_tipo, motivo, fecha_movimiento)
    VALUES (@pid, @lid, 1, @tipo, @cant, @stock, @nuevo, 'GUIA', @motivo, @fecha);

    -- Actualizar stock consolidado global
    UPDATE productos SET stock_actual=@nuevo WHERE id=@pid;
  END

  FETCH NEXT FROM cur INTO @cod, @lote, @tipo, @cant, @fecha, @guia, @motivo;
END
CLOSE cur; 
DEALLOCATE cur;

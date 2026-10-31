-- =============================================================================
--  DATA SEMILLA DE DEMOSTRACIÓN — Tesis Droguería EKA S.A.C.
--  Adaptado estrictamente al esquema real (structure_only.sql)
-- =============================================================================

-- 1) PURGA (idempotente). Orden hijo -> padre por las FKs.
DELETE FROM dbo.detalle_facturas;
DELETE FROM dbo.detalle_guias;
DELETE FROM dbo.movimientos_kardex;
DELETE FROM dbo.lotes_produccion;
DELETE FROM dbo.productos;
-- DELETE FROM dbo.categorias; -- No se eliminan categorias base para no afectar FKs, o se puede si no hay IDs forzados

DBCC CHECKIDENT (N'dbo.movimientos_kardex', RESEED, 0);
DBCC CHECKIDENT (N'dbo.lotes_produccion', RESEED, 0);
DBCC CHECKIDENT (N'dbo.productos', RESEED, 0);

-- =============================================================================
-- 3) PRODUCTOS (Con stock_actual pre-calculado según las entradas y salidas)
-- Asumiendo que Categorias 1 a 5 ya existen por el init.sql
-- =============================================================================
SET IDENTITY_INSERT dbo.productos ON;
INSERT INTO dbo.productos (id, codigo, nombre, categoria_id, unidad_medida, precio_unitario, stock_minimo, stock_actual, estado) VALUES
 ( 1, N'P001', N'Sonda Foley N°14',               1, N'UND',  8.50,  10, 40, 1),
 ( 2, N'P002', N'Sonda Foley N°16',               1, N'UND',  8.90,  10, 35, 1),
 ( 3, N'P003', N'Sonda Nasogástrica N°16',        1, N'UND',  6.20,  10, 25, 1),
 ( 4, N'P004', N'Sonda de Aspiración N°12',       1, N'UND',  3.80,  20, 60, 1),
 ( 5, N'P005', N'Mascarilla Quirúrgica 3 pliegues',2,N'UND',  0.35, 100, 250, 1),
 ( 6, N'P006', N'Respirador N95',                 2, N'UND',  4.50,  30, 80, 1),
 ( 7, N'P007', N'Protector Facial (careta)',      2, N'UND',  5.00,  15, 35, 1),
 ( 8, N'P008', N'Gasa Estéril 10x10',             3, N'UND',  0.80, 100, 300, 1),
 ( 9, N'P009', N'Venda Elástica 4"',              3, N'UND',  3.20,  20, 45, 1),
 (10, N'P010', N'Apósito Transparente',           3, N'UND',  2.10,  30, 90, 1),
 (11, N'P011', N'Esparadrapo 2"',                 3, N'UND',  6.50,  10, 20, 1),
 (12, N'P012', N'Jeringa 5ml',                    4, N'UND',  0.45, 150, 250, 1),
 (13, N'P013', N'Jeringa 10ml',                   4, N'UND',  0.60, 100, 250, 1),
 (14, N'P014', N'Aguja Hipodérmica 21G',          4, N'UND',  0.20, 200, 500, 1),
 (15, N'P015', N'Catéter Endovenoso N°20',        4, N'UND',  1.80,  40, 70, 1),
 (16, N'P016', N'Guante Quirúrgico N°7.5 (par)',  5, N'PAR',  1.50,  50, 120, 1),
 (17, N'P017', N'Guante de Examen Nitrilo',       5, N'UND',  0.30, 300, 1000, 1),
 (18, N'P018', N'Alcohol en Gel 500ml',           5, N'UND', 12.00,  15, 30, 1);
SET IDENTITY_INSERT dbo.productos OFF;

-- =============================================================================
-- 4) LOTES DE PRODUCCIÓN (estado_id = 2 "COMPLETADO", registrado_por = 1 "ADMIN")
--    cantidad_producida refleja el ingreso inicial.
-- =============================================================================
SET IDENTITY_INSERT dbo.lotes_produccion ON;
INSERT INTO dbo.lotes_produccion (id, producto_id, numero_lote, fecha_produccion, fecha_vencimiento, cantidad_producida, estado_id, registrado_por) VALUES
 ( 1,  1, N'LT-F14-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 90,CAST(GETDATE() AS DATE)),   40, 2, 1),
 ( 2,  2, N'LT-F16-2404',  DATEADD(DAY,-35,CAST(GETDATE() AS DATE)), DATEADD(DAY, 12,CAST(GETDATE() AS DATE)),   15, 2, 1), 
 ( 3,  2, N'LT-F16-2406',  DATEADD(DAY,-20,CAST(GETDATE() AS DATE)), DATEADD(DAY,150,CAST(GETDATE() AS DATE)),   30, 2, 1), 
 ( 4,  3, N'LT-NAS-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 45,CAST(GETDATE() AS DATE)),   25, 2, 1), 
 ( 5,  4, N'LT-ASP-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,  8,CAST(GETDATE() AS DATE)),   60, 2, 1), 
 ( 6,  5, N'LT-MSQ-2404',  DATEADD(DAY,-40,CAST(GETDATE() AS DATE)), DATEADD(DAY, 30,CAST(GETDATE() AS DATE)),  500, 2, 1), 
 ( 7,  6, N'LT-N95-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,200,CAST(GETDATE() AS DATE)),   80, 2, 1), 
 ( 8,  7, N'LT-CAR-2403',  DATEADD(DAY,-60,CAST(GETDATE() AS DATE)), DATEADD(DAY,-10,CAST(GETDATE() AS DATE)),   35, 2, 1), 
 ( 9,  8, N'LT-GAS-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 14,CAST(GETDATE() AS DATE)),  300, 2, 1), 
 (10,  9, N'LT-VEN-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 75,CAST(GETDATE() AS DATE)),   45, 2, 1), 
 (11, 10, N'LT-APO-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 55,CAST(GETDATE() AS DATE)),   90, 2, 1), 
 (12, 11, N'LT-ESP-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,365,CAST(GETDATE() AS DATE)),   20, 2, 1), 
 (13, 12, N'LT-JR5-2404',  DATEADD(DAY,-28,CAST(GETDATE() AS DATE)), DATEADD(DAY, 40,CAST(GETDATE() AS DATE)),  400, 2, 1), 
 (14, 13, N'LT-JR10-2405', DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,100,CAST(GETDATE() AS DATE)),  250, 2, 1), 
 (15, 14, N'LT-AG21-2405', DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,  5,CAST(GETDATE() AS DATE)),  500, 2, 1), 
 (16, 15, N'LT-CAT-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY,220,CAST(GETDATE() AS DATE)),   70, 2, 1), 
 (17, 16, N'LT-GQ75-2405', DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 25,CAST(GETDATE() AS DATE)),  120, 2, 1), 
 (18, 17, N'LT-GEX-2402',  DATEADD(DAY,-70,CAST(GETDATE() AS DATE)), DATEADD(DAY, -5,CAST(GETDATE() AS DATE)), 1000, 2, 1), 
 (19, 18, N'LT-ALG-2405',  DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), DATEADD(DAY, 13,CAST(GETDATE() AS DATE)),   30, 2, 1);
SET IDENTITY_INSERT dbo.lotes_produccion OFF;

-- =============================================================================
-- 5) MOVIMIENTOS KARDEX (usuario_id = 1, tipo_movimiento_id: 1=ENTRADA, 2=SALIDA)
--    stock_anterior y stock_nuevo están mapeados rigurosamente por orden lógico.
-- =============================================================================

-- 5.1 ENTRADAS (Ingreso inicial de stock)
INSERT INTO dbo.movimientos_kardex (producto_id, usuario_id, tipo_movimiento_id, cantidad, stock_anterior, stock_nuevo, referencia_tipo, lote_id, motivo, fecha_movimiento) VALUES
 ( 1, 1, 1,   40,   0,   40, N'Compra OC-1001',  1, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 2, 1, 1,   15,   0,   15, N'Compra OC-0998',  2, N'Ingreso Semilla', DATEADD(DAY,-35,CAST(GETDATE() AS DATE))),
 ( 2, 1, 1,   30,  15,   45, N'Compra OC-1010',  3, N'Ingreso Semilla', DATEADD(DAY,-20,CAST(GETDATE() AS DATE))),
 ( 3, 1, 1,   25,   0,   25, N'Compra OC-1001',  4, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 4, 1, 1,   60,   0,   60, N'Compra OC-1001',  5, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 5, 1, 1,  500,   0,  500, N'Compra OC-0990',  6, N'Ingreso Semilla', DATEADD(DAY,-40,CAST(GETDATE() AS DATE))),
 ( 6, 1, 1,   80,   0,   80, N'Compra OC-1002',  7, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 7, 1, 1,   35,   0,   35, N'Compra OC-0980',  8, N'Ingreso Semilla', DATEADD(DAY,-60,CAST(GETDATE() AS DATE))),
 ( 8, 1, 1,  300,   0,  300, N'Compra OC-1002',  9, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 9, 1, 1,   45,   0,   45, N'Compra OC-1002', 10, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (10, 1, 1,   90,   0,   90, N'Compra OC-1003', 11, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (11, 1, 1,   20,   0,   20, N'Compra OC-1003', 12, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (12, 1, 1,  400,   0,  400, N'Compra OC-1004', 13, N'Ingreso Semilla', DATEADD(DAY,-28,CAST(GETDATE() AS DATE))),
 (13, 1, 1,  250,   0,  250, N'Compra OC-1004', 14, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (14, 1, 1,  500,   0,  500, N'Compra OC-1004', 15, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (15, 1, 1,   70,   0,   70, N'Compra OC-1005', 16, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (16, 1, 1,  120,   0,  120, N'Compra OC-1005', 17, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 (17, 1, 1, 1000,   0, 1000, N'Compra OC-0975', 18, N'Ingreso Semilla', DATEADD(DAY,-70,CAST(GETDATE() AS DATE))),
 (18, 1, 1,   30,   0,   30, N'Compra OC-1006', 19, N'Ingreso Semilla', DATEADD(DAY,-30,CAST(GETDATE() AS DATE)));

-- 5.2 SALIDAS (Consumo de stock aplicando FEFO)
INSERT INTO dbo.movimientos_kardex (producto_id, usuario_id, tipo_movimiento_id, cantidad, stock_anterior, stock_nuevo, referencia_tipo, lote_id, motivo, fecha_movimiento) VALUES
 -- P005 Mascarilla: inicial 500, tres salidas
 ( 5, 1, 2,  120, 500, 380, N'AREA-Enfermería', 6, N'Requerimiento Interno', DATEADD(DAY,-30,CAST(GETDATE() AS DATE))),
 ( 5, 1, 2,   80, 380, 300, N'AREA-Emergencia', 6, N'Requerimiento Interno', DATEADD(DAY,-18,CAST(GETDATE() AS DATE))),
 ( 5, 1, 2,   50, 300, 250, N'AREA-Tópico',     6, N'Requerimiento Interno', DATEADD(DAY, -6,CAST(GETDATE() AS DATE))),
 
 -- P002 Sonda Foley N°16: inicial total 45, salida de 10 del Lote 2
 ( 2, 1, 2,   10,  45,  35, N'AREA-Urología',   2, N'Requerimiento Interno', DATEADD(DAY,-12,CAST(GETDATE() AS DATE))),
 
 -- P012 Jeringa 5ml: inicial 400, salida de 150
 (12, 1, 2,  150, 400, 250, N'AREA-Farmacia',  13, N'Requerimiento Interno', DATEADD(DAY, -9,CAST(GETDATE() AS DATE)));
GO

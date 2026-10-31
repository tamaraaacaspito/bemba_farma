# 🏥 Sistema de Trazabilidad de Inventarios - Droguería EKA S.A.C.

Este es el sistema central de gestión de inventarios diseñado específicamente para satisfacer las exigencias logísticas y sanitarias (Digemid) de la Droguería EKA S.A.C. El software garantiza una trazabilidad absoluta de los medicamentos e insumos médicos mediante un Kardex inmutable y el estricto cumplimiento del modelo FEFO (Primero en Vencer, Primero en Salir).

---

## ✨ Funciones Principales del Sistema

### 1. 📊 Dashboard Gerencial y Analíticas
Panel principal en tiempo real diseñado para la toma de decisiones rápidas:
- **Métricas Clave:** Valorización total del inventario (en Soles), conteo de productos activos, alertas de stock crítico y productos agotados.
- **Gráficos Dinámicos:** Visualización de tendencias de entradas vs. salidas mensuales, y distribución del inventario por categorías.
- **Diseño Responsivo e Inteligente:** Ajuste automático de tipografías y contenedores (Smart CSS Clamp) para montos financieros grandes.

### 2. 📦 Catálogo Maestro de Productos
Gestión completa del catálogo de medicamentos y dispositivos médicos:
- **CRUD Completo:** Registro, edición, detalle y desactivación lógica de productos.
- **Alertas Visuales:** Semáforo automático de estado (OK, Crítico, Agotado) basado en el cruce de datos con el Stock Mínimo permitido.
- **Filtros Rápidos:** Buscador por nombre/código y filtros instantáneos para aislar productos con "Stock Crítico" o "Agotados".

### 3. 🧬 Control de Lotes y Trazabilidad (FEFO)
Motor especializado para el seguimiento de caducidades, vital en el sector farmacéutico:
- **Cálculo de Stock en Tiempo Real:** El sistema no almacena "stocks estáticos". Calcula el stock exacto de cada lote sumando y restando dinámicamente sus movimientos en el Kardex.
- **Visor de Lotes por Producto:** Panel lateral (Drawer) que detalla los lotes específicos vinculados a un producto, su stock restante y los días faltantes para su caducidad.
- **Filtro de Auditoría (Lotes Vencidos con Stock):** Herramienta logística que aísla de inmediato la mercadería caducada que físicamente sigue ocupando espacio en el almacén, obligando al operario a retirarla mediante el Kardex.

### 4. 🗂️ Kardex Transaccional Avanzado
El corazón contable e inmutable del sistema.
- **Operaciones Estándar:** Registro de Entradas (compras) y Salidas (despachos/consumos).
- **Protección de Datos FEFO:** Al registrar una salida, el sistema bloquea la escritura manual de fechas y obliga al usuario a seleccionar un lote existente (con stock disponible) desde un menú desplegable, autocompletando su fecha de vencimiento.
- **Operaciones Complejas (Canjes):** Lógica de doble movimiento automático. Permite ingresar un lote defectuoso devuelto y dar salida a un lote de reemplazo en una sola transacción auditable.
- **Reposiciones:** Flujo especial para documentar la corrección de faltantes en entregas previas.

---

## 🛠️ Stack Tecnológico (Tech Stack)
El proyecto cuenta con una arquitectura moderna separada en capas:

- **Frontend (Cliente):** React.js + Vite, estilizado con Tailwind CSS (Vanilla CSS para tokens). UI dinámica y responsiva con micro-animaciones (Lucide Icons, Recharts).
- **Backend (Servidor):** Node.js con Express.js. Arquitectura basada en Controladores, Rutas y Modelos.
- **Base de Datos:** Microsoft SQL Server. Estructura relacional con llaves foráneas estrictas y scripts de inicialización de datos de prueba (Seeders).
- **ORM:** Sequelize (Mapeo objeto-relacional para consultas y sub-consultas matemáticas avanzadas).

---

## 🚀 Guía de Ejecución Local

### Prerrequisitos
- Node.js (v18+)
- Microsoft SQL Server en ejecución.

### 1. Levantar el Backend
```bash
cd d:/drogueria-eka/backend
npm install
npm run dev
```
*(El backend correrá típicamente en el puerto 3000)*

### 2. Levantar el Frontend
```bash
cd d:/drogueria-eka/frontend
npm install
npm run dev
```
*(El frontend correrá en http://localhost:5173/)*

---
*Desarrollado como proyecto de Tesis para la automatización logística de Droguería EKA S.A.C.*

# Stock Óptica — TypeScript + Bootstrap + Node (JS) + MongoDB Atlas

Aplicación de stock integral con 3 pantallas:
1) Login/Registro (card minimalista + loader).
2) Movimientos de stock (ABM + selección múltiple + alertas de vencimiento + resumen general).
3) Administración (usuarios + vista movimientos + alta/baja de productos).

## Estructura

- `backend/` Express (JavaScript) + Mongoose + JWT
- `frontend/` React (TypeScript) + Bootstrap 5

---

## 1) Configuración de MongoDB Atlas (paso a paso)

1. Crear un **Cluster** (M0 Free es suficiente para desarrollo).
2. En **Database Access**:
   - Crear un **Database User** con contraseña.
3. En **Network Access**:
   - Agregar tu IP actual (o `0.0.0.0/0` para pruebas rápidas; no recomendado para producción).
4. En **Database**:
   - No hace falta crear colecciones manualmente: Mongoose las crea al primer uso.
5. Obtener el **connection string**:
   - Atlas → Connect → Drivers → copiar URI `mongodb+srv://...`

La DB usada por defecto es: `stock_optica` (podés cambiarla en el URI).

---

## 2) Backend — configuración y arranque

### Requisitos
- Node.js 18+ (recomendado 20+)

### Configuración
En `backend/`:
1. Copiar `.env.example` a `.env`
2. Completar:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (por defecto `http://localhost:5173`)

> **Admin inicial**: para el primer arranque, dejá `BOOTSTRAP_ADMIN=true`.
El backend creará (si no existe) un usuario admin con `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`.

### Ejecutar
```bash
cd backend
npm install
npm run dev
```

Healthcheck:
- `GET http://localhost:4000/api/health`

---

## 3) Frontend — configuración y arranque

En `frontend/`:
1. Copiar `.env.example` a `.env`
2. Ajustar `VITE_API_URL` (por defecto `http://localhost:4000`)

Ejecutar:
```bash
cd frontend
npm install
npm run dev
```

Abrir:
- http://localhost:5173

---

## 4) Reglas de negocio implementadas

### Colecciones (se crean automáticamente)
- `users`
- `products`
- `movements`

### Movimientos
- Tipo: `IN` / `OUT`
- Cantidad: entero >= 1
- Se puede registrar: lote, dioptrías, vencimiento y nota
- **Stock actual**: se calcula por agregación de movimientos: `SUM(IN) - SUM(OUT)` agrupado por `producto+lote+dioptrías+vencimiento`

### Alertas de vencimiento
- Vencido: vencimiento < hoy (fila roja)
- Próximo a vencer: <= 30 días (fila amarilla)
- Se aplican tanto a movimientos como a posiciones de stock (resumen)

---

## 5) Observaciones importantes sobre “pruebas”

El proyecto incluye tests básicos en `backend/tests/`.
Para ejecutarlos:
```bash
cd backend
npm test
```

---

## 6) Endpoints (resumen)

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Products:
  - `GET /api/products`
  - `POST /api/products` (admin)
  - `DELETE /api/products/:id` (admin, baja lógica)
- Movements:
  - `GET /api/movements`
  - `POST /api/movements`
  - `PUT /api/movements/:id`
  - `DELETE /api/movements/:id`
  - `POST /api/movements/bulk-delete`
- Summary:
  - `GET /api/summary`

---

## 7) Producción

Sugerencias mínimas:
- Usar `CORS_ORIGIN` restringido
- `JWT_SECRET` largo y rotado
- Activar reglas de IP en Atlas, y usar usuarios con permisos mínimos


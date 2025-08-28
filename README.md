Back, listado para Front

# Endpoints actuales y permisos

## 1. Autenticación

### 1.1. Login con Google (idToken directo)
- **POST `/auth/google`**
- **Roles:** Público (no requiere login)
- **Descripción:** Login social, recibe un idToken de Google y devuelve cookie de sesión.
- **Curl:**
    ```sh
    curl -X POST http://localhost:3000/auth/google \
      -H "Content-Type: application/json" \
      -d '{"idToken":"TU_ID_TOKEN_DE_GOOGLE"}' \
      -c cookies.txt
    ```
    > Guarda la cookie `auth` en `cookies.txt` para usar en los siguientes requests.

--- CHECK 

### 1.2. Logout
- **POST `/auth/logout`**
- **Roles:** Usuario autenticado
- **Descripción:** Cierra la sesión (borra la cookie).
- **Curl:**
    ```sh
    curl -X POST http://localhost:3000/auth/logout -b cookies.txt
    ```

--- CHECK

### 1.3. Obtener usuario autenticado
- **GET `/auth/me`**
- **Roles:** Usuario autenticado
- **Descripción:** Devuelve los datos del usuario autenticado.
- **Curl:**
    ```sh
    curl http://localhost:3000/auth/me -b cookies.txt
    ```

--- CHECK

## 2. Usuarios

### 2.1. Listar todos los usuarios
- **GET `/users/`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/users -b cookies.txt
    ```

--- CHECK

### 2.2. Crear usuario
- **POST `/users/`**
- **Roles:** ADMIN
- **Curl:**
    ```sh<
    curl -X POST http://localhost:3000/users \
      -H "Content-Type: application/json" \
      -d '{"email":"nuevo@ejemplo.com","name":"Nuevo Usuario","role":"EMPLEADO"}' \
      -b cookies.txt
    ```

---

### 2.3. Editar usuario
- **PATCH `/users/:id`**
- **Roles:** ADMIN, EMPLEADO
- **Curl:**
    ```sh
    curl -X PATCH http://localhost:3000/users/USER_ID \
      -H "Content-Type: application/json" \
      -d '{"name":"Nombre Editado"}' \
      -b cookies.txt
    ```

--- CHECK

### 2.4. Cambiar rol de usuario
- **PATCH `/users/:id/role`**
- **Roles:** ADMIN
- **Curl:**
    ```sh
    curl -X PATCH http://localhost:3000/users/USER_ID/role \
      -H "Content-Type: application/json" \
      -d '{"role":"EMPLEADO"}' \
      -b cookies.txt
    ```

--- CHECK

### 2.5. Listar empleados
- **GET `/users/employees`**
- **Roles:** ADMIN
- **Curl:**
    ```sh
    curl http://localhost:3000/users/employees -b cookies.txt
    ```

---

### 2.6. Listar clientes
- **GET `/users/clients`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/users/clients -b cookies.txt
    ```

---

## 3. Suscripciones

### 3.1. Listar todas las suscripciones
- **GET `/subscriptions`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/subscriptions -b cookies.txt
    ```

---

### 3.2. Obtener una suscripción
- **GET `/subscriptions/:id`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/subscriptions/SUBSCRIPTION_ID -b cookies.txt
    ```

---

### 3.3. Crear suscripción
- **POST `/subscriptions`**
- **Roles:** ADMIN, EMPLEADO
- **Curl:**
    ```sh
    curl -X POST http://localhost:3000/subscriptions \
      -H "Content-Type: application/json" \
      -d '{"userId":"USER_ID","planId":"PLAN_ID","startDate":"2024-06-01T00:00:00Z","endDate":"2024-06-30T00:00:00Z"}' \
      -b cookies.txt
    ```

---

### 3.4. Editar suscripción
- **PATCH `/subscriptions/:id`**
- **Roles:** ADMIN, EMPLEADO
- **Curl:**
    ```sh
    curl -X PATCH http://localhost:3000/subscriptions/SUBSCRIPTION_ID \
      -H "Content-Type: application/json" \
      -d '{"status":"VIGENTE"}' \
      -b cookies.txt
    ```

---

### 3.5. Eliminar suscripción
- **DELETE `/subscriptions/:id`**
- **Roles:** ADMIN
- **Curl:**
    ```sh
    curl -X DELETE http://localhost:3000/subscriptions/SUBSCRIPTION_ID -b cookies.txt
    ```

---

## 4. Pagos

### 4.1. Listar todos los pagos
- **GET `/payments`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/payments -b cookies.txt
    ```

---

### 4.2. Obtener un pago
- **GET `/payments/:id`**
- **Roles:** ADMIN, EMPLEADO, CONTADOR
- **Curl:**
    ```sh
    curl http://localhost:3000/payments/PAYMENT_ID -b cookies.txt
    ```

---

### 4.3. Registrar un pago
- **POST `/payments`**
- **Roles:** ADMIN, EMPLEADO
- **Curl:**
    ```sh
    curl -X POST http://localhost:3000/payments \
      -H "Content-Type: application/json" \
      -d '{"userId":"USER_ID","subscriptionId":"SUBSCRIPTION_ID","provider":"mercado_pago","amount":20000}' \
      -b cookies.txt
    ```

---

### 4.4. Editar un pago
- **PATCH `/payments/:id`**
- **Roles:** ADMIN, EMPLEADO
- **Curl:**
    ```sh
    curl -X PATCH http://localhost:3000/payments/PAYMENT_ID \
      -H "Content-Type: application/json" \
      -d '{"status":"APPROVED"}' \
      -b cookies.txt
    ```

---

### 4.5. Eliminar un pago
- **DELETE `/payments/:id`**
- **Roles:** ADMIN
- **Curl:**
    ```sh
    curl -X DELETE http://localhost:3000/payments/PAYMENT_ID -b cookies.txt
    ```

---

# ¿Qué puede y no puede hacer el sistema hoy?

## Puede:
- Login con Google y autenticación JWT vía cookie.
- Listar, crear, editar y cambiar roles de usuarios (según permisos).
- Listar empleados y clientes.
- Listar, crear, editar y eliminar suscripciones (según permisos).
- Listar, crear, editar y eliminar pagos (según permisos).
- Documentación Swagger en `/docs`.

## No puede (todavía):
- No hay endpoints para planes ni sucursales.
- No hay endpoints para ver/editar el propio perfil (solo admin/empleado pueden editar usuarios).
- No hay lógica de negocio avanzada (ej: validaciones cruzadas, reportes, etc).
- No hay notificaciones ni integración con medios de pago reales.
- No hay manejo avanzado de errores globales ni paginación en listados.

---

# Recomendación

- Usá los curl anteriores para probar en Postman (importando como "Raw text").
- Consultá [http://localhost:3000/docs](http://localhost:3000/docs) para ver la documentación y probar los endpoints manualmente.

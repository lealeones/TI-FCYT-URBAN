# Urban Dance

Urban Dance es un sistema de gestión para academias de baile que centraliza alumnos, clases, asistencias, facturación y pagos, integrando una experiencia simple para alumnos mediante WhatsApp y RFID.

El proyecto está compuesto por un backend desarrollado con **NestJS**, un frontend desarrollado con **NextJS** y una base de datos **PostgreSQL**.
La estructura está pensada para permitir tanto un despliegue completo mediante `docker-compose`, como la ejecución individual de cada servicio en modo desarrollo.

---

## Descripción funcional del sistema

El sistema está pensado para la administración integral de alumnos en una academia de baile.

Su filosofía principal es mantener una experiencia simple para el usuario final. El alumno no necesita acceder a una aplicación web ni gestionar credenciales tradicionales, sino que interactúa con el sistema a través de un bot de WhatsApp.

Desde el bot, el alumno puede:

* Consultar las clases en las que se encuentra inscripto.
* Inscribirse a nuevas clases disponibles.
* Consultar facturas generadas.
* Obtener links de pago.
* Ver el estado de su deuda.
* Gestionar su asistencia mediante un llavero RFID entregado por la academia.

El sistema prioriza la confianza y la identificación unívoca del alumno bajo el criterio:

```text
1 usuario = 1 número telefónico
```

Esto permite centralizar la comunicación, autenticación y operación del alumno desde WhatsApp.

---

## Roles del sistema

El sistema contempla los siguientes roles principales:

* Alumno
* Profesor
* Administrador
* Administrador global

Los alumnos interactúan con el sistema únicamente mediante el bot de WhatsApp y el llavero RFID.
Los usuarios administrativos acceden a la aplicación web mediante un link generado desde el bot de WhatsApp.

---

## Usuarios administrativos

Los usuarios administrativos, como profesores y administradores, cuentan con acceso a la aplicación web.

El acceso a la web se realiza desde el bot de WhatsApp mediante un token único de sesión y usuario. Este token permite identificar al usuario que está ingresando y transportar la información necesaria para operar dentro del sistema web.

Desde la aplicación web, los usuarios administrativos pueden gestionar:

* Asistencias.
* Alta, baja y modificación de clases.
* Alta, baja y modificación de usuarios.
* Generación de facturas.
* Gestión de pagos.
* Administración general del sistema.

---

## Autenticación web

El sistema utiliza tokens únicos de sesión para permitir el acceso web de usuarios administrativos.

El flujo de autenticación es el siguiente:

1. El usuario administrativo solicita acceso desde el bot de WhatsApp.
2. El bot genera un token único.
3. El bot envía un link al frontend con ese token.
4. El frontend verifica el token contra el endpoint `/auth/verify`.
5. Si el token es válido, se inicia la sesión web.

Características del token:

* Tiene vencimiento de 30 minutos.
* Es de un solo uso.
* Se envía al frontend mediante query param.
* Se almacena en memoria y cookie durante la sesión.

Endpoint relacionado:

```http
GET http://localhost:3001/auth/verify
```

Este endpoint público se utiliza para verificar el token de inicio de sesión.

---

## Gestión de clases

El sistema permite administrar clases con distintas modalidades.

Las clases pueden ser:

### Clases puntuales

Clases creadas para una fecha específica, por ejemplo:

```text
Clase especial de salsa - Viernes 10/05 de 19:00 a 21:00
```

### Clases recurrentes

Clases que se repiten en el tiempo bajo una regla definida, por ejemplo:

```text
Todos los lunes de 18:00 a 20:00 durante 6 meses
```

Esta funcionalidad permite contemplar la lógica habitual de una academia de baile, donde existen cursos regulares, clases especiales, talleres y eventos puntuales.

---

## Asistencia mediante RFID

A cada alumno se le entrega un llavero RFID que permite registrar su asistencia a clases.

Este mecanismo simplifica el control de presencia y evita que el alumno tenga que realizar acciones manuales desde una aplicación web.

El sistema permite asociar cada llavero RFID a un usuario determinado y registrar sus ingresos o asistencias dentro de las clases correspondientes.

Además, una vez inicializado el sistema, se permite un flujo de registro de usuario a través de un nuevo llavero RFID, simplificando el alta de nuevos alumnos.

---

## Integración RFID con ESP32

El proyecto cuenta con un sketch disponible en:

```bash
/bot-wsp/sketchesp32.txt
```

Este sketch está pensado para desplegarse en un **ESP32** con lector RFID.

El código contempla:

* Portal cautivo para configuración inicial.
* Configuración de acceso a red WiFi.
* Configuración de la URL del backend.
* Envío de información del llavero RFID al backend.
* Vinculación del llavero con un usuario.
* Registro de asistencia si el llavero ya está registrado.
* Inicio de flujo de registro si el llavero aún no está asociado a un usuario.

Endpoint utilizado por el dispositivo:

```http
POST http://localhost:3001/rfid/ping
```

Este endpoint recibe la información enviada por el lector RFID y permite resolver si corresponde registrar asistencia o iniciar un flujo de vinculación con un usuario.

### Requisitos de hardware

Para utilizar la funcionalidad RFID se requiere:

* ESP32.
* Lector RFID compatible.
* Llavero RFID.
* Adaptador USB a micro USB.
* Fuente 5V 1A.
* Red WiFi disponible.

---

## Facturación y pagos

El sistema contempla integración con:

* Mercado Pago, para generación de links de pago.
* Odoo, para facturación electrónica.

Desde el sistema se pueden generar facturas, consultar estados de deuda y obtener links de pago para que el alumno pueda operar desde WhatsApp.

---

## Flujo inicial del sistema

El backend cuenta con endpoints públicos para iniciar la configuración del sistema y obtener tokens de acceso.

### Obtener token inicial

```http
GET http://localhost:3001/auth/getToken
```

Este endpoint permite obtener un token de acceso.

En caso de no existir usuarios registrados en el sistema, se crea automáticamente un usuario administrador global y se retorna un token de login para dicho usuario.

Este flujo permite realizar la primera configuración del sistema luego del despliegue inicial.

---

### Inicializar sistema

```http
GET http://localhost:3001/auth/init
```

Este endpoint retorna y redirige a la primera URL pública del frontend para realizar la configuración inicial del sistema.

Se recomienda registrar en primer lugar un usuario de tipo administrador con un número de teléfono válido.

El número debe ingresarse con el siguiente criterio:

```text
Código de área + número, sin el prefijo 15
```

Ejemplo:

```text
343XXXXXXX
```

Este número será utilizado posteriormente para el inicio de sesión y la vinculación con el bot de WhatsApp.

---

## Estructura del proyecto

```bash
/
├── bot-wsp/              # Backend NestJS
├── front-urban/          # Frontend NextJS
├── .env                  # Variables de entorno generales
└── docker-compose.yml    # Compose principal para despliegue completo
```

---

## Servicios principales

El proyecto cuenta con los siguientes servicios principales:

| Servicio               | Tecnología | Puerto |
| ---------------------- | ---------- | ------ |
| Base de datos          | PostgreSQL | `5431` |
| Backend API            | NestJS     | `3001` |
| Servicio QR / WhatsApp | Backend    | `3008` |
| Frontend               | NextJS     | `3000` |

El archivo `docker-compose.yml` define los servicios necesarios junto con sus respectivos `Dockerfile`, permitiendo un despliegue rápido con variables de entorno configurables para ambientes de desarrollo o producción.

---

## Despliegue en producción con Docker Compose

Desde la raíz del proyecto, completar correctamente las variables de entorno en el archivo `.env`.

Luego ejecutar:

```bash
docker compose build
docker compose up -d
```

Este comando construye y levanta los servicios principales:

* PostgreSQL
* Backend NestJS
* Servicio QR / WhatsApp
* Frontend NextJS
* Odoo ERP

Verificar que los puertos requeridos estén disponibles antes de iniciar el despliegue.

---

# Backend - NestJS

Ubicación:

```bash
/bot-wsp
```

Versión utilizada:

```bash
NestJS v10.3.0
```

## Requisitos

Se requiere contar con una versión mínima de Node:

```bash
Node v20.20.2
```

Antes de iniciar el backend, revisar las variables de entorno.
Se puede tomar como referencia el archivo:

```bash
.env.example
```

Es muy importante contar con la variable:

```bash
DATABASE_URL
```

El schema de la base de datos se encuentra en:

```bash
/bot-wsp/prisma/schema.prisma
```

---

## Base de datos para desarrollo

Dentro de `/bot-wsp` se cuenta con un `docker-compose.yml` propio para levantar una instancia de PostgreSQL y utilizarla como base de datos local.

Desde la carpeta del backend:

```bash
cd bot-wsp
```

Levantar PostgreSQL:

```bash
docker compose up -d
```

---

## Iniciar backend en modo desarrollo

Desde la carpeta `/bot-wsp`, ejecutar:

```bash
npm i
npm run build
npm run generar
npm run start:dev
```

En caso de iniciar correctamente, el backend levantará un controller `GET` disponible en:

```bash
http://localhost:3008
```

Este endpoint retorna un código QR para realizar la vinculación con WhatsApp Web.

También se puede encontrar el QR generado en:

```bash
/bot-wsp/bot.qr.png
```

---

## Vinculación de WhatsApp

Luego de escanear el código QR y completar la vinculación, se recomienda utilizar **WhatsApp Business**.

Si la conexión fue exitosa, en consola se visualizará un log similar a:

```bash
LOG [WhatsappService] ✅ WhatsApp conectado exitosamente!
```

---

# Frontend - NextJS

Ubicación:

```bash
/front-urban
```

Versión utilizada:

```bash
NextJS v14.2.30
```

## Variables de entorno

El frontend cuenta con un archivo de ejemplo:

```bash
.env.example
```

Antes de iniciar el servicio, revisar y completar las variables de entorno necesarias.

---

## Iniciar frontend en modo desarrollo

Desde la carpeta `/front-urban`, ejecutar:

```bash
npm i
npm run build
npm run dev
```

El servicio queda disponible en:

```bash
http://localhost:3000
```

---

# Odoo ERP

Ubicación:

```bash
./
```

Versión utilizada:

```bash
Odoo 18.0 CE
```

## Variables de entorno

El Odoo cuenta con un archivo .env para su configuracion de despliegue en el docker-compose:

```bash
.env
```

Antes de iniciar el servicio, revisar y completar las variables de entorno necesarias.

## Despliegue y configuracion del entorno Odoo ERP:

### Crear la base:
1) localhost:8069/web/database/manager.
2) Completá: nombre de la base, email y contraseña del admin.
3) Elegí el idioma Español (AR).
4) País: Argentina (esto activa sugerencias de localización más adelante).
5) Presionar boton Crear instancia

### Configurar la localización argentina
1) En aplicaciones instalar la aplicacion l10n_ar
2) Configurá los datos fiscales de tu compañía: Ajustes → Empresas → tu compañía → completá CUIT, condición ante IVA, y los puntos de venta (Responsable Inscripto, Monotributo, etc.).
3) Si vas a facturar electrónicamente, necesitás cargar el certificado AFIP en Contabilidad → Configuración → Diarios (configuración del punto de venta electrónico).

### Instalar aplicacion de Mercado Pago
1) En aplicaciones, buscá "Mercado Pago" e instalarlo.
2) En Ajustes → Sitio Web → Pagos (o Contabilidad/Ventas → Configuración → Proveedores de pago). Abrí "Mercado Pago", poné tus credenciales (Access Token y Public Key, que sacás desde tu cuenta de desarrollador de Mercado Pago).
3) Activalo (pasarlo de "Deshabilitado" a "Habilitado" o "Modo prueba" primero para testear).

### Configuracion de API
1) En aplicaciones instalar la aplicacion account_api
2) Ingresa a "Ajustes -> Tecnico -> Parametros del sistema", buscar el registro "account.api.invoice.state.webhook" y proceder a establecer en el valor la URL del frontend. Su data de ejm actual es: https://libraries-exclusive-vernon-device.trycloudflare.com/odoo/webhook


---

# Resumen rápido

## Levantar todo el proyecto en producción

Desde la raíz:

```bash
docker compose build
docker compose up -d
```

## Levantar backend en desarrollo

```bash
cd bot-wsp
docker compose up -d
npm i
npm run build
npm run generar
npm run start:dev
```

## Levantar frontend en desarrollo

```bash
cd front-urban
npm i
npm run build
npm run dev
```

---

## Comandos útiles con Docker

Ver contenedores activos:

```bash
docker compose ps
```

Ver logs de todos los servicios:

```bash
docker compose logs -f
```

Ver logs del backend:

```bash
docker compose logs -f backend
```

Ver logs del frontend:

```bash
docker compose logs -f frontend
```

Reiniciar servicios:

```bash
docker compose restart
```

Detener servicios:

```bash
docker compose down
```

---

## Notas importantes

* Revisar siempre las variables de entorno antes de iniciar los servicios.
* El backend requiere una variable `DATABASE_URL` válida.
* El proyecto completo debe construirse y levantarse desde el `docker-compose.yml` principal.
* Para desarrollo local del backend, `/bot-wsp` incluye su propio `docker-compose.yml` para levantar PostgreSQL.
* La vinculación de WhatsApp se realiza mediante el código QR generado por el backend.
* El servicio expuesto en el puerto `3008` corresponde a un servicio dentro del ámbito backend utilizado para la vinculación de WhatsApp.
* La integración RFID requiere un ESP32 configurado con WiFi y con la URL del backend correctamente establecida.

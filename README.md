# Terraza Roja Website

Este proyecto contiene un pequeño demo para la banda **Terraza Roja**. Incluye
páginas estáticas y un servidor básico en Node.js que permite registrar
reservaciones y enviar correos de confirmación.

## Uso

1. Instala las dependencias:
   ```bash
   npm install
   ```
   (Requiere conexión a Internet y datos SMTP en variables de entorno)
2. Ejecuta el servidor:
   ```bash
   npm start
   ```
3. Abre `http://localhost:3000` en tu navegador (o la URL donde despliegues el servidor).
   Las páginas cargan Bootstrap desde jsDelivr para que funcionen aun si no instalas nada adicional.

Para verificar el envío de correos puedes ejecutar:
```bash
npm test
```
Este test reemplaza el transporte de Nodemailer y confirma que la función de
envío se ejecuta correctamente.

## Características

- **Inicio** (`index.html`): presentación de la banda.
- **Reservaciones** (`reservation.html`): calendario y formulario para enviar
 reservaciones. Los datos se almacenan en `reservations.json` y se envía un
  correo de confirmación usando Nodemailer.
- **Acceso miembros** (`login.html`): permite consultar las reservaciones
  almacenadas mediante un modal.

El servidor valida que los campos `name`, `email`, `details` y `date` estén
presentes antes de registrar la reservación. Si falta alguno, responde con un
mensaje de error y código `400`.

Para que el envío de correos funcione se deben definir las variables de entorno
`SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` con los datos de tu proveedor SMTP.

Bootstrap se carga desde jsDelivr y el código JavaScript está dividido en archivos específicos para cada
página (`public/js`).

# Terraza Roja Website

Este proyecto contiene un pequeño demo para la banda **Terraza Roja**. Incluye
páginas estáticas y un servidor básico en Node.js que permite registrar
reservaciones y enviar correos de confirmación.

## Uso

1. Instala las dependencias:
   ```bash
   npm install
   ```
   (Requiere conexión a Internet. Si no defines tus propias variables, el servidor usa las siguientes credenciales por defecto: `smtp.gmail.com`, usuario `sneydersalazar205@gmail.com` y contraseña `ejxo rqek jjyc ffdp`)
2. Ejecuta el servidor. Puedes cambiar el puerto estableciendo la variable `PORT`:
   ```bash
   PORT=3001 npm start   # usa otro valor si prefieres
   ```
3. Abre `http://localhost:3001` en tu navegador (sustituye 3001 si configuraste otro puerto).
   Las páginas cargan Bootstrap desde jsDelivr para que funcionen aun si no instalas nada adicional.

Para trabajar en Visual Studio Code:
1. Abre la carpeta del repositorio en VS Code.
2. Abre una terminal integrada con `Ctrl+` o `Terminal > New Terminal`.
3. Ejecuta `npm install` si es la primera vez.
4. Inicia el servidor con `PORT=3001 npm start` (o el puerto que prefieras).
5. Copia o haz clic en la URL que aparezca en la terminal para abrirla en tu navegador.
6. Detén el servidor con `Ctrl+C` cuando termines.

Para verificar el envío de correos puedes ejecutar:
```bash
npm test
```
Este test reemplaza el transporte de Nodemailer y confirma que la función de
envío se ejecuta correctamente.

## Docker

Puedes construir una imagen y ejecutar el servidor en un contenedor con:

```bash
docker build -t terraza .
docker run -p 3001:3001 terraza
```



También puedes levantar el proyecto con **docker-compose** usando el archivo
`docker-compose.yml` incluido:

```bash
docker compose up
```

De manera predeterminada expone el puerto `3001` y monta `reservations.json`
para que las reservas persistan. Establece `PORT` si quieres usar otro valor.

## Nginx y HTTPS

En producción suele colocarse un proxy inverso delante del contenedor. Un bloque
básico de Nginx para reenviar el tráfico al puerto configurado podría verse así:

```nginx
server {
    listen 80;
    server_name terraza.example.com;

    location / {
        proxy_pass http://localhost:3001; # usa el puerto que hayas expuesto
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Tras instalar `certbot` puedes activar un certificado SSL gratuito (Let's Encrypt)
y redirigir todas las peticiones a HTTPS con:

```bash
sudo certbot --nginx -d terraza.example.com --redirect
```

## Características

- **Inicio** (`index.html`): presentación de la banda.
- **Reservaciones** (`reservation.html`): calendario y formulario para enviar
 reservaciones. Los datos se almacenan en `reservations.json` y se envía un
  correo de confirmación usando Nodemailer.
- **Acceso miembros** (`login.html`): permite consultar las reservaciones
  almacenadas mediante un modal.

El servidor valida que los campos `name`, `email`, `phone`, `details` y `date`
estén presentes antes de registrar la reservación. El teléfono debe contener
exactamente diez dígitos. Además comprueba que no exista otra reservación en el
mismo horario (los eventos duran dos horas). Si hay conflicto se devuelve un
mensaje de error con código `400`.

Desde el panel de acceso para integrantes es posible confirmar o cancelar cada
reservación. Al cancelar una reserva el horario queda disponible nuevamente.

Para personalizar el envío de correos puedes establecer las variables de entorno
`SMTP_HOST`, `SMTP_USER` y `SMTP_PASS`. Si no las configuras se utilizarán los
valores mencionados anteriormente.

Bootstrap se carga desde jsDelivr y el código JavaScript está dividido en archivos específicos para cada
página (`public/js`).

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

// Serve static files from public and Bootstrap from node_modules
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));

const RES_FILE = path.join(__dirname, 'reservations.json');
function readReservations() {
  try { return JSON.parse(fs.readFileSync(RES_FILE)); } catch (e) { return []; }
}
function saveReservations(list) {
  fs.writeFileSync(RES_FILE, JSON.stringify(list, null, 2));
}

function hasConflict(list, dateStr) {
  const target = new Date(dateStr).getTime();
  const TWO_H = 2 * 60 * 60 * 1000;
  return list.some(r => r.status !== 'cancelled' && Math.abs(new Date(r.date).getTime() - target) < TWO_H);
}

// Configuración mejorada del email
async function createTransporter() {
  // USA LA CONTRASEÑA DE APLICACIÓN AQUÍ (no tu contraseña normal)
  const SMTP_USER = process.env.SMTP_USER || 'sneydersalazar205@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || 'gpyj wriy bjzu ukge'; // ← CAMBIA ESTO

  console.log('🔧 Configurando transporte SMTP...');
  console.log('📧 Usuario:', SMTP_USER);
  console.log('🔑 Contraseña configurada:', SMTP_PASS ? 'SÍ' : 'NO');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // Para desarrollo
    }
  });

  // Verificar la configuración
  try {
    await transporter.verify();
    console.log('✅ Servidor SMTP configurado correctamente');
    return transporter;
  } catch (error) {
    console.error('❌ Error configurando SMTP:', error);
    throw error;
  }
}

// Función mejorada para enviar email
async function sendMail(data) {
  try {
    console.log('📧 Preparando envío de email a:', data.email);
    
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"Terraza Roja" <sneydersalazar205@gmail.com>`,
      to: data.email,
      subject: '🎵 Confirmación de Reserva - Terraza Roja',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #dc3545, #b02a37); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .details { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0; }
            .footer { background: #343a40; color: white; padding: 20px; text-align: center; }
            .badge { background: #ffc107; color: #856404; padding: 5px 10px; border-radius: 15px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 Terraza Roja</h1>
              <h2>¡Reserva Recibida!</h2>
            </div>
            
            <div class="content">
              <p>Hola <strong>${data.name}</strong>,</p>
              
              <p>Hemos recibido tu solicitud de reserva exitosamente. Estos son los detalles:</p>
              
              <div class="details">
                <h3 style="color: #dc3545; margin-top: 0;">📅 Detalles de tu Reserva</h3>
                <p><strong>Fecha y Hora:</strong> ${new Date(data.date).toLocaleString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p><strong>Evento:</strong> ${data.details}</p>
                <p><strong>Teléfono:</strong> ${data.phone}</p>
                <p><strong>Estado:</strong> <span class="badge">⏳ Pendiente de Confirmación</span></p>
              </div>
              
              <p><strong>📞 Próximos Pasos:</strong></p>
              <p>Nos pondremos en contacto contigo en las próximas 24 horas para confirmar todos los detalles de tu evento.</p>
              
              <div style="background: #d4edda; padding: 15px; border-radius: 8px; border: 1px solid #c3e6cb;">
                <p style="margin: 0; color: #155724;">
                  <strong>💡 Importante:</strong><br>
                  Si necesitas hacer algún cambio en tu reserva, contáctanos respondiendo a este email.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">&copy; 2024 Terraza Roja. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">
                ¡Gracias por elegirnos para tu evento!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hola ${data.name},

¡Tu reserva en Terraza Roja ha sido recibida exitosamente!

📅 Detalles de tu Reserva:
Fecha y Hora: ${new Date(data.date).toLocaleString('es-ES')}
Evento: ${data.details}
Teléfono: ${data.phone}
Estado: ⏳ Pendiente de Confirmación

📞 Próximos Pasos:
Nos pondremos en contacto contigo en las próximas 24 horas para confirmar todos los detalles.

Si necesitas hacer algún cambio, contáctanos respondiendo a este email.

¡Gracias por elegir Terraza Roja!

🎵 Terraza Roja
"Vive los momentos y vive la vida"`
    };

    console.log('📨 Enviando email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente!');
    console.log('📧 Message ID:', info.messageId);
    console.log('👤 Enviado a:', data.email);
    
    return info;
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw new Error(`No se pudo enviar el email: ${error.message}`);
  }
}

// Endpoint mejorado para crear reservas
app.post('/api/reservations', async (req, res, next) => {
  try {
    const { name, email, phone, details, date } = req.body;
    
    console.log('📝 Recibiendo nueva reserva:', { name, email, phone, details, date });
    
    // Validaciones
    if (!name || !email || !phone || !details || !date) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Teléfono inválido. Debe tener 10 dígitos.' });
    }
    
    const list = readReservations();
    
    if (hasConflict(list, date)) {
      return res.status(400).json({ error: 'Horario no disponible. Ya existe una reserva en ese horario.' });
    }
    
    const item = { 
      id: Date.now(), 
      name, 
      email, 
      phone, 
      details, 
      date, 
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    list.push(item);
    saveReservations(list);
    
    console.log('✅ Reserva guardada localmente. ID:', item.id);
    
    // Intentar enviar email (pero no fallar la reserva si el email falla)
    let emailSent = false;
    try {
      await sendMail(item);
      emailSent = true;
      console.log('📧 Email de confirmación enviado exitosamente a:', email);
    } catch (emailError) {
      console.error('⚠️ Error enviando email, pero la reserva se guardó:', emailError.message);
      // No re-lanzamos el error para que la reserva se guarde igual
    }
    
    res.json({ 
      ok: true, 
      message: 'Reserva creada exitosamente',
      reservationId: item.id,
      emailSent: emailSent
    });
    
  } catch (err) {
    console.error('💥 Error en endpoint /api/reservations:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint to retrieve reservations
app.get('/api/reservations', (req, res) => {
  res.json(readReservations());
});

app.patch('/api/reservations/:id', (req, res) => {
  const list = readReservations();
  const id = Number(req.params.id);
  const item = list.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  if (req.body.status) item.status = req.body.status;
  saveReservations(list);
  res.json(item);
});

// Endpoint de prueba para emails
app.post('/api/test-email', async (req, res) => {
  try {
    const testData = {
      name: "Usuario de Prueba",
      email: "sneydersalazar205@gmail.com", // Cambia por tu email para pruebas
      phone: "1234567890",
      details: "Evento de prueba desde el servidor",
      date: new Date().toISOString()
    };

    console.log('🧪 Ejecutando prueba de email...');
    const result = await sendMail(testData);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server port
const PORT = process.env.PORT || 3001;

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = { app, sendMail, hasConflict };

if (require.main === module) {
  const server = app.listen(PORT, () => {
    const addr = server.address();
    const port = typeof addr === 'string' ? addr : addr.port;
    const host = typeof addr === 'object' && (addr.address === '::' || addr.address === '0.0.0.0')
      ? 'localhost'
      : addr.address || 'localhost';
    console.log(`🚀 Servidor ejecutándose en http://${host}:${port}`);
    console.log('📧 Sistema de emails configurado');
  });
}
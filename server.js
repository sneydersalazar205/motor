const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const RES_FILE = path.join(__dirname, 'reservations.json');
function readReservations() {
  try { return JSON.parse(fs.readFileSync(RES_FILE)); } catch (e) { return []; }
}
function saveReservations(list) {
  fs.writeFileSync(RES_FILE, JSON.stringify(list, null, 2));
}

// Endpoint to create a reservation and send confirmation email
// Create a reservation and send confirmation email
app.post('/api/reservations', async (req, res, next) => {
  try {
    const { name, email, details, date } = req.body;
    if (!name || !email || !details || !date) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    const list = readReservations();
    list.push({ name, email, details, date });
    saveReservations(list);
    try {
      await sendMail({ name, email, details, date });
    } catch (err) {
      console.error('Email error:', err.message);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Endpoint to retrieve reservations
app.get('/api/reservations', (req, res) => {
  res.json(readReservations());
});

async function sendMail(data) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Credenciales SMTP no configuradas');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `Terraza Roja <${SMTP_USER}>`,
    to: data.email,
    subject: 'Confirmación de Reservación',
    text: `Hola ${data.name}, hemos registrado tu evento para ${data.date}. Detalles: ${data.details}`,
  });
}

const PORT = process.env.PORT || 3000;

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = { app, sendMail };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve static files
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

const RES_FILE = path.join(__dirname, 'reservations.json');
function readReservations() {
  try { return JSON.parse(fs.readFileSync(RES_FILE)); } catch (e) { return []; }
}
function saveReservations(list) {
  fs.writeFileSync(RES_FILE, JSON.stringify(list, null, 2));
}

// Endpoint to create a reservation and send confirmation email
app.post('/api/reservations', async (req, res) => {
  const data = req.body;
  const list = readReservations();
  list.push(data);
  saveReservations(list);
  try {
    await sendMail(data);
  } catch (err) {
    console.error('Email error:', err.message);
  }
  res.json({ ok: true });
});

// Endpoint to retrieve reservations
app.get('/api/reservations', (req, res) => {
  res.json(readReservations());
});

async function sendMail(data) {
  // Configure transport via environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `Terraza Roja <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: 'Confirmación de Reservación',
    text: `Hola ${data.name}, hemos registrado tu evento para ${data.date}. Detalles: ${data.details}`,
  });
}

const PORT = process.env.PORT || 3000;

module.exports = { app, sendMail };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on https://terrazaroja.com:${PORT}`);
  });
}

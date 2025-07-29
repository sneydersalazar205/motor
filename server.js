const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

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

// Endpoint to create a reservation and send confirmation email
// Create a reservation and send confirmation email
app.post('/api/reservations', async (req, res, next) => {
  try {
    const { name, email, phone, details, date } = req.body;
    if (!name || !email || !phone || !details || !date) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }
    const list = readReservations();
    if (hasConflict(list, date)) {
      return res.status(400).json({ error: 'Horario no disponible' });
    }
    const item = { id: Date.now(), name, email, phone, details, date, status: 'pending' };
    list.push(item);
    saveReservations(list);
    try {
      await sendMail(item);
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

app.patch('/api/reservations/:id', (req, res) => {
  const list = readReservations();
  const id = Number(req.params.id);
  const item = list.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  if (req.body.status) item.status = req.body.status;
  saveReservations(list);
  res.json(item);
});

async function sendMail(data) {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
  const SMTP_PORT = process.env.SMTP_PORT || '587';
  const SMTP_USER = process.env.SMTP_USER || 'sneydersalazar205@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || 'ejxo rqek jjyc ffdp';

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

module.exports = { app, sendMail, hasConflict };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

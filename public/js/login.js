// Logic for login page
// Displays stored reservations in a modal after simple credential check

let calendar;
let modalCalendar;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const user = document.getElementById('username').value;
      const pass = document.getElementById('password').value;
      if (user === 'banda' && pass === 'musica') {
        loginForm.parentElement.style.display = 'none';
        loadDashboard();
      } else {
        alert('Credenciales incorrectas');
      }
    });
  }
});

async function loadDashboard() {
  try {
    const reservas = await fetch('/api/reservations').then(r => r.json());
    renderCalendar(reservas, 'calendar');
    renderCalendar(reservas, 'reservCalendar');
    renderReservas(reservas);
  } catch (err) {
    console.error(err);
  }
}

function renderCalendar(reservas, target) {
  const el = document.getElementById(target);
  if (!el) return;
  const events = reservas
    .filter(r => r.status !== 'cancelled')
    .map(r => ({
      start: r.date,
      display: 'background',
      backgroundColor: r.status === 'confirmed' ? 'red' : 'green'
    }));
  let instance = target === 'calendar' ? calendar : modalCalendar;
  if (!instance) {
    instance = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      events
    });
    instance.render();
    if (target === 'calendar') {
      calendar = instance;
    } else {
      modalCalendar = instance;
    }
  } else {
    instance.removeAllEvents();
    events.forEach(ev => instance.addEvent(ev));
  }
  if (target === 'calendar') {
    document.getElementById('calendarWrap').style.display = 'block';
  }
}

function renderReservas(reservas) {
  const body = reservas
    .filter(r => r.status !== 'cancelled')
    .map(r => `<div data-id="${r.id}" class="mb-3">
        <p><strong>${r.date}</strong> - ${r.name} (${r.email})<br>${r.details}<br>${r.phone}</p>
        <button class="btn btn-success btn-sm confirm">Confirmar</button>
        <button class="btn btn-danger btn-sm ms-2 cancel">Cancelar</button>
      </div>`)
    .join('') || 'No hay reservaciones';
  document.getElementById('reservDetails').innerHTML = body;
  document.querySelectorAll('#reservDetails .confirm').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.parentElement.getAttribute('data-id');
      await actualizar(id, 'confirmed');
      btn.textContent = '✓';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      loadDashboard();
    });
  });
  document.querySelectorAll('#reservDetails .cancel').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.parentElement.getAttribute('data-id');
      await actualizar(id, 'cancelled');
      loadDashboard();
    });
  });
  const modal = new bootstrap.Modal(document.getElementById('reservModal'));
  modal.show();
}

async function actualizar(id, status) {
  await fetch('/api/reservations/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

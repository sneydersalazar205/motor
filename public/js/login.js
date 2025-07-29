// Logic for login page
// Displays stored reservations in a modal after simple credential check

let calendar;

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
    renderCalendar(reservas);
    renderReservas(reservas);
  } catch (err) {
    console.error(err);
  }
}

function renderCalendar(reservas) {
  const el = document.getElementById('calendar');
  const events = reservas
    .filter(r => r.status !== 'cancelled')
    .map(r => ({
      start: r.date,
      display: 'background',
      backgroundColor: r.status === 'confirmed' ? 'red' : 'green'
    }));
  if (!calendar) {
    calendar = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      events
    });
    calendar.render();
  } else {
    calendar.removeAllEvents();
    events.forEach(ev => calendar.addEvent(ev));
  }
  document.getElementById('calendarWrap').style.display = 'block';
}

function renderReservas(reservas) {
  const body = reservas
    .map(r => {
      const statusBadge =
        r.status === 'confirmed'
          ? '<span class="badge bg-success">confirmado</span>'
          : r.status === 'cancelled'
          ? '<span class="badge bg-secondary">cancelado</span>'
          : '<span class="badge bg-warning text-dark">pendiente</span>';

      let confirmClass = 'btn-success';
      let confirmText = 'Confirmar';
      let confirmDisabled = '';
      if (r.status === 'confirmed') {
        confirmClass = 'btn-secondary';
        confirmText = 'Confirmado';
        confirmDisabled = 'disabled';
      } else if (r.status === 'cancelled') {
        confirmClass = 'btn-dark';
        confirmText = 'Cancelado';
        confirmDisabled = 'disabled';
      }

      const cancelDisabled = r.status === 'cancelled' ? 'disabled' : '';

      return `<div data-id="${r.id}" class="mb-3">
        <p><strong>${r.date}</strong> - ${r.name} (${r.email})<br>${r.details}<br>${r.phone}<br>Estado: ${statusBadge}</p>
        <button class="btn ${confirmClass} btn-sm confirm" ${confirmDisabled}>${confirmText}</button>
        <button class="btn btn-danger btn-sm ms-2 cancel" ${cancelDisabled}>Cancelar</button>
      </div>`;
    })
    .join('') || 'No hay reservaciones';
  document.getElementById('reservDetails').innerHTML = body;
  document.querySelectorAll('#reservDetails .confirm').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const id = btn.parentElement.getAttribute('data-id');
      await actualizar(id, 'confirmed');
      loadDashboard();
    });
  });
  document.querySelectorAll('#reservDetails .cancel').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
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
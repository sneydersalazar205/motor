// Logic for login page
// Displays stored reservations in a modal after simple credential check

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const user = document.getElementById('username').value;
      const pass = document.getElementById('password').value;
      if (user === 'banda' && pass === 'musica') {
        mostrarReservas();
      } else {
        alert('Credenciales incorrectas');
      }
    });
  }
});

function mostrarReservas() {
  fetch('/api/reservations')
    .then(r => r.json())
    .then(reservas => {
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
          mostrarReservas();
        });
      });
      document.querySelectorAll('#reservDetails .cancel').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.parentElement.getAttribute('data-id');
          await actualizar(id, 'cancelled');
          mostrarReservas();
        });
      });

      const modal = new bootstrap.Modal(document.getElementById('reservModal'));
      modal.show();
    })
    .catch(err => console.error(err));
}
async function actualizar(id, status) {
  await fetch('/api/reservations/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}


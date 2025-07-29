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
      const detalles = reservas.map(r => `<p><strong>${r.date}</strong> - ${r.name} (${r.email})<br>${r.details}</p>`).join('') || 'No hay reservaciones';
      document.getElementById('reservDetails').innerHTML = detalles;
      const modal = new bootstrap.Modal(document.getElementById('reservModal'));
      modal.show();
    })
    .catch(err => console.error(err));
}

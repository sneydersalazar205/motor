// Logic for reservation page
// Initializes FullCalendar and submits reservation data to the server

document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      dateClick: info => {
        document.getElementById('date').value = info.dateStr;
        alert('Fecha seleccionada: ' + info.dateStr);
      },
    });
    calendar.render();
  }

  const reservationForm = document.getElementById('reservationForm');
  if (reservationForm) {
    reservationForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        details: document.getElementById('details').value,
        date: document.getElementById('date').value,
      };
      try {
        // Envía los datos al servidor para guardar y enviar el correo
        await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        alert('Reservación guardada y correo enviado.');
        reservationForm.reset();
      } catch (err) {
        console.error(err);
        alert('Hubo un problema al guardar la reservación');
      }
    });
  }
});

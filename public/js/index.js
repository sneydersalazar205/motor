document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('bg-dark');
      document.body.classList.toggle('bg-light');
      document.body.classList.toggle('text-white');
      document.body.classList.toggle('text-dark');
    });
  }

  const form = document.getElementById('reservaForm');
  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      try {
        await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.nombre + ' ' + data.apellidos,
            email: data.correo,
            phone: data.telefono,
            details: data.evento + ' ' + (data.observaciones || ''),
            date: data.fecha + 'T' + data.hora,
          }),
        });
        alert('Reserva enviada con éxito a: ' + data.correo);
        bootstrap.Modal.getInstance(document.getElementById('reservaModal')).hide();
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Error al enviar la reserva.');
      }
    });
  }
});

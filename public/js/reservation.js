// Configuración de Supabase - REEMPLAZA CON TUS CREDENCIALES
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  let calendar;
  
  if (calendarEl) {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'es',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día'
      },
      dateClick: info => {
        document.getElementById('date').value = info.dateStr;
        // Mostrar notificación más elegante
        showNotification('Fecha seleccionada: ' + formatDate(info.dateStr), 'success');
      },
      events: async function(fetchInfo, successCallback, failureCallback) {
        try {
          const events = await loadEventsFromSupabase(fetchInfo.start, fetchInfo.end);
          successCallback(events);
        } catch (error) {
          console.error('Error loading events:', error);
          failureCallback(error);
        }
      }
    });
    calendar.render();
  }

  const reservationForm = document.getElementById('reservationForm');
  if (reservationForm) {
    reservationForm.addEventListener('submit', async e => {
      e.preventDefault();
      
      const dateValue = document.getElementById('date').value;
      const timeValue = document.getElementById('time').value;
      
      if (!dateValue) {
        showNotification('Por favor selecciona una fecha en el calendario', 'warning');
        return;
      }

      const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        details: document.getElementById('details').value,
        date: dateValue,
        time: timeValue,
        fecha_completa: dateValue + 'T' + timeValue
      };

      try {
        // Guardar en Supabase
        await saveReservationToSupabase(data);
        
        showNotification('Reservación guardada exitosamente. Te contactaremos pronto.', 'success');
        reservationForm.reset();
        document.getElementById('date').value = '';
        
        // Recargar eventos del calendario
        if (calendar) {
          calendar.refetchEvents();
        }
        
      } catch (err) {
        console.error('Error completo:', err);
        showNotification('Hubo un problema al guardar la reservación', 'error');
      }
    });
  }

  // Cargar eventos existentes al iniciar
  if (calendar) {
    calendar.refetchEvents();
  }
});

// Cargar eventos desde Supabase
async function loadEventsFromSupabase(start, end) {
  try {
    const { data: reservas, error } = await supabase
      .from('reservations')
      .select('*')
      .gte('fecha_completa', start.toISOString())
      .lte('fecha_completa', end.toISOString())
      .order('fecha_completa', { ascending: true });

    if (error) throw error;

    return reservas
      .filter(r => r.estado !== 'cancelada')
      .map(r => ({
        title: `${r.nombre} - ${r.evento || 'Evento'}`,
        start: r.fecha_completa,
        display: 'background',
        backgroundColor: getEventColor(r.estado),
        textColor: 'white',
        borderColor: getEventBorderColor(r.estado),
        extendedProps: {
          estado: r.estado,
          email: r.correo,
          telefono: r.telefono,
          detalles: r.observaciones
        }
      }));
      
  } catch (error) {
    console.error('Error cargando eventos:', error);
    return [];
  }
}

// Obtener color del evento según estado
function getEventColor(estado) {
  const colors = {
    'confirmada': '#28a745', // Verde
    'pendiente': '#ffc107',  // Amarillo
    'cancelada': '#6c757d'   // Gris
  };
  return colors[estado] || '#17a2b8'; // Azul por defecto
}

// Obtener color del borde
function getEventBorderColor(estado) {
  const colors = {
    'confirmada': '#218838',
    'pendiente': '#e0a800',
    'cancelada': '#545b62'
  };
  return colors[estado] || '#138496';
}

// Guardar reservación en Supabase
async function saveReservationToSupabase(data) {
  // Dividir el nombre en nombre y apellidos (si es posible)
  const nameParts = data.name.split(' ');
  const nombre = nameParts[0] || '';
  const apellidos = nameParts.slice(1).join(' ') || '';
  
  const reservationData = {
    nombre: nombre,
    apellidos: apellidos,
    correo: data.email,
    telefono: data.phone,
    evento: data.details,
    observaciones: '', // Puedes agregar un campo adicional si necesitas
    fecha: data.date,
    hora: data.time,
    fecha_completa: data.fecha_completa,
    estado: 'pendiente',
    tipo_tarifa: 'standard' // Puedes agregar selección de tarifa si quieres
  };

  const { data: result, error } = await supabase
    .from('reservations')
    .insert([reservationData])
    .select();

  if (error) {
    console.error('Error de Supabase:', error);
    throw error;
  }

  // Opcional: También enviar al backend tradicional si existe
  await sendToTraditionalBackend(data);
  
  return result;
}

// Mantener compatibilidad con backend tradicional
async function sendToTraditionalBackend(data) {
  try {
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        details: data.details,
        date: data.fecha_completa,
      }),
    });
  } catch (err) {
    console.error('Error enviando al backend tradicional:', err);
    // No lanzamos error para no afectar la experiencia del usuario
  }
}

// Mostrar notificaciones elegantes
function showNotification(message, type = 'info') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `alert alert-${getAlertType(type)} alert-dismissible fade show`;
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Agregar estilos para posición fija
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  
  // Insertar en el body
  document.body.appendChild(notification);
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Mapear tipos de notificación a clases de Bootstrap
function getAlertType(type) {
  const types = {
    'success': 'success',
    'error': 'danger',
    'warning': 'warning',
    'info': 'info'
  };
  return types[type] || 'info';
}

// Formatear fecha en español
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Función para verificar disponibilidad de fecha/hora
async function checkAvailability(date, time) {
  try {
    const fechaCompleta = date + 'T' + time;
    
    const { data: existingReservations, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('fecha_completa', fechaCompleta)
      .neq('estado', 'cancelada')
      .limit(1);

    if (error) throw error;

    return existingReservations.length === 0;
    
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    return true; // Por defecto permitir reserva si hay error
  }
}
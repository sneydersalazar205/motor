// Configuración de Supabase - REEMPLAZA CON TUS CREDENCIALES
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let calendar;
let modalCalendar;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const user = document.getElementById('username').value;
      const pass = document.getElementById('password').value;
      
      // Método 1: Login simple (manteniendo tu lógica original)
      if (user === 'banda' && pass === 'musica') {
        loginForm.parentElement.style.display = 'none';
        await loadDashboard();
      } 
      // Método 2: Login con Supabase (opcional)
      else {
        await loginWithSupabase(user, pass);
      }
    });
  }

  // Verificar si ya está autenticado
  checkExistingAuth();
});

// Login con Supabase
async function loginWithSupabase(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      // Si falla Supabase, intenta con el método tradicional
      if (email === 'banda' && password === 'musica') {
        document.getElementById('loginForm').parentElement.style.display = 'none';
        await loadDashboard();
      } else {
        alert('Credenciales incorrectas: ' + error.message);
      }
      return;
    }

    // Login exitoso con Supabase
    document.getElementById('loginForm').parentElement.style.display = 'none';
    await loadDashboard();
    
  } catch (err) {
    console.error('Error en login:', err);
    alert('Error al iniciar sesión');
  }
}

// Verificar autenticación existente
async function checkExistingAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Verificar si es admin
    const isAdmin = await verifyAdmin(user.id);
    if (isAdmin) {
      document.getElementById('loginForm').parentElement.style.display = 'none';
      await loadDashboard();
    }
  }
}

// Verificar si es administrador
async function verifyAdmin(userId) {
  const { data: user } = await supabase.auth.getUser();
  if (user.user && user.user.email) {
    const adminEmails = ['admin@terrazaroja.com', 'banda@terrazaroja.com']; // Agrega emails autorizados
    return adminEmails.includes(user.user.email.toLowerCase());
  }
  return false;
}

async function loadDashboard() {
  try {
    // Cargar reservas desde Supabase
    const reservas = await loadReservationsFromSupabase();
    renderCalendar(reservas, 'calendar');
    renderCalendar(reservas, 'reservCalendar');
    renderReservas(reservas);
    
    // Mostrar información del usuario
    showUserInfo();
    
  } catch (err) {
    console.error('Error cargando dashboard:', err);
    alert('Error al cargar las reservas');
  }
}

// Cargar reservas desde Supabase
async function loadReservationsFromSupabase() {
  const { data: reservas, error } = await supabase
    .from('reservations')
    .select('*')
    .order('fecha_completa', { ascending: false });

  if (error) {
    console.error('Error cargando reservas:', error);
    throw error;
  }

  // Convertir formato de Supabase a tu formato esperado
  return reservas.map(r => ({
    id: r.id,
    name: r.nombre + ' ' + r.apellidos,
    email: r.correo,
    phone: r.telefono,
    details: r.evento + (r.observaciones ? ' - ' + r.observaciones : ''),
    date: r.fecha_completa,
    status: mapStatusToEnglish(r.estado),
    tipo_tarifa: r.tipo_tarifa,
    fecha: r.fecha,
    hora: r.hora
  }));
}

// Mapear estados en español a inglés para compatibilidad
function mapStatusToEnglish(estado) {
  const statusMap = {
    'pendiente': 'pending',
    'confirmada': 'confirmed',
    'cancelada': 'cancelled'
  };
  return statusMap[estado] || 'pending';
}

// Mapear estados en inglés a español para Supabase
function mapStatusToSpanish(status) {
  const statusMap = {
    'pending': 'pendiente',
    'confirmed': 'confirmada',
    'cancelled': 'cancelada'
  };
  return statusMap[status] || 'pendiente';
}

function renderCalendar(reservas, target) {
  const el = document.getElementById(target);
  if (!el) return;
  
  const events = reservas
    .filter(r => r.status !== 'cancelled')
    .map(r => ({
      title: `${r.name} - ${r.tipo_tarifa || 'Evento'}`,
      start: r.date,
      display: 'background',
      backgroundColor: r.status === 'confirmed' ? '#28a745' : '#ffc107', // Verde para confirmado, Amarillo para pendiente
      textColor: r.status === 'confirmed' ? 'white' : 'black',
      borderColor: r.status === 'confirmed' ? '#218838' : '#e0a800',
      extendedProps: {
        details: r.details,
        email: r.email,
        phone: r.phone,
        status: r.status
      }
    }));

  let instance = target === 'calendar' ? calendar : modalCalendar;
  
  if (!instance) {
    instance = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      events: events,
      eventClick: function(info) {
        showEventDetails(info.event);
      },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      locale: 'es',
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día'
      }
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

// Mostrar detalles del evento al hacer clic
function showEventDetails(event) {
  const eventData = event.extendedProps;
  const detailsHtml = `
    <div class="alert alert-info">
      <h6>${event.title}</h6>
      <p><strong>Fecha:</strong> ${event.start.toLocaleString()}</p>
      <p><strong>Estado:</strong> <span class="badge bg-${eventData.status === 'confirmed' ? 'success' : 'warning'}">${eventData.status}</span></p>
      <p><strong>Detalles:</strong> ${eventData.details}</p>
      <p><strong>Email:</strong> ${eventData.email}</p>
      <p><strong>Teléfono:</strong> ${eventData.phone}</p>
    </div>
  `;
  
  document.getElementById('reservDetails').innerHTML = detailsHtml;
  const modal = new bootstrap.Modal(document.getElementById('reservModal'));
  modal.show();
}

function renderReservas(reservas) {
  const body = reservas
    .map(r => {
      const statusBadge =
        r.status === 'confirmed'
          ? '<span class="badge bg-success">Confirmado</span>'
          : r.status === 'cancelled'
          ? '<span class="badge bg-secondary">Cancelado</span>'
          : '<span class="badge bg-warning text-dark">Pendiente</span>';

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

      return `<div data-id="${r.id}" class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">${r.name}</h6>
          <p class="card-text mb-1">
            <strong>📅 Fecha:</strong> ${new Date(r.date).toLocaleString('es-ES')}<br>
            <strong>📧 Email:</strong> ${r.email}<br>
            <strong>📞 Teléfono:</strong> ${r.phone}<br>
            <strong>🎵 Evento:</strong> ${r.details}<br>
            <strong>💰 Tarifa:</strong> ${r.tipo_tarifa || 'No especificada'}<br>
            <strong>Estado:</strong> ${statusBadge}
          </p>
          <div class="mt-2">
            <button class="btn ${confirmClass} btn-sm confirm" ${confirmDisabled}>${confirmText}</button>
            <button class="btn btn-danger btn-sm ms-2 cancel" ${cancelDisabled}>Cancelar</button>
          </div>
        </div>
      </div>`;
    })
    .join('') || '<p class="text-muted">No hay reservaciones pendientes.</p>';
  
  document.getElementById('reservDetails').innerHTML = body;
  
  // Event listeners para los botones
  document.querySelectorAll('#reservDetails .confirm').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const id = btn.parentElement.parentElement.getAttribute('data-id');
      await actualizarReserva(id, 'confirmed');
      await loadDashboard();
    });
  });
  
  document.querySelectorAll('#reservDetails .cancel').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const id = btn.parentElement.parentElement.getAttribute('data-id');
      await actualizarReserva(id, 'cancelled');
      await loadDashboard();
    });
  });
  
  // Mostrar modal automáticamente
  const modal = new bootstrap.Modal(document.getElementById('reservModal'));
  modal.show();
}

// Actualizar reserva en Supabase
async function actualizarReserva(id, status) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ 
        estado: mapStatusToSpanish(status),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    alert(`Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'} correctamente`);
    
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    alert('Error al actualizar la reserva');
  }
}

// Mostrar información del usuario
async function showUserInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Crear barra de usuario si no existe
    if (!document.getElementById('user-info-bar')) {
      const userBar = document.createElement('div');
      userBar.id = 'user-info-bar';
      userBar.className = 'bg-dark text-white p-2';
      userBar.innerHTML = `
        <div class="container d-flex justify-content-between align-items-center">
          <span>👤 Conectado como: ${user.email}</span>
          <button id="logout-btn" class="btn btn-outline-light btn-sm">Cerrar Sesión</button>
        </div>
      `;
      
      // Insertar después del nav
      const nav = document.querySelector('nav');
      nav.parentNode.insertBefore(userBar, nav.nextSibling);
      
      // Event listener para logout
      document.getElementById('logout-btn').addEventListener('click', logoutUser);
    }
  }
}

// Cerrar sesión
async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error cerrando sesión:', error);
  } else {
    window.location.reload(); // Recargar para volver al login
  }
}

// Escuchar cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.reload();
  }
});
// Configuración de Supabase - REEMPLAZA CON TUS PROPIAS CREDENCIALES
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // Toggle de tema
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('bg-dark');
      document.body.classList.toggle('bg-light');
      document.body.classList.toggle('text-white');
      document.body.classList.toggle('text-dark');
      
      // Guardar preferencia del tema si el usuario está logueado
      saveThemePreference();
    });
  }

  // Configurar botones de tarifas
  setupTarifaButtons();

  // Formulario de reservas (actualizado con Supabase)
  const form = document.getElementById('reservaForm');
  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      
      try {
        // Guardar en Supabase
        const { data: reservation, error } = await supabase
          .from('reservations')
          .insert([
            {
              nombre: data.nombre,
              apellidos: data.apellidos,
              correo: data.correo,
              telefono: data.telefono,
              evento: data.evento,
              observaciones: data.observaciones || '',
              fecha: data.fecha,
              hora: data.hora,
              fecha_completa: data.fecha + 'T' + data.hora,
              estado: 'pendiente',
              tipo_tarifa: data.tarifa || 'basico'
            }
          ])
          .select();

        if (error) {
          console.error('Error de Supabase:', error);
          throw error;
        }

        // Éxito - mostrar alerta y limpiar formulario
        alert('Reserva enviada con éxito a: ' + data.correo);
        bootstrap.Modal.getInstance(document.getElementById('reservaModal')).hide();
        form.reset();

        // Opcional: También enviar al backend tradicional si existe
        await sendToBackend(data);

      } catch (err) {
        console.error('Error completo:', err);
        alert('Error al enviar la reserva. Por favor, intenta nuevamente.');
      }
    });
  }

  // Cargar reservas si es administrador
  checkAdminAccess();

  // Inicializar funcionalidades adicionales
  initializeApp();
});

// Configurar botones de tarifas para actualizar el modal
function setupTarifaButtons() {
  const tarifaButtons = document.querySelectorAll('[data-tarifa]');
  tarifaButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tarifa = button.getAttribute('data-tarifa');
      const tarifaInput = document.getElementById('tarifaSeleccionada');
      const modalTitle = document.getElementById('modalTarifaTitle');
      
      if (tarifaInput) tarifaInput.value = tarifa;
      
      // Actualizar título del modal según la tarifa
      if (modalTitle) {
        const tarifas = {
          'basico': 'Reservar - Tarifa Básica',
          'intermedio': 'Reservar - Tarifa Intermedia',
          'premium': 'Reservar - Tarifa Premium'
        };
        modalTitle.textContent = tarifas[tarifa] || 'Reservar Banda';
      }
    });
  });
}

// Función para guardar preferencia del tema
async function saveThemePreference() {
  const user = await getCurrentUser();
  if (user) {
    const isDarkMode = document.body.classList.contains('bg-dark');
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        dark_mode: isDarkMode,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) console.error('Error guardando preferencia:', error);
  }
}

// Función para cargar preferencia del tema
async function loadThemePreference() {
  const user = await getCurrentUser();
  if (user) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('dark_mode')
      .eq('user_id', user.id)
      .single();
    
    if (data && data.dark_mode) {
      document.body.classList.add('bg-dark', 'text-white');
      document.body.classList.remove('bg-light', 'text-dark');
    }
  }
}

// Obtener usuario actual
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Verificar acceso de administrador
async function checkAdminAccess() {
  const user = await getCurrentUser();
  if (user) {
    // Verificar si el usuario es admin
    const isAdmin = await verifyAdmin(user.id);
    if (isAdmin) {
      showAdminPanel();
      loadReservations();
    }
  }
}

// Verificar si el usuario es administrador
async function verifyAdmin(userId) {
  // Método 1: Verificar por email específico
  const { data: user } = await supabase.auth.getUser();
  if (user.user && user.user.email) {
    const adminEmails = ['admin@terrazaroja.com', 'tu-email@admin.com']; // Agrega emails autorizados
    return adminEmails.includes(user.user.email.toLowerCase());
  }
  
  // Método 2: Verificar en tabla de administradores (si la tienes)
  /*
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
  */
  
  return false;
}

// Mostrar panel de administración
function showAdminPanel() {
  // Crear panel de admin si no existe
  if (!document.getElementById('admin-panel')) {
    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.className = 'container mt-4 p-3 bg-warning rounded';
    adminPanel.innerHTML = `
      <h3 class="text-dark">🔧 Panel de Administración</h3>
      <div class="mb-3">
        <button id="load-reservations-btn" class="btn btn-dark btn-sm">Cargar Reservas</button>
        <button id="logout-admin-btn" class="btn btn-outline-dark btn-sm ms-2">Cerrar Sesión</button>
      </div>
      <div id="reservations-list" class="mt-3">
        <p class="text-muted">Haz clic en "Cargar Reservas" para ver las reservas.</p>
      </div>
    `;
    
    // Insertar después de la navegación
    const nav = document.querySelector('nav');
    nav.parentNode.insertBefore(adminPanel, nav.nextSibling);
    
    // Event listeners para el panel
    document.getElementById('load-reservations-btn').addEventListener('click', loadReservations);
    document.getElementById('logout-admin-btn').addEventListener('click', logoutAdmin);
  }
}

// Cargar y mostrar reservas
async function loadReservations() {
  try {
    const reservationsList = document.getElementById('reservations-list');
    reservationsList.innerHTML = '<p>Cargando reservas...</p>';
    
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .order('fecha_completa', { ascending: false });

    if (error) throw error;

    if (reservations.length === 0) {
      reservationsList.innerHTML = '<p class="text-muted">No hay reservas pendientes.</p>';
      return;
    }

    reservationsList.innerHTML = reservations.map(reserva => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title">${reserva.nombre} ${reserva.apellidos}</h5>
              <p class="card-text mb-1">
                <strong>📧 Email:</strong> ${reserva.correo}<br>
                <strong>📞 Teléfono:</strong> ${reserva.telefono}<br>
                <strong>🎵 Evento:</strong> ${reserva.evento}<br>
                <strong>📅 Fecha:</strong> ${reserva.fecha} ${reserva.hora}<br>
                <strong>💰 Tarifa:</strong> ${reserva.tipo_tarifa || 'No especificada'}<br>
                <strong>📝 Observaciones:</strong> ${reserva.observaciones || 'Ninguna'}
              </p>
            </div>
            <div>
              <span class="badge bg-${getStatusBadgeColor(reserva.estado)}">${reserva.estado}</span>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-success btn-sm" onclick="updateReservationStatus('${reserva.id}', 'confirmada')">
              ✅ Confirmar
            </button>
            <button class="btn btn-warning btn-sm" onclick="updateReservationStatus('${reserva.id}', 'pendiente')">
              ⏳ Pendiente
            </button>
            <button class="btn btn-danger btn-sm" onclick="updateReservationStatus('${reserva.id}', 'cancelada')">
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error cargando reservas:', error);
    document.getElementById('reservations-list').innerHTML = 
      '<p class="text-danger">Error al cargar las reservas.</p>';
  }
}

// Actualizar estado de reserva
async function updateReservationStatus(reservationId, newStatus) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ 
        estado: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (error) throw error;

    alert(`Reserva actualizada a: ${newStatus}`);
    loadReservations(); // Recargar la lista
    
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    alert('Error al actualizar el estado');
  }
}

// Cerrar sesión de administrador
async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error cerrando sesión:', error);
  } else {
    document.getElementById('admin-panel').remove();
    alert('Sesión cerrada correctamente');
  }
}

// Función auxiliar para color de badges
function getStatusBadgeColor(status) {
  const colors = {
    'pendiente': 'warning',
    'confirmada': 'success',
    'cancelada': 'danger'
  };
  return colors[status] || 'secondary';
}

// Mantener tu función original para el backend tradicional
async function sendToBackend(data) {
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
  } catch (err) {
    console.error('Error enviando al backend tradicional:', err);
  }
}

// Inicializar la aplicación
function initializeApp() {
  // Cargar preferencias de tema si el usuario está logueado
  loadThemePreference();
  
  // Escuchar cambios de autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      checkAdminAccess();
      loadThemePreference();
    } else if (event === 'SIGNED_OUT') {
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.remove();
    }
  });
}

// Hacer funciones globales para los botones
window.updateReservationStatus = updateReservationStatus;
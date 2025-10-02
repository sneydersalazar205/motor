// Configuración de Supabase
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';

// ==============================================
// VERIFICACIÓN DE CARGA DE SUPABASE
// ==============================================

// Verificar que Supabase esté cargado
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase no está cargado');
    // Intentar cargar la biblioteca si está disponible
    if (typeof createClient !== 'undefined') {
        window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase inicializado con createClient');
    } else {
        console.error('💥 createClient no está disponible');
        // Mostrar error al usuario
        document.addEventListener('DOMContentLoaded', function() {
            const loginContainer = document.querySelector('.login-container');
            if (loginContainer) {
                loginContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h4>❌ Error de Configuración</h4>
                        <p>No se pudo cargar el sistema de autenticación. Por favor, recarga la página.</p>
                        <button onclick="window.location.reload()" class="btn btn-warning">🔄 Recargar Página</button>
                    </div>
                `;
            }
        });
        throw new Error('Supabase no está disponible');
    }
}

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let calendar;
let modalCalendar;
let allReservations = [];

// ==============================================
// INICIALIZACIÓN
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando sistema de login...');
  
  // Verificar autenticación existente al cargar la página
  checkExistingAuth();
  
  // Configurar el formulario de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Configurar formulario de registro
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }

  // Validación de contraseñas en tiempo real
  const passwordInput = document.getElementById('reg-password');
  const confirmPasswordInput = document.getElementById('reg-confirm-password');
  
  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', validatePasswords);
  }
});

// ==============================================
// FUNCIONES DE AUTENTICACIÓN
// ==============================================

// Manejar el envío del formulario de login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const messagesDiv = document.getElementById('login-messages');
  
  // Validaciones básicas
  if (!email || !password) {
    showMessage('⚠️ Por favor, completa todos los campos', 'warning', messagesDiv);
    return;
  }
  
  if (!isValidEmail(email)) {
    showMessage('📧 Por favor, ingresa un email válido', 'warning', messagesDiv);
    return;
  }
  
  // Mostrar estado de carga
  showLoadingState(true);
  showMessage('🔐 Conectando con el sistema...', 'info', messagesDiv);
  
  try {
    // Intentar login con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('❌ Error de autenticación:', error);
      
      // Verificar si es un error de credenciales
      if (error.message.includes('Invalid login credentials')) {
        showMessage('❌ Credenciales incorrectas. Verifica tu email y contraseña.', 'danger', messagesDiv);
      } else if (error.message.includes('Email not confirmed')) {
        showMessage('📧 Por favor, verifica tu email antes de iniciar sesión.', 'warning', messagesDiv);
      } else {
        showMessage('❌ Error de conexión: ' + error.message, 'danger', messagesDiv);
      }
      return;
    }

    // ✅ Login exitoso
    console.log('✅ Login exitoso:', data.user.email);
    showMessage('✅ ¡Bienvenido! Cargando dashboard...', 'success', messagesDiv);
    
    // Esperar un momento para mostrar el mensaje de éxito
    setTimeout(async () => {
      await handleSuccessfulLogin(data.user);
    }, 1000);
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
    showMessage('💥 Error inesperado: ' + error.message, 'danger', messagesDiv);
  } finally {
    showLoadingState(false);
  }
}

// Verificar autenticación existente
async function checkExistingAuth() {
  try {
    console.log('🔍 Verificando autenticación existente...');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error obteniendo usuario:', error);
      return;
    }
    
    if (user) {
      console.log('✅ Usuario ya autenticado:', user.email);
      await handleSuccessfulLogin(user);
    } else {
      console.log('ℹ️ No hay usuario autenticado');
    }
  } catch (error) {
    console.error('Error en checkExistingAuth:', error);
  }
}

// Manejar login exitoso
async function handleSuccessfulLogin(user) {
  try {
    // Ocultar formulario de login
    document.querySelector('.login-container').style.display = 'none';
    
    // Mostrar información del usuario
    await showUserInfo(user);
    
    // Configurar gestión de usuarios si es admin
    setupUserManagement(user);
    
    // Cargar el dashboard
    await loadDashboard();
    
  } catch (error) {
    console.error('Error en handleSuccessfulLogin:', error);
    showMessage('Error al cargar el dashboard: ' + error.message, 'danger');
  }
}

// Mostrar información del usuario
async function showUserInfo(user) {
  try {
    const userBar = document.getElementById('user-info-bar');
    const userEmail = document.getElementById('user-email');
    
    if (userBar && userEmail) {
      userEmail.textContent = user.email;
      userBar.style.display = 'block';
      
      // Configurar el botón de logout
      document.getElementById('logout-btn').addEventListener('click', logoutUser);
    }
  } catch (error) {
    console.error('Error mostrando info usuario:', error);
  }
}

// Cerrar sesión
async function logoutUser() {
  try {
    showNotification('👋 Cerrando sesión...', 'info');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Recargar página para volver al login
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error);
    showNotification('❌ Error al cerrar sesión: ' + error.message, 'danger');
  }
}

// ==============================================
// FUNCIONES DEL DASHBOARD
// ==============================================

// Cargar dashboard principal
async function loadDashboard() {
  try {
    console.log('📊 Cargando dashboard...');
    
    // Mostrar dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.style.display = 'block';
    }
    
    // Cargar datos iniciales
    await loadDashboardData();
    
  } catch (err) {
    console.error('❌ Error cargando dashboard:', err);
    showNotification('Error al cargar el dashboard: ' + err.message, 'error');
  }
}

async function loadDashboardData() {
  try {
    // Cargar reservas desde Supabase
    const reservas = await loadReservationsFromSupabase();
    allReservations = reservas;
    
    // Actualizar estadísticas
    updateStatistics(reservas);
    
    // Actualizar últimos eventos
    updateUpcomingEvents(reservas);
    
    // Renderizar calendarios
    renderCalendar(reservas, 'calendar');
    
    // Actualizar timestamp
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = new Date().toLocaleTimeString('es-ES');
    }
    
    console.log('✅ Dashboard actualizado');
    
  } catch (error) {
    console.error('❌ Error actualizando dashboard:', error);
  }
}

// Cargar reservas desde Supabase
// Cargar reservas desde Supabase - VERSIÓN DEBUG
async function loadReservationsFromSupabase() {
    try {
        console.log('📥 Cargando reservas desde Supabase...');
        
        // 1. Primero verifiquemos la conexión a Supabase
        const { data: authData, error: authError } = await supabase.auth.getSession();
        console.log('🔐 Estado de autenticación:', authData);
        
        if (authError) {
            console.error('❌ Error de autenticación:', authError);
        }

        // 2. Intentar cargar las reservas
        const { data: reservas, error, status, statusText } = await supabase
            .from('reservations')
            .select('*')
            .order('fecha_completa', { ascending: false });

        console.log('📊 Respuesta de Supabase:', {
            status: status,
            statusText: statusText,
            error: error,
            dataLength: reservas ? reservas.length : 0
        });

        if (error) {
            console.error('❌ Error DETAILED cargando reservas:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            
            // Mostrar error específico al usuario
            if (error.code === 'PGRST301') {
                showNotification('❌ Error: No tienes permisos para ver las reservas', 'error');
            } else if (error.code === '42P01') {
                showNotification('❌ Error: La tabla "reservations" no existe', 'error');
            } else {
                showNotification('❌ Error al cargar reservas: ' + error.message, 'error');
            }
            
            return [];
        }

        console.log(`✅ ${reservas.length} reservas cargadas exitosamente`);

        // Convertir formato de Supabase a formato esperado
        return reservas.map(r => ({
            id: r.id,
            name: `${r.nombre} ${r.apellidos}`,
            email: r.correo,
            phone: r.telefono,
            details: r.evento + (r.observaciones ? ' - ' + r.observaciones : ''),
            date: r.fecha_completa,
            status: mapStatusToEnglish(r.estado),
            tipo_tarifa: r.tipo_tarifa,
            fecha: r.fecha,
            hora: r.hora,
            observaciones: r.observaciones,
            created_at: r.created_at
        }));
        
    } catch (error) {
        console.error('💥 Error CATCH en loadReservationsFromSupabase:', error);
        showNotification('💥 Error crítico al cargar reservas', 'error');
        return [];
    }
}
// Función para probar la conexión con Supabase
async function testSupabaseConnection() {
    try {
        console.log('🧪 Probando conexión con Supabase...');
        
        // Test 1: Verificar autenticación
        const { data: authData, error: authError } = await supabase.auth.getSession();
        console.log('🔐 Test Auth:', authError ? 'FAILED' : 'SUCCESS', authData);
        
        // Test 2: Verificar si podemos acceder a la base de datos
        const { data: testData, error: testError } = await supabase
            .from('reservations')
            .select('id')
            .limit(1);
            
        console.log('🔍 Test DB Access:', testError ? 'FAILED' : 'SUCCESS', testError);
        
        // Test 3: Listar todas las tablas disponibles (usando una consulta segura)
        const { data: tablesData, error: tablesError } = await supabase
            .from('reservations')
            .select('*')
            .limit(0);
            
        console.log('📋 Test Tables:', tablesError ? 'FAILED' : 'SUCCESS');
        
        return {
            auth: !authError,
            db: !testError,
            tables: !tablesError
        };
        
    } catch (error) {
        console.error('💥 Error en testSupabaseConnection:', error);
        return { auth: false, db: false, tables: false };
    }
}
async function loadDashboardData() {
    try {
        console.log('📊 Cargando datos del dashboard...');
        
        // Primero probar la conexión
        const connectionTest = await testSupabaseConnection();
        console.log('📡 Resultado prueba conexión:', connectionTest);
        
        if (!connectionTest.db) {
            showNotification('❌ No se puede conectar a la base de datos', 'error');
            return;
        }
        
        // Cargar reservas desde Supabase
        const reservas = await loadReservationsFromSupabase();
        allReservations = reservas;
        
        console.log('📋 Reservas cargadas:', reservas.length);
        
        // Actualizar estadísticas
        updateStatistics(reservas);
        
        // Actualizar últimos eventos
        updateUpcomingEvents(reservas);
        
        // Renderizar calendarios
        renderCalendar(reservas, 'calendar');
        
        // Actualizar timestamp
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('es-ES');
        }
        
        console.log('✅ Dashboard actualizado correctamente');
        
    } catch (error) {
        console.error('❌ Error actualizando dashboard:', error);
        showNotification('❌ Error al cargar el dashboard: ' + error.message, 'error');
    }
}
// Actualizar estadísticas
function updateStatistics(reservas) {
  const total = reservas.length;
  const pendientes = reservas.filter(r => r.status === 'pending').length;
  const confirmadas = reservas.filter(r => r.status === 'confirmed').length;
  const canceladas = reservas.filter(r => r.status === 'cancelled').length;
  
  // Actualizar contadores con animación
  animateCounter('total-reservas', total);
  animateCounter('reservas-pendientes', pendientes);
  animateCounter('reservas-confirmadas', confirmadas);
  animateCounter('reservas-canceladas', canceladas);
}

function animateCounter(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const currentValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const steps = 60;
  const stepValue = (targetValue - currentValue) / steps;
  let currentStep = 0;

  const timer = setInterval(() => {
    currentStep++;
    const newValue = Math.round(currentValue + (stepValue * currentStep));
    element.textContent = newValue;
    
    if (currentStep >= steps) {
      element.textContent = targetValue;
      clearInterval(timer);
    }
  }, duration / steps);
}

function updateUpcomingEvents(reservas) {
  const upcomingContainer = document.getElementById('upcoming-events');
  if (!upcomingContainer) return;
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingEvents = reservas
    .filter(r => {
      const eventDate = new Date(r.date);
      return eventDate >= now && eventDate <= nextWeek && r.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  if (upcomingEvents.length === 0) {
    upcomingContainer.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted">No hay eventos programados para los próximos 7 días</p>
      </div>
    `;
    return;
  }

  upcomingContainer.innerHTML = upcomingEvents.map(event => `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="card upcoming-event-card h-100">
        <div class="card-body">
          <h6 class="card-title">${event.name}</h6>
          <p class="card-text small mb-1">
            <strong>📅:</strong> ${new Date(event.date).toLocaleDateString('es-ES')}<br>
            <strong>⏰:</strong> ${event.hora}<br>
            <strong>📞:</strong> ${event.phone}<br>
            <strong>💰:</strong> ${event.tipo_tarifa || 'Standard'}
          </p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-${getStatusBadgeColor(event.status)} event-badge">
              ${event.status === 'confirmed' ? '✅ Confirmado' : 
                event.status === 'pending' ? '⏳ Pendiente' : '❌ Cancelado'}
            </span>
            <button class="btn btn-sm btn-outline-primary" 
                    onclick="showEventDetailsModal('${event.id}')">
              Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ==============================================
// FUNCIONES DEL CALENDARIO
// ==============================================

// Renderizar calendarios
function renderCalendar(reservas, target) {
  const el = document.getElementById(target);
  if (!el) {
    console.warn(`⚠️ Elemento #${target} no encontrado`);
    return;
  }
  
  const events = reservas.map(r => ({
    title: `${r.name} - ${r.tipo_tarifa || 'Evento'}`,
    start: r.date,
    display: 'background',
    backgroundColor: getEventColor(r.status),
    textColor: 'white',
    borderColor: getEventBorderColor(r.status),
    extendedProps: {
      details: r.details,
      email: r.email,
      phone: r.phone,
      status: r.status,
      tipo_tarifa: r.tipo_tarifa
    },
    classNames: [`event-${r.status}`]
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
      },
      height: target === 'calendar' ? 'auto' : 400
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
}

// ==============================================
// FUNCIONES DE LOS BOTONES DEL DASHBOARD
// ==============================================

// Función para cambiar vista del calendario
function changeView(viewType) {
  if (calendar) {
    calendar.changeView(viewType);
    showNotification(`Vista cambiada a: ${viewType}`, 'success');
  }
}

// Función para exportar calendario
function exportCalendar() {
  try {
    if (allReservations.length === 0) {
      showNotification('ℹ️ No hay reservas para exportar', 'info');
      return;
    }

    let calendarContent = "CALENDARIO TERRAZA ROJA\n";
    calendarContent += "=======================\n\n";
    
    allReservations.forEach(reserva => {
      const fecha = new Date(reserva.date).toLocaleDateString('es-ES');
      calendarContent += `📅 ${fecha} ${reserva.hora} - ${reserva.name}\n`;
      calendarContent += `   📧 ${reserva.email} | 📞 ${reserva.phone}\n`;
      calendarContent += `   🎵 ${reserva.details}\n`;
      calendarContent += `   Estado: ${mapStatusToSpanish(reserva.status)} | Tarifa: ${reserva.tipo_tarifa}\n`;
      calendarContent += "   " + "=".repeat(40) + "\n";
    });

    const blob = new Blob([calendarContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calendario-terraza-roja-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('📅 Calendario exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exportando calendario:', error);
    showNotification('❌ Error al exportar el calendario', 'error');
  }
}

// Función para exportar datos
function exportData() {
  try {
    if (allReservations.length === 0) {
      showNotification('ℹ️ No hay datos para exportar', 'info');
      return;
    }

    const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha', 'Hora', 'Estado', 'Tarifa', 'Evento', 'Observaciones'];
    const csvData = allReservations.map(reserva => [
      `"${reserva.name}"`,
      `"${reserva.email}"`,
      `"${reserva.phone}"`,
      `"${reserva.fecha}"`,
      `"${reserva.hora}"`,
      `"${mapStatusToSpanish(reserva.status)}"`,
      `"${reserva.tipo_tarifa}"`,
      `"${reserva.details}"`,
      `"${reserva.observaciones || ''}"`
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-reservas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('📊 Reporte exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exportando datos:', error);
    showNotification('❌ Error al exportar el reporte', 'error');
  }
}

// Función para confirmar todas las pendientes
async function quickConfirmAll() {
  const pendingReservations = allReservations.filter(r => r.status === 'pending');
  
  if (pendingReservations.length === 0) {
    showNotification('ℹ️ No hay reservas pendientes para confirmar', 'info');
    return;
  }
  
  if (!confirm(`¿Estás seguro de que quieres confirmar TODAS las ${pendingReservations.length} reservas pendientes?`)) {
    return;
  }
  
  showNotification(`🔄 Confirmando ${pendingReservations.length} reservas pendientes...`, 'info');
  
  try {
    let confirmedCount = 0;
    
    for (const reservation of pendingReservations) {
      try {
        await actualizarReserva(reservation.id, 'confirmed');
        confirmedCount++;
      } catch (error) {
        console.error(`Error confirmando reserva ${reservation.id}:`, error);
      }
    }
    
    showNotification(`✅ ${confirmedCount}/${pendingReservations.length} reservas confirmadas exitosamente`, 'success');
    
    // Recargar dashboard
    setTimeout(() => {
      loadDashboard();
    }, 2000);
    
  } catch (error) {
    console.error('Error en confirmación masiva:', error);
    showNotification('❌ Error al confirmar las reservas', 'error');
  }
}

// Función para limpiar reservas antiguas
async function clearOldReservations() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  
  const oldReservations = allReservations.filter(r => {
    const eventDate = new Date(r.date);
    return eventDate < threeMonthsAgo && r.status !== 'cancelled';
  });
  
  if (oldReservations.length === 0) {
    showNotification('ℹ️ No hay reservas antiguas (más de 3 meses) para limpiar', 'info');
    return;
  }
  
  if (!confirm(`¿Estás seguro de que quieres cancelar ${oldReservations.length} reservas antiguas (anteriores a ${threeMonthsAgo.toLocaleDateString('es-ES')})?`)) {
    return;
  }
  
  showNotification(`🗑️ Cancelando ${oldReservations.length} reservas antiguas...`, 'info');
  
  try {
    let cancelledCount = 0;
    
    for (const reservation of oldReservations) {
      try {
        await actualizarReserva(reservation.id, 'cancelled');
        cancelledCount++;
      } catch (error) {
        console.error(`Error cancelando reserva ${reservation.id}:`, error);
      }
    }
    
    showNotification(`✅ ${cancelledCount}/${oldReservations.length} reservas antiguas canceladas`, 'success');
    
    // Recargar dashboard
    setTimeout(() => {
      loadDashboard();
    }, 2000);
    
  } catch (error) {
    console.error('Error en limpieza masiva:', error);
    showNotification('❌ Error al cancelar reservas antiguas', 'error');
  }
}

// Función para aplicar filtros
function applyFilters() {
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  const tarifaFilter = document.getElementById('filter-tarifa')?.value || 'all';
  const dateFilter = document.getElementById('filter-date')?.value || 'all';
  
  let filteredReservations = allReservations;
  
  // Aplicar filtro de estado
  if (statusFilter !== 'all') {
    filteredReservations = filteredReservations.filter(r => 
      r.status === mapStatusToEnglish(statusFilter)
    );
  }
  
  // Aplicar filtro de tarifa
  if (tarifaFilter !== 'all') {
    filteredReservations = filteredReservations.filter(r => 
      r.tipo_tarifa === tarifaFilter
    );
  }
  
  // Aplicar filtro de fecha
  if (dateFilter !== 'all') {
    const now = new Date();
    filteredReservations = filteredReservations.filter(r => {
      const eventDate = new Date(r.date);
      switch (dateFilter) {
        case 'today':
          return eventDate.toDateString() === now.toDateString();
        case 'week':
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return eventDate >= now && eventDate <= weekLater;
        case 'month':
          const monthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          return eventDate >= now && eventDate <= monthLater;
        case 'future':
          return eventDate >= now;
        default:
          return true;
      }
    });
  }
  
  // Actualizar estadísticas con datos filtrados
  updateStatistics(filteredReservations);
  
  // Actualizar calendario con filtros
  renderCalendar(filteredReservations, 'calendar');
  
  showNotification(`🔍 Filtros aplicados: ${filteredReservations.length} reservas mostradas`, 'info');
}

// Función para mostrar detalles del evento en modal
function showEventDetailsModal(reservationId) {
  const reservation = allReservations.find(r => r.id === reservationId);
  if (!reservation) {
    showNotification('❌ No se encontró la reserva', 'error');
    return;
  }
  
  const modalBody = `
    <div class="mb-3">
      <h6 class="text-danger">${reservation.name}</h6>
    </div>
    <div class="row">
      <div class="col-6">
        <strong>📅 Fecha:</strong><br>
        ${reservation.fecha}
      </div>
      <div class="col-6">
        <strong>⏰ Hora:</strong><br>
        ${reservation.hora}
      </div>
    </div>
    <div class="mt-2">
      <strong>📧 Email:</strong><br>
      ${reservation.email}
    </div>
    <div class="mt-2">
      <strong>📞 Teléfono:</strong><br>
      ${reservation.phone}
    </div>
    <div class="mt-2">
      <strong>📝 Detalles:</strong><br>
      ${reservation.details}
    </div>
    <div class="mt-2">
      <strong>💰 Tarifa:</strong><br>
      ${reservation.tipo_tarifa || 'Standard'}
    </div>
    <div class="mt-2">
      <strong>📊 Estado:</strong><br>
      <span class="badge bg-${getStatusBadgeColor(reservation.status)}">
        ${mapStatusToSpanish(reservation.status)}
      </span>
    </div>
    <div class="mt-3">
      <button class="btn btn-success btn-sm me-2" onclick="actualizarReserva('${reservation.id}', 'confirmed')">
        ✅ Confirmar
      </button>
      <button class="btn btn-warning btn-sm me-2" onclick="actualizarReserva('${reservation.id}', 'pending')">
        ⏳ Pendiente
      </button>
      <button class="btn btn-danger btn-sm" onclick="actualizarReserva('${reservation.id}', 'cancelled')">
        ❌ Cancelar
      </button>
    </div>
  `;
  
  const modal = new bootstrap.Modal(document.getElementById('reservModal'));
  document.getElementById('reservDetails').innerHTML = modalBody;
  modal.show();
}

// ==============================================
// FUNCIONES DE GESTIÓN DE RESERVAS
// ==============================================

// ==============================================
// FUNCIÓN MEJORADA PARA MOSTRAR TODAS LAS RESERVAS
// ==============================================

// Mostrar modal con todas las reservas
// Mostrar modal con todas las reservas - VERSIÓN CORREGIDA
async function showReservationsModal() {
    try {
        showNotification('📋 Cargando todas las reservas...', 'info');
        
        // Cargar todas las reservas desde Supabase
        const { data: reservas, error } = await supabase
            .from('reservations')
            .select('*')
            .order('fecha_completa', { ascending: false });

        if (error) {
            console.error('❌ Error cargando reservas:', error);
            showNotification('❌ Error al cargar las reservas: ' + error.message, 'error');
            return;
        }

        // Convertir al formato esperado
        const formattedReservas = reservas.map(r => ({
            id: r.id,
            name: `${r.nombre} ${r.apellidos}`,
            email: r.correo,
            phone: r.telefono,
            details: r.evento,
            observaciones: r.observaciones || '',
            date: r.fecha_completa,
            status: mapStatusToEnglish(r.estado),
            tipo_tarifa: r.tipo_tarifa,
            fecha: r.fecha,
            hora: r.hora,
            created_at: r.created_at
        }));

        console.log(`✅ ${formattedReservas.length} reservas cargadas para el modal`);

        // Renderizar en el modal
        renderReservasModal(formattedReservas);
        
        // MOSTRAR EL MODAL DE FORMA SEGURA
        const modalElement = document.getElementById('reservModal');
        if (!modalElement) {
            console.error('❌ Elemento reservModal no encontrado en el DOM');
            showNotification('❌ Error: No se puede abrir el modal', 'error');
            return;
        }
        
        // Verificar si Bootstrap está disponible
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.error('❌ Bootstrap no está cargado');
            showNotification('❌ Error: Biblioteca Bootstrap no cargada', 'error');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('❌ Error en showReservationsModal:', error);
        showNotification('❌ Error al cargar las reservas: ' + error.message, 'error');
    }
}
// Renderizar reservas en el modal con mejor diseño
function renderReservasModal(reservas) {
    const reservDetails = document.getElementById('reservDetails');
    if (!reservDetails) return;

    // Header con estadísticas rápidas
    const statsHtml = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white text-center p-2">
                    <h6 class="mb-0">Total</h6>
                    <h4 class="mb-0">${reservas.length}</h4>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-dark text-center p-2">
                    <h6 class="mb-0">Pendientes</h6>
                    <h4 class="mb-0">${reservas.filter(r => r.status === 'pending').length}</h4>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white text-center p-2">
                    <h6 class="mb-0">Confirmadas</h6>
                    <h4 class="mb-0">${reservas.filter(r => r.status === 'confirmed').length}</h4>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-secondary text-white text-center p-2">
                    <h6 class="mb-0">Canceladas</h6>
                    <h4 class="mb-0">${reservas.filter(r => r.status === 'cancelled').length}</h4>
                </div>
            </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">📋 Lista Completa de Reservas (${reservas.length})</h6>
            <div class="d-flex gap-2">
                <input type="text" id="search-reservas" class="form-control form-control-sm" 
                       placeholder="🔍 Buscar reservas..." onkeyup="filterReservations()">
                <button class="btn btn-outline-primary btn-sm" onclick="filterReservations()">
                    Buscar
                </button>
            </div>
        </div>
    `;

    if (reservas.length === 0) {
        reservDetails.innerHTML = statsHtml + `
            <div class="text-center py-5">
                <div class="display-1 text-muted">📭</div>
                <h5 class="text-muted">No hay reservas registradas</h5>
                <p class="text-muted">Cuando los clientes hagan reservas, aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    const body = reservas.map(reserva => {
        const statusBadge = getStatusBadge(reserva.status);
        const buttonConfig = getButtonConfig(reserva.status);

        return `
        <div data-id="${reserva.id}" class="card mb-3 reservation-card ${reserva.status}-card">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${reserva.name}</h6>
                                <p class="card-text text-muted small mb-2">
                                    <strong>📅:</strong> ${new Date(reserva.date).toLocaleDateString('es-ES', { 
                                        weekday: 'short', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                            <div class="text-end">
                                ${statusBadge}
                                <div class="mt-1">
                                    <small class="text-muted">${reserva.tipo_tarifa || 'Standard'}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row small">
                            <div class="col-6">
                                <strong>📧 Email:</strong><br>
                                <span class="text-truncate">${reserva.email}</span>
                            </div>
                            <div class="col-6">
                                <strong>📞 Teléfono:</strong><br>
                                ${reserva.phone}
                            </div>
                        </div>
                        
                        <div class="mt-2">
                            <strong>🎵 Evento:</strong><br>
                            <span class="small">${reserva.details || 'Sin detalles'}</span>
                        </div>
                        
                        ${reserva.observaciones ? `
                        <div class="mt-1">
                            <strong>📝 Observaciones:</strong><br>
                            <span class="small text-muted">${reserva.observaciones}</span>
                        </div>
                        ` : ''}
                        
                        <div class="mt-2">
                            <small class="text-muted">
                                📅 Creado: ${new Date(reserva.created_at).toLocaleDateString('es-ES')}
                            </small>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="d-grid gap-2">
                            <button class="btn ${buttonConfig.confirmClass} btn-sm confirm" ${buttonConfig.confirmDisabled}
                                    onclick="changeReservationStatus('${reserva.id}', 'confirmed')">
                                ${buttonConfig.confirmText}
                            </button>
                            
                            <button class="btn btn-warning btn-sm" ${reserva.status === 'pending' ? '' : 'disabled'}
                                    onclick="changeReservationStatus('${reserva.id}', 'pending')">
                                ⏳ Pendiente
                            </button>
                            
                            <button class="btn btn-danger btn-sm cancel" ${buttonConfig.cancelDisabled}
                                    onclick="changeReservationStatus('${reserva.id}', 'cancelled')">
                                ❌ Cancelar
                            </button>
                            
                            <button class="btn btn-outline-info btn-sm mt-2"
                                    onclick="showReservationDetails('${reserva.id}')">
                                👁️ Ver Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    reservDetails.innerHTML = statsHtml + body;
}

// ==============================================
// FUNCIÓN MEJORADA PARA CAMBIAR ESTADO
// ==============================================

// Función para cambiar el estado de una reserva (MANTENER SOLO ESTA)
async function changeReservationStatus(reservationId, newStatus) {
    try {
        console.log(`🔄 Cambiando estado de reserva ${reservationId} a: ${newStatus}`);
        
        showNotification(`🔄 Actualizando reserva...`, 'info');

        const { error } = await supabase
            .from('reservations')
            .update({ 
                estado: mapStatusToSpanish(newStatus),
                updated_at: new Date().toISOString()
            })
            .eq('id', reservationId);

        if (error) {
            console.error('❌ Error actualizando reserva:', error);
            throw new Error(`Error al actualizar: ${error.message}`);
        }

        const statusMessages = {
            'confirmed': '✅ Reserva CONFIRMADA correctamente',
            'pending': '⏳ Reserva marcada como PENDIENTE',
            'cancelled': '❌ Reserva CANCELADA correctamente'
        };

        showNotification(statusMessages[newStatus] || '✅ Estado actualizado', 'success');

        // Recargar los datos y actualizar la vista
        setTimeout(async () => {
            await loadDashboard(); // Recargar dashboard completo
            
            // Cerrar modal si está abierto
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservModal'));
            if (modal) modal.hide();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error en changeReservationStatus:', error);
        showNotification(`❌ Error al cambiar estado: ${error.message}`, 'error');
    }
}

// ==============================================
// FUNCIÓN PARA VER DETALLES COMPLETOS
// ==============================================

// Mostrar detalles completos de una reserva
async function showReservationDetails(reservationId) {
    try {
        const { data: reserva, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('id', reservationId)
            .single();

        if (error) throw error;

        const modalBody = `
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title">📋 Detalles Completos de Reserva</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>👤 Información Personal</h6>
                        <p><strong>Nombre:</strong> ${reserva.nombre} ${reserva.apellidos}</p>
                        <p><strong>Email:</strong> ${reserva.correo}</p>
                        <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>📅 Información del Evento</h6>
                        <p><strong>Fecha:</strong> ${reserva.fecha}</p>
                        <p><strong>Hora:</strong> ${reserva.hora}</p>
                        <p><strong>Estado:</strong> <span class="badge bg-${getStatusBadgeColor(mapStatusToEnglish(reserva.estado))}">${reserva.estado}</span></p>
                        <p><strong>Tarifa:</strong> ${reserva.tipo_tarifa || 'Standard'}</p>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6>🎵 Detalles del Evento</h6>
                    <p>${reserva.evento || 'No especificado'}</p>
                </div>
                
                ${reserva.observaciones ? `
                <div class="mt-3">
                    <h6>📝 Observaciones</h6>
                    <p class="text-muted">${reserva.observaciones}</p>
                </div>
                ` : ''}
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <p><strong>📅 Creado:</strong> ${new Date(reserva.created_at).toLocaleString('es-ES')}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>🔄 Actualizado:</strong> ${reserva.updated_at ? new Date(reserva.updated_at).toLocaleString('es-ES') : 'No actualizado'}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <div class="btn-group">
                    <button class="btn btn-success btn-sm" onclick="changeReservationStatus('${reserva.id}', 'confirmed')">
                        ✅ Confirmar
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="changeReservationStatus('${reserva.id}', 'pending')">
                        ⏳ Pendiente
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="changeReservationStatus('${reserva.id}', 'cancelled')">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;

        // Crear modal temporal para detalles
        const existingModal = document.getElementById('reservationDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'reservationDetailsModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    ${modalBody}
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        // Eliminar el modal del DOM cuando se cierre
        modalDiv.addEventListener('hidden.bs.modal', function () {
            modalDiv.remove();
        });
        
    } catch (error) {
        console.error('❌ Error mostrando detalles:', error);
        showNotification('❌ Error al cargar los detalles', 'error');
    }
}
// Función para renderizar reservas en el modal (REEMPLAZAR LA EXISTENTE)
function renderReservasModal(reservas) {
    const reservDetails = document.getElementById('reservDetails');
    if (!reservDetails) return;

    if (reservas.length === 0) {
        reservDetails.innerHTML = `
            <div class="text-center py-5">
                <div class="display-1 text-muted">📭</div>
                <h5 class="text-muted">No hay reservas registradas</h5>
                <p class="text-muted">Cuando los clientes hagan reservas, aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    const body = reservas.map(reserva => {
        const statusBadge = getStatusBadge(reserva.status);
        const buttonConfig = getButtonConfig(reserva.status);

        return `
        <div class="card mb-3 reservation-card ${reserva.status}-card">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${reserva.name}</h6>
                                <p class="card-text text-muted small mb-2">
                                    <strong>📅:</strong> ${new Date(reserva.date).toLocaleDateString('es-ES', { 
                                        weekday: 'short', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric'
                                    })} ${reserva.hora}
                                </p>
                            </div>
                            <div class="text-end">
                                ${statusBadge}
                                <div class="mt-1">
                                    <small class="text-muted">${reserva.tipo_tarifa || 'Standard'}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row small">
                            <div class="col-6">
                                <strong>📧 Email:</strong><br>
                                <span class="text-truncate">${reserva.email}</span>
                            </div>
                            <div class="col-6">
                                <strong>📞 Teléfono:</strong><br>
                                ${reserva.phone}
                            </div>
                        </div>
                        
                        <div class="mt-2">
                            <strong>🎵 Evento:</strong><br>
                            <span class="small">${reserva.details || 'Sin detalles'}</span>
                        </div>
                        
                        ${reserva.observaciones ? `
                        <div class="mt-1">
                            <strong>📝 Observaciones:</strong><br>
                            <span class="small text-muted">${reserva.observaciones}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="col-md-4">
                        <div class="d-grid gap-2">
                            <button class="btn ${buttonConfig.confirmClass} btn-sm" ${buttonConfig.confirmDisabled}
                                    onclick="changeReservationStatus('${reserva.id}', 'confirmed')">
                                ${buttonConfig.confirmText}
                            </button>
                            
                            <button class="btn btn-warning btn-sm" ${reserva.status === 'pending' ? '' : 'disabled'}
                                    onclick="changeReservationStatus('${reserva.id}', 'pending')">
                                ⏳ Pendiente
                            </button>
                            
                            <button class="btn btn-danger btn-sm" ${buttonConfig.cancelDisabled}
                                    onclick="changeReservationStatus('${reserva.id}', 'cancelled')">
                                ❌ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    reservDetails.innerHTML = body;
}

// ==============================================
// FUNCIÓN DE BÚSqueda MEJORADA
// ==============================================

// Filtrar reservas en el modal
// Función para filtrar reservas en el modal
function filterReservations() {
    const searchTerm = document.getElementById('search-reservas')?.value.toLowerCase() || '';
    const reservationCards = document.querySelectorAll('.reservation-card');
    
    let visibleCount = 0;
    
    reservationCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const isVisible = cardText.includes(searchTerm);
        
        card.style.display = isVisible ? 'block' : 'none';
        if (isVisible) visibleCount++;
    });

    // Actualizar contador de resultados
    updateSearchResultsCount(visibleCount);
}

// Actualizar contador de resultados de búsqueda
function updateSearchResultsCount(count) {
    let counter = document.getElementById('search-results-count');
    
    if (!counter) {
        const searchContainer = document.querySelector('input[id="search-reservas"]')?.parentElement;
        if (searchContainer) {
            counter = document.createElement('span');
            counter.id = 'search-results-count';
            counter.className = 'badge bg-primary ms-2';
            searchContainer.appendChild(counter);
        }
    }
    
    if (counter) {
        counter.textContent = `${count} resultados`;
    }
}// Actualizar reserva en Supabase
async function actualizarReserva(id, status) {
  try {
    showNotification('🔄 Actualizando reserva...', 'info');
    
    const { error } = await supabase
      .from('reservations')
      .update({ 
        estado: mapStatusToSpanish(status),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    showNotification(`✅ Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'} correctamente`, 'success');
    
    // Recargar el dashboard
    setTimeout(() => {
      loadDashboard();
      const modal = bootstrap.Modal.getInstance(document.getElementById('reservModal'));
      if (modal) modal.hide();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Error actualizando reserva:', error);
    showNotification('❌ Error al actualizar la reserva: ' + error.message, 'danger');
  }
}

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

// Mapear estados en español a inglés
function mapStatusToEnglish(estado) {
  const statusMap = {
    'pendiente': 'pending',
    'confirmada': 'confirmed',
    'cancelada': 'cancelled'
  };
  return statusMap[estado] || 'pending';
}

// Mapear estados en inglés a español
function mapStatusToSpanish(status) {
  const statusMap = {
    'pending': 'pendiente',
    'confirmed': 'confirmada',
    'cancelled': 'cancelada'
  };
  return statusMap[status] || 'pendiente';
}

// Obtener color del evento según estado
function getEventColor(status) {
  const colors = {
    'confirmed': '#28a745',
    'pending': '#ffc107',
    'cancelled': '#6c757d'
  };
  return colors[status] || '#ffc107';
}

function getEventBorderColor(status) {
  const colors = {
    'confirmed': '#218838',
    'pending': '#e0a800',
    'cancelled': '#545b62'
  };
  return colors[status] || '#e0a800';
}

function getButtonConfig(status) {
    const configs = {
        'pending': { 
            confirmClass: 'btn-success', 
            confirmText: '✅ Confirmar', 
            confirmDisabled: '', 
            cancelDisabled: '' 
        },
        'confirmed': { 
            confirmClass: 'btn-secondary', 
            confirmText: '✅ Confirmado', 
            confirmDisabled: 'disabled', 
            cancelDisabled: '' 
        },
        'cancelled': { 
            confirmClass: 'btn-dark', 
            confirmText: '❌ Cancelado', 
            confirmDisabled: 'disabled', 
            cancelDisabled: 'disabled' 
        }
    };
    return configs[status] || configs.pending;
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge bg-warning text-dark">⏳ Pendiente</span>',
    'confirmed': '<span class="badge bg-success">✅ Confirmado</span>',
    'cancelled': '<span class="badge bg-secondary">❌ Cancelado</span>'
  };
  return badges[status] || badges.pending;
}

function getStatusBadgeColor(status) {
  const colors = {
    'pending': 'warning',
    'confirmed': 'success',
    'cancelled': 'secondary'
  };
  return colors[status] || 'secondary';
}

function filterReservationsBySearch(reservas) {
  const searchTerm = document.getElementById('search-reservas')?.value.toLowerCase() || '';
  if (!searchTerm) return reservas;
  
  return reservas.filter(r => 
    r.name.toLowerCase().includes(searchTerm) ||
    r.email.toLowerCase().includes(searchTerm) ||
    r.phone.includes(searchTerm) ||
    r.details.toLowerCase().includes(searchTerm) ||
    (r.tipo_tarifa && r.tipo_tarifa.toLowerCase().includes(searchTerm))
  );
}

// Mostrar detalles del evento
function showEventDetails(event) {
  const eventData = event.extendedProps;
  const statusSpanish = mapStatusToSpanish(eventData.status);
  
  const detailsHtml = `
    <div class="alert alert-info">
      <h6>${event.title}</h6>
      <p><strong>📅 Fecha:</strong> ${event.start.toLocaleString('es-ES')}</p>
      <p><strong>📊 Estado:</strong> <span class="badge bg-${eventData.status === 'confirmed' ? 'success' : eventData.status === 'pending' ? 'warning' : 'secondary'}">${statusSpanish}</span></p>
      <p><strong>💰 Tarifa:</strong> ${eventData.tipo_tarifa || 'No especificada'}</p>
      <p><strong>📝 Detalles:</strong> ${eventData.details}</p>
      <p><strong>📧 Email:</strong> ${eventData.email}</p>
      <p><strong>📞 Teléfono:</strong> ${eventData.phone}</p>
    </div>
  `;
  
  document.getElementById('reservDetails').innerHTML = detailsHtml;
  const modal = new bootstrap.Modal(document.getElementById('reservModal'));
  modal.show();
}

// ==============================================
// FUNCIONES DE UTILIDAD
// ==============================================

function showLoadingState(show) {
  const loginText = document.getElementById('login-text');
  const loginLoading = document.getElementById('login-loading');
  const submitBtn = document.querySelector('#loginForm button[type="submit"]');
  
  if (show) {
    if (loginText) loginText.style.display = 'none';
    if (loginLoading) loginLoading.style.display = 'inline';
    if (submitBtn) submitBtn.disabled = true;
  } else {
    if (loginText) loginText.style.display = 'inline';
    if (loginLoading) loginLoading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

function showMessage(message, type, container = null) {
  const messagesDiv = container || document.getElementById('login-messages');
  if (!messagesDiv) return;
  
  const alertClass = `alert alert-${type} alert-dismissible fade show`;
  messagesDiv.innerHTML = `
    <div class="${alertClass}" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function showNotification(message, type = 'info') {
  // Eliminar notificaciones anteriores
  const existingNotifications = document.querySelectorAll('.custom-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `alert alert-${getAlertType(type)} custom-notification`;
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Estilos
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '9999',
    minWidth: '300px',
    maxWidth: '500px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  });
  
  // Insertar en el body
  document.body.appendChild(notification);
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

function getAlertType(type) {
  const types = {
    'success': 'success',
    'error': 'danger',
    'warning': 'warning',
    'info': 'info'
  };
  return types[type] || 'info';
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
// ==============================================
// FUNCIONES DE GESTIÓN DE USUARIOS (FALTANTES)
// ==============================================

// Mostrar/ocultar botón de gestión de usuarios según el rol
function setupUserManagement(user) {
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const userRoleSpan = document.getElementById('user-role');
    
    if (manageUsersBtn && userRoleSpan) {
        // Verificar si es admin
        if (user.email === 'admin@terrazaroja.com' || user.email === 'banda@terrazaroja.com') {
            manageUsersBtn.style.display = 'block';
            userRoleSpan.textContent = '👑 Administrador';
            
            // Event listener para el botón de gestión
            manageUsersBtn.addEventListener('click', function() {
                showUserManagementModal();
            });
        } else {
            userRoleSpan.textContent = '🎸 Usuario';
        }
    }
}

// Mostrar modal de gestión de usuarios
function showUserManagementModal() {
    loadUserManagement();
    const modal = new bootstrap.Modal(document.getElementById('usersModal'));
    modal.show();
}

// Cargar gestión de usuarios
async function loadUserManagement() {
    try {
        await loadPendingRequests();
        await loadApprovedUsers();
    } catch (error) {
        console.error('Error cargando gestión de usuarios:', error);
        showNotification('❌ Error al cargar la gestión de usuarios', 'danger');
    }
}

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    try {
        const { data: requests, error } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('pending-requests-list');
        if (!container) return;
        
        if (requests.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay solicitudes pendientes</p>';
            return;
        }

        container.innerHTML = requests.map(request => `
            <div class="card user-request-card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">${request.nombres} ${request.apellidos}</h6>
                            <p class="card-text mb-1">
                                <strong>📧 Email:</strong> ${request.correo}<br>
                                <strong>🔖 Usuario:</strong> ${request.nombre_usuario}<br>
                                <strong>📞 Teléfono:</strong> ${request.telefono || 'No proporcionado'}<br>
                                <strong>🎵 Tipo:</strong> ${request.tipo_usuario}<br>
                                <strong>💬 Mensaje:</strong> ${request.mensaje_solicitud || 'Sin mensaje'}
                            </p>
                            <small class="text-muted">
                                📅 Solicitado: ${new Date(request.created_at).toLocaleDateString('es-ES')}
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group-vertical w-100">
                                <button class="btn btn-success btn-sm mb-2" onclick="approveRequest('${request.id}')">
                                    ✅ Aprobar
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="rejectRequest('${request.id}')">
                                    ❌ Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        const container = document.getElementById('pending-requests-list');
        if (container) {
            container.innerHTML = '<p class="text-center text-danger">Error al cargar las solicitudes</p>';
        }
    }
}

// Cargar usuarios aprobados
async function loadApprovedUsers() {
    try {
        // Obtener usuarios aprobados de las solicitudes
        const { data: approvedRequests, error: requestsError } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('estado', 'aprobado')
            .order('fecha_aprobacion', { ascending: false });

        if (requestsError) throw requestsError;

        const container = document.getElementById('approved-users-list');
        if (!container) return;
        
        if (approvedRequests.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay usuarios aprobados</p>';
            return;
        }

        container.innerHTML = approvedRequests.map(user => `
            <div class="card user-request-card approved mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-9">
                            <h6 class="card-title">${user.nombres} ${user.apellidos}</h6>
                            <p class="card-text mb-1">
                                <strong>📧 Email:</strong> ${user.correo}<br>
                                <strong>🔖 Usuario:</strong> ${user.nombre_usuario}<br>
                                <strong>📞 Teléfono:</strong> ${user.telefono || 'No proporcionado'}<br>
                                <strong>🎵 Tipo:</strong> ${user.tipo_usuario}<br>
                                <strong>✅ Aprobado:</strong> ${new Date(user.fecha_aprobacion).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-warning btn-sm" onclick="deactivateUser('${user.id}')">
                                🚫 Desactivar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error cargando usuarios aprobados:', error);
        const container = document.getElementById('approved-users-list');
        if (container) {
            container.innerHTML = '<p class="text-center text-danger">Error al cargar los usuarios</p>';
        }
    }
}

// Aprobar solicitud de usuario
async function approveRequest(requestId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        showNotification('🔄 Procesando solicitud...', 'info');

        // 1. Obtener datos de la solicitud
        const { data: request, error: requestError } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (requestError) throw requestError;

        // 2. Marcar solicitud como aprobada
        const { error: updateError } = await supabase
            .from('registration_requests')
            .update({
                estado: 'aprobado',
                aprobado_por: user.id,
                fecha_aprobacion: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateError) throw updateError;

        showNotification('✅ Solicitud aprobada correctamente', 'success');
        
        // Recargar la lista
        setTimeout(() => {
            loadUserManagement();
        }, 1500);

    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        showNotification('❌ Error al aprobar solicitud: ' + error.message, 'danger');
    }
}

// Rechazar solicitud
async function rejectRequest(requestId) {
    if (!confirm('¿Estás seguro de que quieres rechazar esta solicitud?')) {
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { error } = await supabase
            .from('registration_requests')
            .update({
                estado: 'rechazado',
                aprobado_por: user.id,
                fecha_aprobacion: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) throw error;

        showNotification('❌ Solicitud rechazada', 'success');
        
        // Recargar la lista
        setTimeout(() => {
            loadUserManagement();
        }, 1500);

    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        showNotification('❌ Error al rechazar solicitud', 'danger');
    }
}

// Desactivar usuario
async function deactivateUser(userId) {
    if (!confirm('¿Estás seguro de que quieres desactivar este usuario?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ activo: false })
            .eq('id', userId);

        if (error) throw error;

        showNotification('🚫 Usuario desactivado', 'success');
        
        // Recargar la lista
        setTimeout(() => {
            loadUserManagement();
        }, 1500);

    } catch (error) {
        console.error('Error desactivando usuario:', error);
        showNotification('❌ Error al desactivar usuario', 'danger');
    }
}

// ==============================================
// FUNCIONES DE REGISTRO (FALTANTES)
// ==============================================

// Manejar registro de nuevo usuario
async function handleRegistration(e) {
    e.preventDefault();
    
    const messagesDiv = document.getElementById('login-messages');
    
    // Validar contraseñas
    if (!validatePasswords()) {
        return;
    }
    
    // Obtener datos del formulario
    const formData = {
        nombres: document.getElementById('reg-nombres').value.trim(),
        apellidos: document.getElementById('reg-apellidos').value.trim(),
        correo: document.getElementById('reg-email').value.trim(),
        nombre_usuario: document.getElementById('reg-username').value.trim(),
        password: document.getElementById('reg-password').value,
        telefono: document.getElementById('reg-telefono').value.trim(),
        tipo_usuario: document.getElementById('reg-tipo-usuario').value,
        mensaje_solicitud: document.getElementById('reg-mensaje').value.trim()
    };
    
    console.log('📨 Datos del formulario:', formData);
    
    // Validaciones
    if (!formData.nombres || !formData.apellidos || !formData.correo || !formData.nombre_usuario) {
        showMessage('⚠️ Por favor, completa todos los campos obligatorios', 'warning', messagesDiv);
        return;
    }
    
    if (!isValidEmail(formData.correo)) {
        showMessage('📧 Por favor, ingresa un email válido', 'warning', messagesDiv);
        return;
    }
    
    // Mostrar loading
    showRegistrationLoading(true);
    showMessage('📨 Enviando solicitud de registro...', 'info', messagesDiv);
    
    try {
        console.log('🚀 Enviando solicitud a Supabase...');
        
        // Enviar solicitud de registro
        const { data, error } = await supabase
            .from('registration_requests')
            .insert([{
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                correo: formData.correo,
                nombre_usuario: formData.nombre_usuario,
                password: formData.password,
                telefono: formData.telefono,
                tipo_usuario: formData.tipo_usuario,
                mensaje_solicitud: formData.mensaje_solicitud
            }])
            .select();

        if (error) {
            console.error('❌ Error de Supabase:', error);
            
            if (error.code === '23505') {
                if (error.message.includes('correo')) {
                    throw new Error('Ya existe una solicitud con este email');
                } else if (error.message.includes('nombre_usuario')) {
                    throw new Error('Este nombre de usuario ya está en uso');
                }
            }
            throw new Error(error.message);
        }

        console.log('✅ Solicitud creada:', data);
        
        // Éxito
        showMessage('✅ ¡Solicitud enviada exitosamente! Un administrador la revisará pronto.', 'success', messagesDiv);
        
        
        // Limpiar formulario
        document.getElementById('registerForm').reset();
        // Cambiar a pestaña de login después de 3 segundos
        setTimeout(() => {
            const loginTab = document.getElementById('login-tab');
            if (loginTab) loginTab.click();
        }, 3000);
        
    } catch (error) {
        console.error('💥 Error en registro:', error);
        showMessage('❌ Error al enviar solicitud: ' + error.message, 'danger', messagesDiv);
    } finally {
        showRegistrationLoading(false);
    }
}

// Validar que las contraseñas coincidan
function validatePasswords() {
    const password = document.getElementById('reg-password');
    const confirmPassword = document.getElementById('reg-confirm-password');
    const messagesDiv = document.getElementById('login-messages');
    
    if (!password || !confirmPassword) return true;
    
    if (password.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('Las contraseñas no coinciden');
        showMessage('❌ Las contraseñas no coinciden', 'warning', messagesDiv);
        return false;
    } else {
        confirmPassword.setCustomValidity('');
        return true;
    }
}

// Mostrar/ocultar loading en registro
function showRegistrationLoading(show) {
    const registerText = document.getElementById('register-text');
    const registerLoading = document.getElementById('register-loading');
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (show) {
        if (registerText) registerText.style.display = 'none';
        if (registerLoading) registerLoading.style.display = 'inline';
        if (submitBtn) submitBtn.disabled = true;
    } else {
        if (registerText) registerText.style.display = 'inline';
        if (registerLoading) registerLoading.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ==============================================
// HACER FUNCIONES GLOBALES (FALTANTES)
// ==============================================

// Hacer funciones globales para gestión de usuarios
window.showUserManagementModal = showUserManagementModal;
window.loadUserManagement = loadUserManagement;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.deactivateUser = deactivateUser;

// ==============================================
// FUNCIONES GLOBALES
// ==============================================

// Hacer funciones globales para que los botones las encuentren
window.loadDashboard = loadDashboard;
window.refreshCalendar = function() {
  if (calendar) {
    calendar.refetchEvents();
    showNotification('🔄 Calendario actualizado', 'success');
  }
};
window.showReservationsModal = showReservationsModal;
window.filterReservations = function() {
  renderReservas(allReservations);
};
window.changeView = changeView;
window.exportCalendar = exportCalendar;
window.exportData = exportData;
window.quickConfirmAll = quickConfirmAll;
window.clearOldReservations = clearOldReservations;
window.applyFilters = applyFilters;
window.showEventDetailsModal = showEventDetailsModal;
// ==============================================
// FUNCIONES GLOBALES (AGREGAR AL FINAL)
// ==============================================

window.changeReservationStatus = changeReservationStatus;
window.showReservationDetails = showReservationDetails;
window.filterReservations = filterReservations;
window.applyFilters = applyFilters;
window.exportCalendar = exportCalendar;
window.exportData = exportData;
window.quickConfirmAll = quickConfirmAll;
window.clearOldReservations = clearOldReservations;
window.showReservationsModal = showReservationsModal;
window.changeView = changeView;

// Para gestión de usuarios
window.showUserManagementModal = showUserManagementModal;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.deactivateUser = deactivateUser;

// Escuchar cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Cambio de estado de autenticación:', event);
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 Usuario cerró sesión');
    window.location.reload();
  }
});

// Verificar que todas las funciones estén disponibles
console.log('🔧 Verificando funciones...');
console.log('showReservationsModal:', typeof showReservationsModal);
console.log('renderReservasModal:', typeof renderReservasModal);
console.log('filterReservations:', typeof filterReservations);
console.log('changeReservationStatus:', typeof changeReservationStatus);
console.log('bootstrap:', typeof bootstrap);
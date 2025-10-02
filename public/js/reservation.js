// Configuración de Supabase
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let calendar;
let selectedDate = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema de reservaciones...');
    
    await initializeCalendar();
    setupEventListeners();
    await loadInitialData();
});

// Inicializar calendario
async function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) {
        console.error('❌ Elemento del calendario no encontrado');
        return;
    }

    try {
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
            dateClick: async function(info) {
                await handleDateSelection(info);
            },
            eventClick: function(info) {
                showEventDetails(info.event);
            },
            events: async function(fetchInfo, successCallback, failureCallback) {
                try {
                    const events = await loadEventsFromSupabase(fetchInfo.start, fetchInfo.end);
                    successCallback(events);
                } catch (error) {
                    console.error('Error cargando eventos:', error);
                    failureCallback(error);
                }
            },
            loading: function(isLoading) {
                if (isLoading) {
                    console.log('📥 Cargando eventos...');
                }
            }
        });
        
        calendar.render();
        console.log('✅ Calendario inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando calendario:', error);
        showNotification('Error al cargar el calendario', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    const reservationForm = document.getElementById('reservationForm');
    const refreshBtn = document.getElementById('refresh-calendar');
    const timeInput = document.getElementById('time');

    if (reservationForm) {
        reservationForm.addEventListener('submit', handleReservationSubmit);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCalendar);
    }

    if (timeInput) {
        timeInput.addEventListener('change', function() {
            if (selectedDate) {
                checkAvailability(selectedDate, this.value);
            }
        });
    }

    // Validación en tiempo real del teléfono
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
        });
    }
}

// Cargar datos iniciales
async function loadInitialData() {
    try {
        // Verificar conexión con Supabase
        const { data, error } = await supabase
            .from('reservations')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Error conectando con Supabase:', error);
            showNotification('Error de conexión con la base de datos', 'error');
        } else {
            console.log('✅ Conexión con Supabase establecida');
        }
    } catch (error) {
        console.error('❌ Error en carga inicial:', error);
    }
}

// Manejar selección de fecha
async function handleDateSelection(info) {
    selectedDate = info.dateStr;
    
    // Actualizar interfaz
    document.getElementById('date').value = selectedDate;
    document.getElementById('selectedDate').textContent = formatDate(selectedDate);
    document.getElementById('dateAlert').classList.remove('alert-secondary', 'alert-danger', 'alert-success');
    document.getElementById('dateAlert').classList.add('alert-warning');
    document.getElementById('availabilityStatus').textContent = 'Seleccionada';
    document.getElementById('availabilityStatus').className = 'badge bg-warning';

    // Verificar disponibilidad si ya hay una hora seleccionada
    const timeValue = document.getElementById('time').value;
    if (timeValue) {
        await checkAvailability(selectedDate, timeValue);
    }

    showNotification(`Fecha seleccionada: ${formatDate(selectedDate)}`, 'success');
    
    // Resaltar fecha en el calendario
    removeDateSelection();
    info.dayEl.classList.add('selected-date');
}

// Remover selección anterior
function removeDateSelection() {
    const previousSelected = document.querySelector('.selected-date');
    if (previousSelected) {
        previousSelected.classList.remove('selected-date');
    }
}

// Cargar eventos desde Supabase
async function loadEventsFromSupabase(start, end) {
    try {
        console.log(`📥 Cargando eventos desde ${start.toISOString()} hasta ${end.toISOString()}`);
        
        const { data: reservas, error } = await supabase
            .from('reservations')
            .select('*')
            .gte('fecha_completa', start.toISOString())
            .lte('fecha_completa', end.toISOString())
            .order('fecha_completa', { ascending: true });

        if (error) {
            console.error('❌ Error cargando eventos:', error);
            throw error;
        }

        console.log(`✅ ${reservas.length} eventos cargados`);
        
        return reservas.map(r => ({
            title: `${r.nombre} ${r.apellidos} - ${r.evento || 'Evento'}`,
            start: r.fecha_completa,
            display: 'background',
            backgroundColor: getEventColor(r.estado),
            textColor: 'white',
            borderColor: getEventBorderColor(r.estado),
            extendedProps: {
                estado: r.estado,
                email: r.correo,
                telefono: r.telefono,
                detalles: r.observaciones,
                tipo_tarifa: r.tipo_tarifa,
                fecha: r.fecha,
                hora: r.hora
            },
            classNames: [`event-${r.estado}`]
        }));
        
    } catch (error) {
        console.error('❌ Error en loadEventsFromSupabase:', error);
        showNotification('Error al cargar los eventos del calendario', 'error');
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

// Manejar envío del formulario
async function handleReservationSubmit(e) {
    e.preventDefault();
    
    const dateValue = document.getElementById('date').value;
    const timeValue = document.getElementById('time').value;
    
    // Validaciones
    if (!dateValue) {
        showNotification('❌ Por favor selecciona una fecha en el calendario', 'warning');
        document.getElementById('dateAlert').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    if (!timeValue) {
        showNotification('❌ Por favor selecciona una hora para el evento', 'warning');
        return;
    }

    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        details: document.getElementById('details').value.trim(),
        date: dateValue,
        time: timeValue,
        fecha_completa: dateValue + 'T' + timeValue
    };

    // Validar campos requeridos
    if (!formData.name || !formData.email || !formData.phone || !formData.details) {
        showNotification('❌ Por favor completa todos los campos obligatorios', 'warning');
        return;
    }

    if (!isValidEmail(formData.email)) {
        showNotification('❌ Por favor ingresa un email válido', 'warning');
        return;
    }

    if (!isValidPhone(formData.phone)) {
        showNotification('❌ El teléfono debe tener 10 dígitos', 'warning');
        return;
    }

    // Verificar disponibilidad
    const isAvailable = await checkAvailability(formData.date, formData.time);
    if (!isAvailable) {
        showNotification('❌ La fecha y hora seleccionadas no están disponibles. Por favor elige otra.', 'error');
        return;
    }

    // Mostrar loading
    showLoadingState(true);

    try {
        // Guardar en Supabase
        await saveReservationToSupabase(formData);
        
        showNotification('✅ Reservación guardada exitosamente. Te contactaremos pronto.', 'success');
        
        // Limpiar formulario
        clearForm();
        
        // Recargar eventos del calendario
        await refreshCalendar();
        
    } catch (error) {
        console.error('❌ Error guardando reservación:', error);
        showNotification('❌ Hubo un problema al guardar la reservación: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// Guardar reservación en Supabase
async function saveReservationToSupabase(data) {
    console.log('💾 Guardando reservación en Supabase...', data);
    
    // Dividir el nombre en nombre y apellidos
    const nameParts = data.name.split(' ');
    const nombre = nameParts[0] || '';
    const apellidos = nameParts.slice(1).join(' ') || '';
    
    const reservationData = {
        nombre: nombre,
        apellidos: apellidos,
        correo: data.email,
        telefono: data.phone,
        evento: data.details,
        observaciones: 'Reserva desde formulario web',
        fecha: data.date,
        hora: data.time,
        fecha_completa: data.fecha_completa,
        estado: 'pendiente',
        tipo_tarifa: 'standard',
        created_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select();

    if (error) {
        console.error('❌ Error de Supabase:', error);
        
        if (error.code === '23505') { // Violación de unique constraint
            throw new Error('Ya existe una reservación para esta fecha y hora');
        } else if (error.code === '42501') { // Violación de RLS
            throw new Error('No tienes permisos para crear reservaciones');
        } else {
            throw new Error(error.message);
        }
    }

    console.log('✅ Reservación guardada:', result);
    return result;
}

// Verificar disponibilidad
async function checkAvailability(date, time) {
    if (!date || !time) return true;
    
    const fechaCompleta = date + 'T' + time;
    const availabilityStatus = document.getElementById('availabilityStatus');
    const dateAlert = document.getElementById('dateAlert');
    
    try {
        console.log(`🔍 Verificando disponibilidad para ${fechaCompleta}`);
        
        const { data: existingReservations, error } = await supabase
            .from('reservations')
            .select('id, estado')
            .eq('fecha_completa', fechaCompleta)
            .neq('estado', 'cancelada')
            .limit(1);

        if (error) throw error;

        const isAvailable = existingReservations.length === 0;
        
        // Actualizar interfaz
        if (isAvailable) {
            availabilityStatus.textContent = 'Disponible';
            availabilityStatus.className = 'badge bg-success';
            dateAlert.classList.remove('alert-warning', 'alert-danger');
            dateAlert.classList.add('alert-success');
        } else {
            availabilityStatus.textContent = 'Ocupado';
            availabilityStatus.className = 'badge bg-danger';
            dateAlert.classList.remove('alert-warning', 'alert-success');
            dateAlert.classList.add('alert-danger');
        }
        
        return isAvailable;
        
    } catch (error) {
        console.error('❌ Error verificando disponibilidad:', error);
        availabilityStatus.textContent = 'Error';
        availabilityStatus.className = 'badge bg-secondary';
        return true; // Por defecto permitir reserva si hay error
    }
}

// Mostrar detalles del evento
function showEventDetails(event) {
    const eventData = event.extendedProps;
    
    const modalBody = document.getElementById('eventModalBody');
    modalBody.innerHTML = `
        <div class="mb-3">
            <h6>${event.title}</h6>
        </div>
        <div class="row">
            <div class="col-6">
                <strong>📅 Fecha:</strong><br>
                ${eventData.fecha}
            </div>
            <div class="col-6">
                <strong>⏰ Hora:</strong><br>
                ${eventData.hora}
            </div>
        </div>
        <div class="mt-2">
            <strong>📧 Email:</strong><br>
            ${eventData.email}
        </div>
        <div class="mt-2">
            <strong>📞 Teléfono:</strong><br>
            ${eventData.telefono}
        </div>
        <div class="mt-2">
            <strong>📝 Detalles:</strong><br>
            ${eventData.detalles || 'Sin detalles adicionales'}
        </div>
        <div class="mt-2">
            <strong>💰 Tarifa:</strong><br>
            ${eventData.tipo_tarifa || 'Standard'}
        </div>
        <div class="mt-2">
            <strong>📊 Estado:</strong><br>
            <span class="badge bg-${getStatusBadgeColor(eventData.estado)}">${eventData.estado}</span>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

// Funciones de utilidad
function showLoadingState(show) {
    const submitText = document.getElementById('submitText');
    const submitLoading = document.getElementById('submitLoading');
    const submitBtn = document.getElementById('submitBtn');
    
    if (show) {
        submitText.style.display = 'none';
        submitLoading.style.display = 'inline';
        submitBtn.disabled = true;
    } else {
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
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

function getStatusBadgeColor(estado) {
    const colors = {
        'pendiente': 'warning',
        'confirmada': 'success',
        'cancelada': 'secondary'
    };
    return colors[estado] || 'secondary';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

function clearForm() {
    document.getElementById('reservationForm').reset();
    document.getElementById('selectedDate').textContent = 'Ninguna fecha seleccionada';
    document.getElementById('availabilityStatus').textContent = 'Sin verificar';
    document.getElementById('availabilityStatus').className = 'badge bg-secondary';
    document.getElementById('dateAlert').className = 'alert alert-warning';
    document.getElementById('date').value = '';
    selectedDate = null;
    removeDateSelection();
    showNotification('Formulario limpiado', 'info');
}

async function refreshCalendar() {
    if (calendar) {
        showNotification('🔄 Actualizando calendario...', 'info');
        await calendar.refetchEvents();
        showNotification('✅ Calendario actualizado', 'success');
    }
}

// Hacer funciones globales
window.clearForm = clearForm;
window.refreshCalendar = refreshCalendar;
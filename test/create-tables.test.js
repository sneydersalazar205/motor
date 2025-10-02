// test-connection.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjAxMTgsImV4cCI6MjA3NDkzNjExOH0.NE6aJ-oQjDoMqOeEfQlcT3dKyzhRQVTLYZgnxIX87HY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🧪 Probando conexión con Supabase...');
  
  try {
    // 1. Probar que la tabla existe
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error:', error.message);
      if (error.code === '42P01') {
        console.log('💡 La tabla "reservations" no existe. Crea la tabla primero.');
      }
      return;
    }

    console.log('✅ Conexión exitosa. Tabla reservations existe.');

    // 2. Probar inserción
    const testReservation = {
      nombre: 'Juan',
      apellidos: 'Pérez',
      correo: 'juan@test.com',
      telefono: '1234567890',
      evento: 'Evento de prueba',
      fecha: '2024-01-01',
      hora: '14:00',
      fecha_completa: '2024-01-01T14:00:00',
      estado: 'pendiente'
    };

    const { data: newRes, error: insertError } = await supabase
      .from('reservations')
      .insert([testReservation])
      .select();

    if (insertError) {
      console.log('❌ Error insertando:', insertError.message);
    } else {
      console.log('✅ Inserción exitosa. ID:', newRes[0].id);
    }

  } catch (err) {
    console.log('❌ Error fatal:', err.message);
  }
}

testConnection();
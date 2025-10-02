// create-tables.js
const { createClient } = require('@supabase/supabase-js');

// TUS CREDENCIALES (usa la service key que tienes)
const SUPABASE_URL = 'https://vllouqgqmdovgqpicyat.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG91cWdxbWRvdmdxcGljeWF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM2MDExOCwiZXhwIjoyMDc0OTM2MTE4fQ.litPo-YsNY-FFPubE03jepMwrgbegMezAfgWzqIyOQg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTables() {
  try {
    console.log('🔄 Creando tablas en Supabase...');

    // SQL para crear todas las tablas necesarias
    const sqlCommands = [
      `CREATE TABLE IF NOT EXISTS reservations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        correo TEXT NOT NULL,
        telefono TEXT,
        evento TEXT NOT NULL,
        observaciones TEXT,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        fecha_completa TIMESTAMP NOT NULL,
        tipo_tarifa TEXT DEFAULT 'standard',
        estado TEXT DEFAULT 'pendiente',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        dark_mode BOOLEAN DEFAULT false,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        UNIQUE(user_id)
      )`,

      `ALTER TABLE reservations ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY`,

      `DROP POLICY IF EXISTS "Allow all operations on reservations" ON reservations`,
      `CREATE POLICY "Allow all operations on reservations" ON reservations FOR ALL USING (true)`,

      `DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences`,
      `CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id)`
    ];

    // Ejecutar cada comando SQL
    for (const sql of sqlCommands) {
      console.log(`Ejecutando: ${sql.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: sql });
      
      if (error) {
        // Si falla RPC, intentar con query directa para CREATE TABLE
        if (sql.includes('CREATE TABLE')) {
          console.log('Usando método alternativo para crear tabla...');
          // Para CREATE TABLE, podemos usar una consulta simple para verificar/crear
          const { error: tableError } = await supabase
            .from('reservations')
            .select('*')
            .limit(1);
            
          if (tableError && tableError.code === '42P01') {
            console.log('⚠️ La tabla no existe. Creándola manualmente en SQL Editor...');
            console.log('Por favor ejecuta este SQL en el SQL Editor de Supabase:');
            console.log(`
              CREATE TABLE reservations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                nombre TEXT NOT NULL,
                apellidos TEXT NOT NULL,
                correo TEXT NOT NULL,
                telefono TEXT,
                evento TEXT NOT NULL,
                observaciones TEXT,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                fecha_completa TIMESTAMP NOT NULL,
                tipo_tarifa TEXT DEFAULT 'standard',
                estado TEXT DEFAULT 'pendiente',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
              );
            `);
          }
        }
      } else {
        console.log('✅ Comando ejecutado exitosamente');
      }
    }

    console.log('🎉 ¡Configuración completada!');
    console.log('📊 Verifica las tablas en: https://supabase.com/dashboard/project/vllouqgqmdovgqpicyat/editor');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar la función
createTables();
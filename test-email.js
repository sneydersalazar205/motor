require('dotenv').config();
const { sendMail } = require('./server.js');

async function testEmail() {
  try {
    console.log('🧪 Iniciando prueba de email...');
    
    const testData = {
      name: "Usuario de Prueba",
      email: "sneydersalazar205@gmail.com", // Cambia por tu email
      phone: "1234567890",
      details: "Evento de prueba del sistema",
      date: new Date().toISOString()
    };

    const result = await sendMail(testData);
    console.log('✅ ¡Prueba exitosa! Email enviado correctamente.');
    console.log('📧 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Prueba fallida:', error.message);
  }
}

testEmail();
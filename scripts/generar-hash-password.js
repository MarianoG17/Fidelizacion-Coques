// Script para generar hash de contraseña con bcryptjs
// Uso: node scripts/generar-hash-password.js

const bcrypt = require('bcryptjs');

// Cambiar esta contraseña por la que quieras usar
const passwordEnTextoPlano = 'test123';

bcrypt.hash(passwordEnTextoPlano, 10, (err, hash) => {
  if (err) {
    console.error('Error generando hash:', err);
    return;
  }
  
  console.log('\n=== HASH GENERADO ===');
  console.log(`Contraseña original: ${passwordEnTextoPlano}`);
  console.log(`Hash bcryptjs: ${hash}`);
  console.log('\n=== QUERY SQL PARA NEON ===');
  console.log(`UPDATE "Cliente" SET password = '${hash}' WHERE email = 'TU_EMAIL_AQUI';`);
  console.log('\nCopia el hash o el query SQL completo para usar en Neon.');
});

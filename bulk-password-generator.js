// Carga las variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' }); 

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const readline = require('readline');

// --- Configuración ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: Revisa las variables de Supabase en tu archivo .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateRandomPassword(length = 8) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// --- Función Principal ---
async function updateAndResetAccounts() {
  console.log('Iniciando actualización masiva de emails y contraseñas...');

  try {
    console.log('Obteniendo la lista completa de usuarios de la tabla "people"...');
    const { data: users, error: fetchError } = await supabase
      .from('people')
      .select('id, email, full_name');

    if (fetchError) throw fetchError;

    if (!users || users.length === 0) {
      console.log('No se encontraron usuarios en la tabla "people".');
      rl.close();
      return;
    }

    console.log(`\n¡ATENCIÓN! Se encontraron ${users.length} usuarios.`);
    console.log('Este script REEMPLAZARÁ el email y la contraseña de TODOS ellos.');
    console.log('Esta acción es irreversible.');
    
    rl.question('Escribe "si" para confirmar y continuar: ', async (answer) => {
        if (answer.toLowerCase() !== 'si') {
            console.log('Operación cancelada.');
            rl.close();
            return;
        }

        console.log(`\nIniciando actualización...`);
        const credentialsList = [];
        let updates = [];
        const batchSize = 50; // Procesar en lotes de 50 para evitar sobrecarga
        
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          const emailParts = user.email.split('@')[0];
          const namePart = emailParts.split('_')[0];
          const newEmail = `${namePart}@fenix.com`;
          const newPassword = generateRandomPassword();
          const password_hash = bcrypt.hashSync(newPassword, 10);

          updates.push({
            id: user.id,
            email: newEmail,
            password_hash: password_hash
          });

          credentialsList.push({ email: newEmail, password: newPassword, name: user.full_name });

          // Cuando el lote está lleno o es el último usuario, lo enviamos
          if (updates.length === batchSize || i === users.length - 1) {
            process.stdout.write(`Procesando lote de ${updates.length} usuarios... `);
            try {
                const { error: updateError } = await supabase.from('people').upsert(updates);
                if (updateError) throw updateError;
                console.log('✓ Lote completado.');
            } catch (batchError) {
                console.error(`❌ Falló un lote: ${batchError.message}`);
            }
            updates = []; // Reseteamos el lote
          }
        }

        if (credentialsList.length > 0) {
          const csvHeader = "nombre_completo,email_nuevo,password_nuevo\n";
          const csvBody = credentialsList.map(u => `"${u.name}",${u.email},${u.password}`).join("\n");
          const fileName = `credenciales_fenix_${new Date().toISOString().split('T')[0]}.csv`;
          fs.writeFileSync(fileName, csvHeader + csvBody);
          
          console.log('\n\n✅ ¡PROCESO COMPLETADO!');
          console.log(`Se generó un archivo llamado "${fileName}" con ${credentialsList.length} credenciales.`);
          console.log('Este archivo contiene la lista de NOMBRES, EMAILS y las NUEVAS CONTRASEÑAS.');
        } else {
          console.log('\n\n⚠️ No se actualizó ninguna cuenta.');
        }
        
        rl.close();
    });

  } catch (error) {
    console.error('\n\n💥 ERROR CRÍTICO DURANTE EL PROCESO:', error.message);
    rl.close();
  }
}

updateAndResetAccounts();

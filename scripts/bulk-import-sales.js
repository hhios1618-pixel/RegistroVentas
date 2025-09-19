// Carga las librerías necesarias
const fs = require('fs');
const path = require('path'); // <-- CAMBIO 1: Importamos 'path'
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

// CAMBIO 2: Usamos path.resolve para crear una ruta a prueba de fallos al .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// CAMBIO 3: Añadimos una verificación robusta de las variables
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: No se pudieron cargar las variables de entorno de Supabase.");
  console.error("   Asegúrate de que tu archivo .env.local esté en la raíz del proyecto y contenga NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1); // Detiene el script si faltan las claves
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para "limpiar" nombres y hacerlos coincidir
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function main() {
  console.log('Iniciando script de importación de ventas...');

  // 1. Obtener todos los perfiles de la tabla 'people' para buscar por nombre
  console.log('Obteniendo perfiles del personal desde Supabase...');
  const { data: people, error: peopleError } = await supabase.from('people').select('id, full_name, role, local');
  if (peopleError) {
    console.error('Error al obtener perfiles:', peopleError);
    return;
  }

  // Crear un mapa para búsqueda rápida: 'nombre normalizado' -> { id, full_name, ... }
  const peopleByName = new Map();
  people.forEach(person => {
    if (person.full_name) {
      peopleByName.set(normalizeName(person.full_name), person);
    }
  });
  console.log(`✅ Mapa con ${peopleByName.size} personas creado.`);

  // 2. Leer y procesar el archivo CSV
  const csvPath = 'ventas_importar.csv';
  console.log(`Leyendo archivo ${csvPath}...`);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: No se encontró el archivo ${csvPath} en la raíz del proyecto.`);
    return;
  }
  const fileContent = fs.readFileSync(csvPath);
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`📄 Se encontraron ${records.length} registros de ventas en el CSV.`);

  // 3. Iterar sobre cada venta y crear los registros en Supabase
  for (const record of records) {
    const sellerName = record.vendedora;
    const normalizedSellerName = normalizeName(sellerName);

    const sellerProfile = peopleByName.get(normalizedSellerName);

    if (!sellerProfile) {
      console.warn(`🟠 ADVERTENCIA: No se encontró perfil para la vendedora "${sellerName}". Saltando esta venta.`);
      continue;
    }

    try {
      console.log(`Procesando venta de ${sellerName}...`);
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          seller: sellerProfile.full_name,
          sales_user_id: sellerProfile.id,
          seller_role: sellerProfile.role,
          branch_id: sellerProfile.local || record.sucursal, // Prioriza la sucursal de 'people'
          is_promoter: (sellerProfile.role || '').toUpperCase().includes('PROMOTOR'),
          amount: parseFloat(record.monto_total),
          created_at: new Date(record.fecha),
          order_no: Math.floor(10000 + Math.random() * 90000),
          customer_id: 'bulk-import',
          commission: 0,
          commission_amount: 0,
          sistema: true,
          status: 'confirmed',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      await supabase
        .from('order_items')
        .insert({
          order_id: newOrder.id,
          product_name: record.nombre_producto || 'Producto Vario',
          quantity: parseInt(record.cantidad_productos, 10),
          subtotal: parseFloat(record.monto_total),
          unit_price: parseFloat(record.monto_total) / parseInt(record.cantidad_productos, 10)
        });

      console.log(`-> Venta de ${sellerName} por ${record.monto_total} importada exitosamente.`);

    } catch (err) {
      console.error(`❌ ERROR al importar venta de "${sellerName}":`, err.message);
    }
  }

  console.log('Script de importación finalizado.');
}

main();
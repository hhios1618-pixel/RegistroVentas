const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Variables de entorno de Supabase no configuradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Iniciando script de importación de RESÚMENES MENSUALES...');

  const csvPath = 'ventas_sucursal_importar.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo ${csvPath} en la raíz del proyecto.`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath);
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });
  console.log(`Se encontraron ${records.length} resúmenes mensuales en el CSV.`);

  // Preparamos los datos para una única inserción masiva
  const dataToInsert = records.map(record => ({
    summary_date: record.fecha,
    branch: record.sucursal,
    total_revenue: parseFloat(record.monto_total),
    total_products_sold: parseInt(record.cantidad_productos, 10),
    data_source: `Legacy Import ${new Date().toISOString().split('T')[0]}`
  }));

  try {
    console.log(`Insertando ${dataToInsert.length} registros en la tabla 'monthly_sales_summary'...`);
    
    // Hacemos una sola llamada a la base de datos para insertar todo
    const { error } = await supabase
      .from('monthly_sales_summary')
      .insert(dataToInsert);

    if (error) {
      throw error;
    }

    console.log('✅ ¡Importación completada exitosamente!');

  } catch (err) {
    console.error('❌ ERROR durante la importación masiva:', err.message);
  }
}

main();
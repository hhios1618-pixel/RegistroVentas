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
  console.log('Iniciando script de importación de TOTALES POR SUCURSAL...');

  const csvPath = 'ventas_sucursal_importar.csv'; // Usaremos un nuevo nombre de archivo
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo ${csvPath} en la raíz del proyecto.`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath);
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });
  console.log(`Se encontraron ${records.length} registros de totales por sucursal en el CSV.`);

  for (const record of records) {
    try {
      console.log(`Procesando total de ${record.sucursal} para ${record.fecha}...`);

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          // Creamos una orden "resumen" para el total del mes/sucursal
          seller: `Total ${record.sucursal}`,
          sales_user_id: null, // No se asocia a un usuario específico
          seller_role: 'CONSOLIDADO',
          branch_id: record.sucursal,
          is_promoter: false,
          amount: parseFloat(record.monto_total),
          created_at: new Date(record.fecha),
          order_no: Math.floor(10000 + Math.random() * 90000),
          customer_id: 'historical-import',
          commission: 0,
          commission_amount: 0,
          sistema: true,
          status: 'confirmed',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Creamos un único ítem de orden que representa el total de productos
      await supabase
        .from('order_items')
        .insert({
          order_id: newOrder.id,
          product_name: record.descripcion,
          quantity: parseInt(record.cantidad_productos, 10),
          subtotal: parseFloat(record.monto_total),
          unit_price: parseFloat(record.monto_total) / (parseInt(record.cantidad_productos, 10) || 1),
        });

      console.log(`-> Total de ${record.sucursal} por ${record.monto_total} importado exitosamente.`);

    } catch (err) {
      console.error(`❌ ERROR al importar total de "${record.sucursal}":`, err.message);
    }
  }

  console.log('Script de importación de totales finalizado.');
}

main();
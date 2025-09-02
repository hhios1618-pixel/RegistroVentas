'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  id?: string;
  sale_date: string;
  promoter_name: string;
  origin: string;
  district: string | null;
  warehouse_origin: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
};

type ApiResp = {
  rows: Row[];
  summary: { promoter: string; items: number; total_bs: number }[];
  totalRows: number;
  totalItems: number;
  totalBs: number;
};

const fmt = new Intl.NumberFormat('es-BO');

function toYmd(d: Date) {
  const z = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function PromotoresDetallePage() {
  // rango: últimos 30 días
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30);

  const [from, setFrom] = useState(toYmd(start));
  const [to, setTo] = useState(toYmd(today));
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResp | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const url = `/api/promoters/sales?from=${from}&to=${to}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResp;
      setData(json);
    } catch (e: any) {
      setErr(e?.message || 'Error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const totals = useMemo(() => data?.summary ?? [], [data]);

  // CSV
  const handleCsv = () => {
    const header = [
      'Fecha','Promotor','Origen','Bodega (si encomienda)','Distrito/Zona',
      'Producto','Cod.','Cant.','Unit (Bs)','Total (Bs)','Cliente','WhatsApp','Notas',
    ];
    const lines = rows.map(r => ([
      r.sale_date,
      r.promoter_name,
      r.origin,
      r.warehouse_origin || '',
      r.district || '',
      r.product_name,
      r.product_id || '',
      r.quantity,
      r.unit_price,
      (r.quantity * r.unit_price).toFixed(2),
      r.customer_name || '',
      r.customer_phone || '',
      (r.notes || '').replace(/\n/g, ' ').replace(/;/g, ','),
    ].join(';')));
    const csv = [header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detalle_promotores_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <main className="min-h-screen bg-[#0b0f17] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Detalle de Ventas – Promotores</h1>
            <p className="text-xs text-gray-400 mt-1">
              Rango: {from} → {to}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCsv} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
              Descargar CSV
            </button>
            <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
              Imprimir / PDF
            </button>
          </div>
        </header>

        {/* Filtros */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
            <label className="text-sm text-gray-400">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full bg-[#0b101a] border border-gray-700 rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <div className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
            <label className="text-sm text-gray-400">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full bg-[#0b101a] border border-gray-700 rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <div className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
            <label className="text-sm text-gray-400">Buscar</label>
            <input
              placeholder="promotor, producto, cliente, origen…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              className="mt-1 w-full bg-[#0b101a] border border-gray-700 rounded-lg px-3 py-2 outline-none"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm"
          >
            {loading ? 'Cargando…' : 'Aplicar filtros'}
          </button>
        </div>

        {/* Totales del filtro */}
        <section className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Totales del filtro</p>
              <p className="text-xl font-semibold">
                {fmt.format(data?.totalItems || 0)} ítem(s) · Bs {fmt.format(Math.round(data?.totalBs || 0))}
              </p>
            </div>
          </div>
        </section>

        {/* Totales por promotor */}
        <section className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-3">Totales por promotor</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-400">
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2">Promotor</th>
                  <th className="text-right py-2">Items</th>
                  <th className="text-right py-2">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.promoter} className="border-b border-gray-900">
                    <td className="py-2">{t.promoter}</td>
                    <td className="py-2 text-right">{fmt.format(t.items)}</td>
                    <td className="py-2 text-right">Bs {fmt.format(Math.round(t.total_bs))}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold">{fmt.format(totals.reduce((s, x) => s + x.items, 0))}</td>
                  <td className="py-2 text-right font-semibold">
                    Bs {fmt.format(Math.round(totals.reduce((s, x) => s + x.total_bs, 0)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Tabla detalle */}
        <section className="bg-[#0f1420] border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-3">Vista pensada para auditar y calcular comisiones.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-400">
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Promotor</th>
                  <th className="text-left py-2">Origen</th>
                  <th className="text-left py-2">Bodega (si encomienda)</th>
                  <th className="text-left py-2">Distrito/Zona</th>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-left py-2">Cod.</th>
                  <th className="text-right py-2">Cant.</th>
                  <th className="text-right py-2">Unit (Bs)</th>
                  <th className="text-right py-2">Total (Bs)</th>
                  <th className="text-left py-2">Cliente</th>
                  <th className="text-left py-2">WhatsApp</th>
                  <th className="text-left py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {err && (
                  <tr>
                    <td colSpan={13} className="text-red-400 py-6">
                      {String(err)}
                    </td>
                  </tr>
                )}
                {!err && rows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-gray-500 py-6">
                      Sin datos en el rango.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id || `${r.sale_date}-${i}`} className="border-b border-gray-900">
                    <td className="py-2">{r.sale_date}</td>
                    <td className="py-2">{r.promoter_name}</td>
                    <td className="py-2">{r.origin}</td>
                    <td className="py-2">{r.warehouse_origin || ''}</td>
                    <td className="py-2">{r.district || ''}</td>
                    <td className="py-2">{r.product_name}</td>
                    <td className="py-2">{r.product_id || ''}</td>
                    <td className="py-2 text-right">{fmt.format(r.quantity)}</td>
                    <td className="py-2 text-right">{fmt.format(r.unit_price)}</td>
                    <td className="py-2 text-right">{fmt.format(Math.round(r.quantity * r.unit_price))}</td>
                    <td className="py-2">{r.customer_name || ''}</td>
                    <td className="py-2">{r.customer_phone || ''}</td>
                    <td className="py-2">{r.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-500 mt-4">
            Fuente: <span className="font-mono">public.promoter_sales</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
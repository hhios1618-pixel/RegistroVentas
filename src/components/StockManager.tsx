'use client';
import { useMemo, useState } from 'react';
import { useStock } from '@/lib/stock';
import { Upload, Save, Search, Trash2, Download } from 'lucide-react';

export default function StockManager() {
  const { items, upsertMany, setQty } = useStock();
  const [raw, setRaw] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(it =>
      it.code.toLowerCase().includes(s) || it.name.toLowerCase().includes(s)
    );
  }, [q, items]);

  const parseTSV = (txt: string) => {
    const out: {code:string; name:string; qty:number}[] = [];
    txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).forEach(line=>{
      const parts = line.split(/\t+/);
      if (parts.length >= 3) {
        const [code, name, qtyStr] = parts;
        const qty = Number(qtyStr);
        if (code && name && Number.isFinite(qty)) out.push({ code, name, qty: Math.max(0, Math.floor(qty)) });
      }
    });
    return out;
  };

  const exportCSV = () => {
    const csv = ['code,name,qty', ...items.map(i=>`${i.code},"${i.name.replace(/"/g,'""')}",${i.qty}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stock.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Stock (módulo)</h3>
        <button onClick={exportCSV} className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/60">Pegar TSV: <code>code[TAB]name[TAB]qty</code></label>
          <textarea
            value={raw}
            onChange={e=>setRaw(e.target.value)}
            placeholder={'001\tSOPORTE DE CELULAR METALICO\t20'}
            className="w-full h-28 bg-black/60 border border-white/10 rounded-xl p-2 text-white text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { const items = parseTSV(raw); if (items.length) { upsertMany(items as any); setRaw(''); } }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" /> Cargar / Actualizar
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60">Buscar</label>
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-white/60" />
            <input value={q} onChange={e=>setQ(e.target.value)} className="bg-transparent outline-none text-white text-sm w-full" placeholder="Código o nombre…" />
          </div>
          <div className="max-h-48 overflow-auto mt-2 space-y-1">
            {filtered.map(it=>(
              <div key={it.code} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="text-white text-sm">
                  <span className="font-mono text-white/80 mr-2">{it.code}</span>{it.name}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={it.qty}
                    min={0}
                    onChange={e=>setQty(it.code, Number(e.target.value))}
                    className="w-20 bg-black/60 border border-white/10 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              </div>
            ))}
            {filtered.length===0 && <div className="text-white/50 text-sm py-4">Sin resultados</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
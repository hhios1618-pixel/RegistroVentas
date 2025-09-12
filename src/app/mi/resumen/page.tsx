'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function MiResumenPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const { data: att, isLoading: attLoading } = useSWR(`/endpoints/my/attendance?month=${month}`, fetcher);
  const { data: sal, isLoading: salLoading } = useSWR(`/endpoints/my/sales?month=${month}`, fetcher);

  const name = me?.full_name || '—';

  const attKpis = att?.kpis ?? { dias_con_marca:0, entradas:0, salidas:0, pct_geocerca_ok:0 };
  const salKpis = sal?.kpis ?? { ventas:0, pedidos:0, total:0 };

  return (
    <div style={{minHeight:'100dvh',padding:'24px',background:'#0f172a',color:'#e5e7eb',fontFamily:'system-ui'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800}}>Mi resumen</h1>
          <div style={{opacity:.8}}>Asistencia y ventas del mes</div>
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{opacity:.8}}>Mes</div>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{background:'#0b1220',color:'white',border:'1px solid #334155',borderRadius:8,padding:'8px'}} />
        </div>
      </header>

      {/* Identidad */}
      <section style={{marginBottom:20,display:'grid',gap:8}}>
        <div style={{display:'grid',gridTemplateColumns:'120px 1fr',gap:12}}>
          <div style={{opacity:.8}}>Usuario</div>
          <div style={{background:'#0b1220',border:'1px solid #334155',borderRadius:10,padding:'10px 12px'}}>{name}</div>
        </div>
      </section>

      {/* KPIs */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:24}}>
        <Kpi title="Días con marca" value={attKpis.dias_con_marca} />
        <Kpi title="Entradas" value={attKpis.entradas} />
        <Kpi title="Salidas" value={attKpis.salidas} />
        <Kpi title="% Geo OK" value={attKpis.pct_geocerca_ok} suffix="%" />
        <Kpi title="Ventas" value={salKpis.ventas} />
        <Kpi title="Pedidos" value={salKpis.pedidos} />
        <Kpi title="Total Bs" value={salKpis.total} money />
      </section>

      <div style={{display:'grid',gridTemplateColumns:'2fr 3fr',gap:16}}>
        {/* Asistencia timeline */}
        <div style={{background:'rgba(30,41,59,.6)',border:'1px solid rgba(148,163,184,.1)',borderRadius:16,padding:16}}>
          <h3 style={{marginTop:0}}>Asistencia</h3>
          {attLoading ? 'Cargando…' : (
            <div style={{display:'grid',gap:12}}>
              {att?.days?.length ? att.days.map((d:any)=>(
                <div key={d.date} style={{background:'#0b1220',border:'1px solid #334155',borderRadius:12,padding:12}}>
                  <div style={{fontWeight:700,marginBottom:8}}>{d.date}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {d.marks.map((m:any)=>(
                      <span key={m.id} style={{
                        padding:'6px 8px',borderRadius:10,border:'1px solid #334155',background:m.type==='in'?'#064e3b':'#3f0a0a',
                        color:'white',fontSize:12
                      }}>
                        {m.type.toUpperCase()} · {new Date(m.taken_at).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}
                        {typeof m.distance_m==='number' && <span style={{opacity:.8}}> · {Math.round(m.distance_m)}m</span>}
                        {m.site_name && <span style={{opacity:.8}}> · {m.site_name}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )) : <div style={{opacity:.8}}>Sin marcas este mes.</div>}
            </div>
          )}
        </div>

        {/* Ventas + Top productos */}
        <div style={{display:'grid',gap:16}}>
          <div style={{background:'rgba(30,41,59,.6)',border:'1px solid rgba(148,163,184,.1)',borderRadius:16,padding:16}}>
            <h3 style={{marginTop:0}}>Top productos</h3>
            {salLoading ? 'Cargando…' : (
              <div style={{display:'grid',gap:8}}>
                {sal?.topProducts?.length ? sal.topProducts.map((p:any)=>(
                  <div key={p.name} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px dashed #334155',padding:'6px 0'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{width:8,height:8,borderRadius:4,background:'#22d3ee'}}/>
                      <div>{p.name}</div>
                    </div>
                    <div style={{opacity:.9}}>{p.qty} uds · Bs {Math.round(p.amount).toLocaleString('es-BO')}</div>
                  </div>
                )) : <div style={{opacity:.8}}>Sin ventas este mes.</div>}
              </div>
            )}
          </div>

          <div style={{background:'rgba(30,41,59,.6)',border:'1px solid rgba(148,163,184,.1)',borderRadius:16,padding:16,overflow:'auto',maxHeight:380}}>
            <h3 style={{marginTop:0}}>Mis ventas</h3>
            {salLoading ? 'Cargando…' : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{textAlign:'left',opacity:.8}}>
                    <th style={{padding:'8px 6px',borderBottom:'1px solid #334155'}}>Fecha</th>
                    <th style={{padding:'8px 6px',borderBottom:'1px solid #334155'}}>Pedido</th>
                    <th style={{padding:'8px 6px',borderBottom:'1px solid #334155'}}>Producto</th>
                    <th style={{padding:'8px 6px',borderBottom:'1px solid #334155'}}>Cant</th>
                    <th style={{padding:'8px 6px',borderBottom:'1px solid #334155'}}>Total (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  {sal?.list?.map((r:any)=>(
                    <tr key={r.id}>
                      <td style={{padding:'8px 6px',borderBottom:'1px solid #1f2937'}}>{r.order_date?.slice(0,10)}</td>
                      <td style={{padding:'8px 6px',borderBottom:'1px solid #1f2937'}}>{r.order_id}</td>
                      <td style={{padding:'8px 6px',borderBottom:'1px solid #1f2937'}}>{r.product_name}</td>
                      <td style={{padding:'8px 6px',borderBottom:'1px solid #1f2937'}}>{r.qty}</td>
                      <td style={{padding:'8px 6px',borderBottom:'1px solid #1f2937'}}>{
                        Number(r.total||0).toLocaleString('es-BO',{maximumFractionDigits:2})
                      }</td>
                    </tr>
                  ))}
                  {!sal?.list?.length && (
                    <tr><td colSpan={5} style={{padding:'12px 6px',opacity:.8}}>Sin ventas.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, suffix='', money=false }:{title:string; value:number; suffix?:string; money?:boolean}) {
  return (
    <div style={{background:'rgba(30,41,59,.6)',border:'1px solid rgba(148,163,184,.1)',borderRadius:16,padding:16}}>
      <div style={{opacity:.8,marginBottom:6}}>{title}</div>
      <div style={{fontSize:22,fontWeight:800}}>
        {money ? 'Bs ' : ''}{Number(value||0).toLocaleString('es-BO')}{suffix}
      </div>
    </div>
  );
}
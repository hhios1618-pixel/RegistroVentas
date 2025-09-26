'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarDays, ShieldCheck, UploadCloud, User2, Clock3, Image as ImageIcon,
} from 'lucide-react';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

type Role = 'admin'|'promotor'|'coordinador'|'lider'|'asesor'|'unknown';
const norm = (r?: string): Role => {
  const x = (r || '').toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(x)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(x)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(x)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(x)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(x)) return 'asesor';
  return 'unknown';
};

type PermissionKind =
  | 'Enfermedad'
  | 'Accidente'
  | 'Consulta médica'
  | 'Duelo'
  | 'Trámite administrativo'
  | 'Estudios/Capacitación'
  | 'Maternidad/Paternidad'
  | 'Otros';

export default function SolicitarPermisoPage() {
  const router = useRouter();
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = useMemo(() => norm(me?.role), [me?.role]);

  // Form state
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10)); // YYYY-MM-DD
  const [partial, setPartial] = useState<boolean>(false);
  const [start, setStart] = useState<string>('09:00');
  const [end, setEnd] = useState<string>('18:00');
  const [kind, setKind] = useState<PermissionKind>('Trámite administrativo');
  const [notes, setNotes] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [proofUrl, setProofUrl] = useState<string>('');

  // Acción: subir imagen
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/endpoints/permissions/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('No se pudo subir la imagen');
      const { url } = await r.json();
      setProofUrl(url);
    } catch (e:any) {
      alert(e.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = date && (!partial || (start && end));

  // Acción: enviar solicitud
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const body = {
        date,
        type: partial ? 'parcial' : 'total',
        start_time: partial ? start : null,
        end_time: partial ? end : null,
        reason: kind,
        notes,
        proof_url: proofUrl || null,
        status: 'pendiente', // estado inicial
      };
      const r = await fetch('/endpoints/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('No se pudo enviar la solicitud');
      router.replace('/mi/resumen'); // o a una página de “mis solicitudes” si la creas
    } catch (e:any) {
      alert(e.message || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const name = me?.full_name || '—';

  return (
    <div
      className="
        min-h-screen text-white
        bg-[#000]
        [background-repeat:no-repeat]
      "
      style={{
        backgroundImage:
          `radial-gradient(900px 500px at 90% -20%, rgba(168,85,247,.12), transparent 55%),
           radial-gradient(1200px 600px at 20% -10%, rgba(96,165,250,.14), transparent 60%)`,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-sticky border-b border-[var(--app-border)] bg-black/30 backdrop-blur-apple">
        <div className="apple-container py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="pill"><ShieldCheck size={18} /></div>
            <div>
              <h1 className="apple-h1">Solicitud de permiso</h1>
              <p className="apple-caption">Registra permisos parciales o totales</p>
            </div>
          </div>
        </div>
      </header>

      <main className="apple-container py-8 space-y-8">
        {/* Identidad */}
        <section className="glass-card">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
            <div className="flex items-center gap-2 text-app-muted">
              <User2 size={18} />
              <span className="apple-footnote font-semibold">Usuario</span>
            </div>
            <div className="field">{name}</div>
          </div>
        </section>

        {/* Formulario */}
        <section className="glass-card">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fecha & tipo */}
            <div className="space-y-4">
              <label className="apple-caption">Fecha</label>
              <div className="flex items-center gap-2">
                <span className="pill"><CalendarDays size={16} /></span>
                <input
                  type="date"
                  value={date}
                  onChange={(e)=>setDate(e.target.value)}
                  className="field-sm"
                />
              </div>

              <div className="divider my-4" />

              <div className="flex items-center justify-between">
                <span className="apple-caption">Tipo de permiso</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={()=>setPartial(false)}
                    className={`btn-sm ${!partial ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    onClick={()=>setPartial(true)}
                    className={`btn-sm ${partial ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Parcial
                  </button>
                </div>
              </div>

              {/* Horarios si es parcial */}
              {partial && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="apple-caption">Inicio</label>
                    <div className="flex items-center gap-2">
                      <span className="pill"><Clock3 size={16} /></span>
                      <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="field-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="apple-caption">Fin</label>
                    <div className="flex items-center gap-2">
                      <span className="pill"><Clock3 size={16} /></span>
                      <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="field-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Motivo, notas y adjunto */}
            <div className="space-y-4">
              <div>
                <label className="apple-caption">Motivo (RRHH)</label>
                <select
                  value={kind}
                  onChange={(e)=>setKind(e.target.value as PermissionKind)}
                  className="field-sm"
                >
                  {[
                    'Enfermedad','Accidente','Consulta médica','Duelo',
                    'Trámite administrativo','Estudios/Capacitación',
                    'Maternidad/Paternidad','Otros'
                  ].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div>
                <label className="apple-caption">Observaciones</label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e)=>setNotes(e.target.value)}
                  placeholder="Detalles relevantes: síntomas, lugar del trámite, número de parte, etc."
                  className="field"
                />
              </div>

              <div className="space-y-2">
                <label className="apple-caption">Adjuntar respaldo (opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e)=>setFile(e.target.files?.[0] || null)}
                    className="field"
                  />
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="btn-secondary btn-sm"
                  >
                    <UploadCloud size={16} /> {uploading ? 'Subiendo…' : 'Subir'}
                  </button>
                </div>
                {proofUrl && (
                  <div className="flex items-center gap-2 apple-caption">
                    <span className="pill"><ImageIcon size={14} /></span>
                    Respaldo listo
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button className="btn-ghost btn-sm" onClick={()=>router.back()}>Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="btn-primary btn-sm"
            >
              <ShieldCheck size={16}/> {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
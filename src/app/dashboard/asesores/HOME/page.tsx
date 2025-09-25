import Link from 'next/link';

export default function AsesoresHomePage() {
  return (
    <div className="relative z-10 min-h-[60vh] p-6 pointer-events-auto">
      <h1 className="text-xl font-semibold text-white mb-4">
        Panel Asesores
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Mi resumen"
          desc="Mis ventas y mi asistencia (mes actual)."
          href="/mi/resumen"
        />
        <Card
          title="Registro de Ventas"
          desc="Captura rápida de ventas diarias."
          href="/dashboard/asesores/registro"
        />
        <Card
          title="Asistencia"
          desc="Marcar entrada/salida y revisar marcas."
          href="/asistencia"
        />
        <Card
          title="Devoluciones"
          desc="Gestión de devoluciones y seguimiento."
          href="/dashboard/asesores/devoluciones"
        />
        <Card
          title="Playbook WhatsApp"
          desc="Guías y scripts para contacto."
          href="/dashboard/asesores/playbook-whatsapp"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[#30363D] bg-[#161B22] p-4 hover:border-cyan-500 transition focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
    >
      <div className="text-white font-medium">{title}</div>
      <div className="text-sm text-[#8B949E]">{desc}</div>
    </Link>
  );
}

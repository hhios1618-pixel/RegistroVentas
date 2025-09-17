'use client';

import useSWR from 'swr';
import { Sidebar } from '@/components/nav/Sidebar';
import { normalizeRole, type Role } from '@/components/nav/roles';

const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = normalizeRole(me?.role);
  const name = me?.full_name || 'Usuario';

  return (
    <div className="flex min-h-screen bg-[#0D1117] text-[#C9D1D9]">
      <Sidebar userRole={role} userName={name} />
      <main className="flex-1 lg:ml-72">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
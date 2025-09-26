'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AsesoresIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/asesores/home'); }, [router]);
  return null;
}
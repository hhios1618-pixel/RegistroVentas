// lib/stock.ts
export type StockItem = { code: string; name: string; qty: number };
const STOCK_KEY = 'fenix_stock_v1';

const read = (): Record<string, StockItem> => {
  try { return JSON.parse(localStorage.getItem(STOCK_KEY) || '{}'); } catch { return {}; }
};
const write = (map: Record<string, StockItem>) => {
  localStorage.setItem(STOCK_KEY, JSON.stringify(map));
  // notificar a otros tabs/components
  window.dispatchEvent(new Event('fenix:stock:update'));
};

export const upsertMany = (items: StockItem[]) => {
  const map = read();
  for (const it of items) {
    const k = it.code.trim();
    const prev = map[k]?.qty ?? 0;
    map[k] = { code: k, name: it.name, qty: it.qty ?? prev };
  }
  write(map);
};

export const listStock = (): StockItem[] => Object.values(read()).sort((a,b)=>a.code.localeCompare(b.code));
export const getStock = (code: string): StockItem | undefined => read()[code.trim()];
export const setQty = (code: string, qty: number) => {
  const map = read();
  const k = code.trim();
  if (!map[k]) map[k] = { code: k, name: '', qty: 0 };
  map[k].qty = Math.max(0, Math.floor(qty));
  write(map);
};
export const adjustQty = (code: string, delta: number) => {
  const cur = getStock(code)?.qty ?? 0;
  setQty(code, cur + delta);
};

// React hook (escucha cambios)
import { useEffect, useMemo, useState } from 'react';
export function useStock() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick(t => t+1);
    window.addEventListener('storage', fn);            // cambios inter-tab
    window.addEventListener('fenix:stock:update', fn); // cambios intra-tab
    return () => {
      window.removeEventListener('storage', fn);
      window.removeEventListener('fenix:stock:update', fn);
    };
  }, []);
  const items = useMemo(() => listStock(), [tick]);
  const byCode = (code: string) => getStock(code)?.qty ?? 0;
  return { items, byCode, setQty, adjustQty, upsertMany };
}
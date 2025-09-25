'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Loader2, Package, MoveRight, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';

type Site = {
  id: string;
  name: string | null;
  is_active: boolean | null;
};

type ProductStock = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string | null;
  is_active: boolean | null;
  total_quantity: number;
  stock: {
    site_id: string;
    site_name: string | null;
    quantity: number;
    updated_at: string | null;
  }[];
};

type SummaryResponse = {
  ok: boolean;
  products: ProductStock[];
  sites: Site[];
};

type TransfersResponse = {
  ok: boolean;
  transfers: {
    id: string;
    product_id: string;
    product: { id: string; sku: string; name: string } | null;
    from_site: { id: string; name: string | null } | null;
    to_site: { id: string; name: string | null } | null;
    quantity: number;
    status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
  }[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'request_failed');
  }
  return json;
};

export default function InventarioDashboard() {
  const { data: summary, isLoading: loadingSummary, error: summaryError, mutate } = useSWR<SummaryResponse>('/endpoints/inventory/summary', fetcher);
  const { data: transfersData, isLoading: loadingTransfers, mutate: mutateTransfers } = useSWR<TransfersResponse>('/endpoints/inventory/transfers', fetcher);

  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    site_id: '',
    quantity_delta: 0,
    reason: '',
    submitting: false,
    message: '',
    error: '',
  });

  const [transferForm, setTransferForm] = useState({
    product_id: '',
    from_site_id: '',
    to_site_id: '',
    quantity: 0,
    notes: '',
    submitting: false,
    message: '',
    error: '',
  });

  const sites = useMemo(() => summary?.sites ?? [], [summary]);
  const products = useMemo(() => summary?.products ?? [], [summary]);

  const siteOptions = useMemo(() => sites.filter((s) => s.is_active !== false), [sites]);

  const productOptions = useMemo(() => products, [products]);

  const handleAdjustSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdjustForm((prev) => ({ ...prev, submitting: true, message: '', error: '' }));
    try {
      const res = await fetch('/endpoints/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustForm.product_id,
          site_id: adjustForm.site_id,
          quantity_delta: Number(adjustForm.quantity_delta),
          reason: adjustForm.reason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'adjust_failed');
      }
      setAdjustForm((prev) => ({
        ...prev,
        message: 'Inventario actualizado correctamente.',
        error: '',
        submitting: false,
      }));
      mutate();
      mutateTransfers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el inventario';
      setAdjustForm((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleTransferSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTransferForm((prev) => ({ ...prev, submitting: true, message: '', error: '' }));
    try {
      const res = await fetch('/endpoints/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: transferForm.product_id,
          from_site_id: transferForm.from_site_id,
          to_site_id: transferForm.to_site_id,
          quantity: Number(transferForm.quantity),
          notes: transferForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'transfer_failed');
      }
      setTransferForm((prev) => ({
        ...prev,
        submitting: false,
        message: 'Transferencia registrada. El inventario de destino quedará pendiente hasta confirmar recepción.',
        error: '',
      }));
      mutate();
      mutateTransfers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar la transferencia';
      setTransferForm((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleTransferAction = async (transferId: string, action: 'confirm' | 'cancel') => {
    try {
      const res = await fetch(`/endpoints/inventory/transfers/${transferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'action_failed');
      }
      mutate();
      mutateTransfers();
    } catch (error) {
      console.error('[inventory] transfer action failed', error);
      alert('No se pudo actualizar el estado de la transferencia.');
    }
  };

  const renderSummary = () => {
    if (loadingSummary) {
      return (
        <div className="glass-card flex items-center gap-3">
          <Loader2 className="animate-spin" size={18} />
          <span className="apple-body">Cargando inventario…</span>
        </div>
      );
    }

    if (summaryError) {
      return (
        <div className="glass-card border-apple-red-500/30 text-apple-red-300">
          Error al cargar el inventario.
        </div>
      );
    }

    if (!products.length) {
      return (
        <div className="glass-card text-apple-gray-400">
          Aún no hay productos registrados en inventario.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {products.map((product) => (
          <div key={product.id} className="glass-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="apple-h3 flex items-center gap-2">
                  <Package size={18} />
                  {product.name}
                </h3>
                <p className="apple-caption">SKU: {product.sku}</p>
                {product.description && (
                  <p className="apple-caption text-apple-gray-300 mt-1">{product.description}</p>
                )}
              </div>
              <div className="text-right">
                <span className="apple-caption text-apple-gray-400 block">Total</span>
                <span className="apple-h3 text-apple-green-300">{product.total_quantity.toLocaleString()} {product.unit ?? 'unid'}</span>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-apple-gray-400">
                    <th className="py-2">Sucursal</th>
                    <th className="py-2">Cantidad</th>
                    <th className="py-2">Última actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {siteOptions.map((site) => {
                    const row = product.stock.find((s) => s.site_id === site.id);
                    return (
                      <tr key={site.id} className="border-t border-white/5">
                        <td className="py-2 text-white">{site.name ?? 'Sin nombre'}</td>
                        <td className="py-2">
                          <span className="text-apple-blue-200 font-semibold">
                            {row ? row.quantity.toLocaleString() : '0'}
                          </span>
                        </td>
                        <td className="py-2 text-apple-gray-500">
                          {row?.updated_at ? new Date(row.updated_at).toLocaleString('es-BO') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTransfers = () => {
    if (loadingTransfers) {
      return (
        <div className="glass-card flex items-center gap-3">
          <Loader2 className="animate-spin" size={18} />
          <span className="apple-body">Cargando movimientos…</span>
        </div>
      );
    }

    const transfers = transfersData?.transfers ?? [];
    if (!transfers.length) {
      return (
        <div className="glass-card text-apple-gray-400">
          No hay transferencias registradas recientemente.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="glass-card flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="apple-caption text-apple-gray-500">
                  {new Date(transfer.created_at).toLocaleString('es-BO')}
                </p>
                <h4 className="apple-body font-semibold">
                  {transfer.product?.name || 'Producto'}
                  <span className="text-apple-gray-400 ml-2">({transfer.product?.sku || '—'})</span>
                </h4>
              </div>
              <div className="text-right">
                <span className="apple-caption block text-apple-gray-500">Cantidad</span>
                <span className="apple-body font-semibold">{transfer.quantity}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-apple-gray-300">
              <span className="flex items-center gap-2">
                {transfer.from_site?.name || 'Origen desconocido'}
                <MoveRight size={14} />
                {transfer.to_site?.name || 'Destino desconocido'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-apple-caption2 border border-white/20">
                Estado: {estadoLabel(transfer.status)}
              </span>
              {transfer.notes && <span>Notas: {transfer.notes}</span>}
            </div>
            {transfer.status === 'in_transit' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleTransferAction(transfer.id, 'confirm')}
                  className="btn-success btn-sm flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Confirmar recepción
                </button>
                <button
                  onClick={() => handleTransferAction(transfer.id, 'cancel')}
                  className="btn-warning btn-sm flex items-center gap-2"
                >
                  <XCircle size={16} /> Cancelar y devolver
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="glass-card flex flex-col gap-4">
        <div>
          <h1 className="apple-h1">Inventario General</h1>
          <p className="apple-caption">
            Controla el stock total de productos, registra ingresos y gestiona transferencias entre sucursales.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={handleAdjustSubmit} className="glass-card bg-white/5">
            <h2 className="apple-h3 mb-3 flex items-center gap-2">
              <PlusCircle size={18} /> Ajustar inventario
            </h2>
            <div className="space-y-3">
              <div>
                <label className="apple-caption block mb-1">Producto</label>
                <select
                  required
                  value={adjustForm.product_id}
                  onChange={(event) => setAdjustForm((prev) => ({ ...prev, product_id: event.target.value }))}
                  className="field"
                >
                  <option value="">Selecciona producto</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="apple-caption block mb-1">Sucursal</label>
                <select
                  required
                  value={adjustForm.site_id}
                  onChange={(event) => setAdjustForm((prev) => ({ ...prev, site_id: event.target.value }))}
                  className="field"
                >
                  <option value="">Selecciona sucursal</option>
                  {siteOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="apple-caption block mb-1">Cantidad (+/-)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={adjustForm.quantity_delta}
                  onChange={(event) => setAdjustForm((prev) => ({ ...prev, quantity_delta: Number(event.target.value) }))}
                  className="field"
                />
              </div>
              <div>
                <label className="apple-caption block mb-1">Motivo</label>
                <input
                  type="text"
                  placeholder="Compra, ajuste de inventario, etc."
                  value={adjustForm.reason}
                  onChange={(event) => setAdjustForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className="field"
                />
              </div>
              {adjustForm.error && (
                <div className="text-apple-red-300 text-sm">{adjustForm.error}</div>
              )}
              {adjustForm.message && (
                <div className="text-apple-green-300 text-sm">{adjustForm.message}</div>
              )}
              <button
                type="submit"
                className="btn-success w-full flex items-center justify-center gap-2"
                disabled={adjustForm.submitting}
              >
                {adjustForm.submitting && <Loader2 className="animate-spin" size={16} />}
                Registrar ajuste
              </button>
            </div>
          </form>

          <form onSubmit={handleTransferSubmit} className="glass-card bg-white/5">
            <h2 className="apple-h3 mb-3 flex items-center gap-2">
              <MoveRight size={18} /> Transferir entre sucursales
            </h2>
            <div className="space-y-3">
              <div>
                <label className="apple-caption block mb-1">Producto</label>
                <select
                  required
                  value={transferForm.product_id}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, product_id: event.target.value }))}
                  className="field"
                >
                  <option value="">Selecciona producto</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="apple-caption block mb-1">Sucursal origen</label>
                  <select
                    required
                    value={transferForm.from_site_id}
                    onChange={(event) => setTransferForm((prev) => ({ ...prev, from_site_id: event.target.value }))}
                    className="field"
                  >
                    <option value="">Selecciona origen</option>
                    {siteOptions.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="apple-caption block mb-1">Sucursal destino</label>
                  <select
                    required
                    value={transferForm.to_site_id}
                    onChange={(event) => setTransferForm((prev) => ({ ...prev, to_site_id: event.target.value }))}
                    className="field"
                  >
                    <option value="">Selecciona destino</option>
                    {siteOptions.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="apple-caption block mb-1">Cantidad a transferir</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={transferForm.quantity}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                  className="field"
                />
              </div>
              <div>
                <label className="apple-caption block mb-1">Notas</label>
                <input
                  type="text"
                  placeholder="Folio de compra, transporte, etc."
                  value={transferForm.notes}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="field"
                />
              </div>
              {transferForm.error && (
                <div className="text-apple-red-300 text-sm">{transferForm.error}</div>
              )}
              {transferForm.message && (
                <div className="text-apple-green-300 text-sm">{transferForm.message}</div>
              )}
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={transferForm.submitting}
              >
                {transferForm.submitting && <Loader2 className="animate-spin" size={16} />}
                Registrar transferencia
              </button>
            </div>
          </form>
        </div>
      </header>

      <section>{renderSummary()}</section>

      <section>
        <h2 className="apple-h2 mb-4">Transferencias recientes</h2>
        {renderTransfers()}
      </section>
    </div>
  );
}

function estadoLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'in_transit':
      return 'En tránsito';
    case 'completed':
      return 'Recepcionado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

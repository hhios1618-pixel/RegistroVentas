"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- DEFINICIÓN DE TIPOS PARA TYPESCRIPT ---
// Esto resuelve todos los errores de tipado que encontraste.
interface ProductSearchResult {
  id: number;
  name: string;
  stock: number | null;
}

interface OrderItem {
  name: string;
  qty: number;
  unit_price: number;
  sale_type: 'mayor' | 'detalle' | null;
  is_recognized: boolean;
}

interface OrderState {
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  is_encomienda: boolean | null;
  location: string | null;
  destino: string;
  payment_method: string;
  seller_id: string;
}

interface NewItemState {
    name: string;
    qty: number;
    unit_price: string;
    sale_type: 'mayor' | 'detalle' | null;
    is_recognized: boolean;
}

interface SuccessInfo {
  id: number;
  order_no: number | string | null;
}


// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL o Anon Key no están definidas en las variables de entorno.");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

const getInitialOrderState = (): OrderState => ({
    items: [],
    customer_name: '',
    customer_phone: '',
    is_encomienda: null,
    location: null,
    destino: '',
    payment_method: '',
    seller_id: 'UUID-DEL-VENDEDOR-LOGUEADO' // Placeholder
});

// --- COMPONENTE PRINCIPAL ---
export default function SalesRegistryPage() {
    const [order, setOrder] = useState<OrderState>(getInitialOrderState());
    const [currentStep, setCurrentStep] = useState('products');
    const [isLoading, setIsLoading] = useState(false);
    const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);

    const [productQuery, setProductQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
    const [newItem, setNewItem] = useState<NewItemState>({ name: '', qty: 1, unit_price: '', sale_type: null, is_recognized: false });

    useEffect(() => {
        const search = async () => {
            if (productQuery.length < 3) {
                setSearchResults([]);
                return;
            }
            const { data } = await supabase.from('products').select('id, name, stock').ilike('name', `%${productQuery}%`).limit(5);
            setSearchResults(data || []);
        };
        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [productQuery]);

    const handleAddItem = () => {
        if (!newItem.name || !newItem.qty) return;
        const finalItem: OrderItem = {
            ...newItem,
            unit_price: parseFloat(newItem.unit_price) || 0,
        };
        setOrder(prev => ({ ...prev, items: [...prev.items, finalItem] }));
        setNewItem({ name: '', qty: 1, unit_price: '', sale_type: null, is_recognized: false });
        setProductQuery('');
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setOrder(prev => ({ ...prev, items: prev.items.filter((_, index) => index !== indexToRemove) }));
    };

    const updateItem = (index: number, updates: Partial<OrderItem>) => {
        setOrder(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item)
        }));
    };

    const advanceFlow = () => {
        const itemWithoutSaleType = order.items.findIndex(item => !item.sale_type);
        if (itemWithoutSaleType !== -1) {
            setCurrentStep(`awaiting_sale_type_${itemWithoutSaleType}`);
            return;
        }
        
        const itemWithoutPrice = order.items.findIndex(item => item.unit_price === null || item.unit_price === undefined);
         if (itemWithoutPrice !== -1) {
            setCurrentStep(`awaiting_price_${itemWithoutPrice}`);
            return;
        }

        if (!order.customer_name || !order.customer_phone) {
            setCurrentStep('awaiting_customer');
            return;
        }

        if (order.is_encomienda === null) {
            setCurrentStep('awaiting_order_type');
            return;
        }
        
        if (order.is_encomienda && !order.destino) {
            setCurrentStep('awaiting_destination');
            return;
        }
        if (!order.is_encomienda && !order.location) {
            setCurrentStep('awaiting_location');
            return;
        }
        
        if (!order.payment_method) {
            setCurrentStep('awaiting_payment');
            return;
        }

        setCurrentStep('confirming');
    };

    const handleSaveOrder = async () => {
        setIsLoading(true);
        const total_amount = order.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        
        const { data: orderData, error: orderError } = await supabase.from('orders').insert({
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            is_encomienda: order.is_encomienda,
            location: order.is_encomienda ? null : { address: order.location },
            destino: order.is_encomienda ? order.destino : null,
            payment_method: order.payment_method,
            seller_id: order.seller_id,
            total_amount,
            status: 'pending'
        }).select('id, order_no').single();

        if (orderError) {
            alert(`Error al guardar pedido: ${orderError.message}`);
            setIsLoading(false);
            return;
        }

        const orderId = orderData.id;
        const orderItemsPayload = order.items.map(item => ({
            order_id: orderId,
            product_name: item.name,
            quantity: item.qty,
            unit_price: item.unit_price,
            sale_type: item.sale_type
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);

        if (itemsError) {
            alert(`Pedido #${orderId} guardado, pero falló al guardar productos: ${itemsError.message}`);
            setIsLoading(false);
            return;
        }

        setSuccessInfo({ id: orderData.id, order_no: orderData.order_no });
        setIsLoading(false);
    };

    if (successInfo) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg max-w-lg mx-auto">
                <h2 className="text-3xl font-bold text-green-400 mb-4">¡Pedido Guardado con Éxito!</h2>
                <p className="text-lg text-gray-300">Se ha registrado el pedido: <strong className="text-white">#{successInfo.order_no || successInfo.id}</strong></p>
                <button onClick={() => { setOrder(getInitialOrderState()); setCurrentStep('products'); setSuccessInfo(null); }} className="mt-8 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg text-lg">
                    Registrar Nuevo Pedido
                </button>
            </div>
        );
    }
    
    const renderStepContent = () => {
        if (currentStep.startsWith('awaiting_sale_type_')) {
            const index = parseInt(currentStep.split('_')[3]);
            const item = order.items[index];
            return (
                <div>
                    <h3 className="text-lg mb-4">Para <strong>{item?.name}</strong>, ¿es venta por mayor o detalle?</h3>
                    <div className="flex gap-4">
                        <button onClick={() => { updateItem(index, { sale_type: 'mayor' }); advanceFlow(); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">📦 Por Mayor</button>
                        <button onClick={() => { updateItem(index, { sale_type: 'detalle' }); advanceFlow(); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">🛍️ Al Detalle</button>
                    </div>
                </div>
            );
        }
        
         if (currentStep.startsWith('awaiting_price_')) {
            const index = parseInt(currentStep.split('_')[2]);
            const item = order.items[index];
            return (
                <div>
                    <h3 className="text-lg mb-2">¿Cuál es el precio unitario (Bs.) para <strong>{item?.name}</strong>?</h3>
                    <input type="number" onBlur={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })} placeholder="Ej: 80.00" autoFocus className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                    <button onClick={advanceFlow} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded">Confirmar Precio</button>
                </div>
            );
        }

        switch (currentStep) {
            case 'awaiting_customer':
                return (
                    <div>
                        <h3 className="text-lg mb-2">Datos del Cliente</h3>
                        <input type="text" value={order.customer_name} onChange={e => setOrder(p => ({...p, customer_name: e.target.value}))} placeholder="Nombre Completo" className="w-full bg-gray-700 rounded p-2 border border-gray-600 mb-2" />
                        <input type="tel" value={order.customer_phone} onChange={e => setOrder(p => ({...p, customer_phone: e.target.value}))} placeholder="Teléfono" className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                        <button onClick={advanceFlow} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded">Siguiente</button>
                    </div>
                );
            case 'awaiting_order_type':
                 return (
                    <div>
                        <h3 className="text-lg mb-4">¿El pedido es para entrega local o encomienda?</h3>
                        <div className="flex gap-4">
                            <button onClick={() => { setOrder(p => ({...p, is_encomienda: false})); advanceFlow(); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">🛵 Entrega Local</button>
                            <button onClick={() => { setOrder(p => ({...p, is_encomienda: true})); advanceFlow(); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">📦 Encomienda</button>
                        </div>
                    </div>
                );
            case 'awaiting_destination':
                 return (
                    <div>
                        <h3 className="text-lg mb-2">Destino de la Encomienda</h3>
                        <input type="text" defaultValue={order.destino} onBlur={(e) => setOrder(p => ({...p, destino: e.target.value}))} placeholder="Ciudad o Departamento" autoFocus className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                        <button onClick={advanceFlow} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded">Siguiente</button>
                    </div>
                );
             case 'awaiting_location':
                 return (
                    <div>
                        <h3 className="text-lg mb-2">Ubicación de Entrega Local</h3>
                        <input type="text" defaultValue={order.location || ''} onBlur={(e) => setOrder(p => ({...p, location: e.target.value}))} placeholder="Dirección o link de Google Maps" autoFocus className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                        <button onClick={advanceFlow} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded">Siguiente</button>
                    </div>
                );
            case 'awaiting_payment':
                 return (
                    <div>
                        <h3 className="text-lg mb-4">Método de Pago</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { setOrder(p => ({...p, payment_method: 'Efectivo'})); advanceFlow(); }} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">💵 Efectivo</button>
                            <button onClick={() => { setOrder(p => ({...p, payment_method: 'QR'})); advanceFlow(); }} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">📲 QR</button>
                            <button onClick={() => { setOrder(p => ({...p, payment_method: 'Transferencia'})); advanceFlow(); }} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">🏦 Transferencia</button>
                        </div>
                    </div>
                );
            case 'confirming':
                const total = order.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2">Resumen Final</h3>
                        <div className="space-y-1 text-left bg-gray-700/50 p-4 rounded">
                            <p><strong>Cliente:</strong> {order.customer_name} ({order.customer_phone})</p>
                            <p><strong>Entrega:</strong> {order.is_encomienda ? `Encomienda a ${order.destino}` : `Local en ${order.location}`}</p>
                            <p><strong>Pago:</strong> {order.payment_method}</p>
                            <ul className="list-disc list-inside pt-2">
                                {order.items.map((item, i) => <li key={i}>{item.qty} x {item.name} ({item.sale_type}) @ Bs. {item.unit_price.toFixed(2)}</li>)}
                            </ul>
                            <p className="text-xl font-bold mt-2 border-t border-gray-600 pt-2">Total: Bs. {total.toFixed(2)}</p>
                        </div>
                        <button onClick={handleSaveOrder} disabled={isLoading} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded text-lg disabled:bg-gray-500">
                             {isLoading ? 'Guardando...' : 'Confirmar y Guardar Pedido'}
                         </button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
            <h1 className="text-3xl font-bold text-yellow-400 mb-6">Nuevo Pedido</h1>
            
            <section>
                <h2 className="text-xl font-semibold mb-2">Productos</h2>
                 <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end p-4 border border-gray-700 rounded-lg">
                    <div className="md:col-span-3 relative">
                        <label className="block text-sm font-medium text-gray-300">Buscar Producto</label>
                        <input type="text" value={productQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductQuery(e.target.value)} className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-gray-900 rounded-b-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                {searchResults.map(p => <div key={p.id} onClick={() => { setNewItem({ ...newItem, name: p.name, is_recognized: true }); setProductQuery(p.name); setSearchResults([]); }} className="p-3 hover:bg-gray-700 cursor-pointer">{p.name}</div>)}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Cant.</label>
                        <input type="number" value={newItem.qty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem(p => ({...p, qty: parseInt(e.target.value) || 1}))} className="w-full bg-gray-700 rounded p-2 border border-gray-600" />
                    </div>
                    <div className="md:col-span-2">
                        <button onClick={handleAddItem} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Añadir al Pedido</button>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                            <span>{item.qty} x {item.name} {item.sale_type ? `(${item.sale_type})` : ''}</span>
                            <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300 text-xl">&times;</button>
                        </div>
                    ))}
                </div>
            </section>
            
            {currentStep !== 'products' && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-yellow-400">
                       {renderStepContent()}
                    </div>
                </div>
            )}
            
            {currentStep === 'products' && order.items.length > 0 && (
                 <div className="mt-8 pt-4 border-t border-gray-700 text-right">
                    <button onClick={advanceFlow} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded text-lg">Continuar con el Pedido</button>
                </div>
            )}
        </div>
    );
}
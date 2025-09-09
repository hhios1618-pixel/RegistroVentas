'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/badge';
import { Separator } from '@/components/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Checkbox } from '@/components/checkbox';
import { toast } from 'sonner';
import { Loader2, Search, Package, RotateCcw, AlertCircle } from 'lucide-react';

// Tipos
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_no: number;
  customer_name: string;
  customer_phone?: string;
  seller: string;
  amount: number;
  local: string;
  created_at: string;
  items: OrderItem[];
}

interface ReturnItem extends OrderItem {
  selected: boolean;
  return_quantity: number;
  return_reason: string;
}

const RETURN_REASONS = [
  'Producto defectuoso',
  'No corresponde al pedido',
  'Cliente cambió de opinión',
  'Producto vencido',
  'Daño en transporte',
  'Error en la orden',
  'Otro'
];

const RETURN_METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'QR', label: 'QR' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' }
];

const BRANCHES = ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz', 'Sucre'];

export default function DevolucionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnBranch, setReturnBranch] = useState('');
  const [returnMethod, setReturnMethod] = useState<'EFECTIVO' | 'QR' | 'TRANSFERENCIA'>('EFECTIVO');
  const [generalReason, setGeneralReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar pedido
  const searchOrder = async () => {
    if (!searchTerm.trim()) {
      toast.error('Ingresa un número de pedido o ID');
      return;
    }

    setIsSearching(true);
    try {
      // Simulación de búsqueda de pedido
      // En la implementación real, esto haría una consulta a la base de datos
      const mockOrder: Order = {
        id: 'order-123',
        order_no: parseInt(searchTerm) || 12345,
        customer_name: 'Juan Pérez',
        customer_phone: '59177123456',
        seller: 'María González',
        amount: 85.50,
        local: 'Santa Cruz',
        created_at: '2024-01-15T10:30:00Z',
        items: [
          {
            id: 'item-1',
            product_name: 'Coca Cola 2L',
            quantity: 2,
            unit_price: 12.50,
            subtotal: 25.00
          },
          {
            id: 'item-2',
            product_name: 'Pan Integral',
            quantity: 3,
            unit_price: 8.00,
            subtotal: 24.00
          },
          {
            id: 'item-3',
            product_name: 'Yogurt Fresa 1L',
            quantity: 2,
            unit_price: 18.25,
            subtotal: 36.50
          }
        ]
      };

      setOrder(mockOrder);
      
      // Inicializar items de devolución
      const initialReturnItems: ReturnItem[] = mockOrder.items.map(item => ({
        ...item,
        selected: false,
        return_quantity: 0,
        return_reason: ''
      }));
      
      setReturnItems(initialReturnItems);
      toast.success('Pedido encontrado');
    } catch (error) {
      toast.error('Error al buscar el pedido');
      setOrder(null);
      setReturnItems([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Actualizar selección de item
  const toggleItemSelection = (itemId: string, selected: boolean) => {
    setReturnItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            selected, 
            return_quantity: selected ? 1 : 0,
            return_reason: selected ? (generalReason || RETURN_REASONS[0]) : ''
          }
        : item
    ));
  };

  // Actualizar cantidad de devolución
  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, return_quantity: Math.min(quantity, item.quantity) }
        : item
    ));
  };

  // Actualizar motivo de devolución
  const updateReturnReason = (itemId: string, reason: string) => {
    setReturnItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, return_reason: reason }
        : item
    ));
  };

  // Calcular monto total de devolución
  const calculateReturnAmount = useCallback(() => {
    return returnItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0);
  }, [returnItems]);

  // Procesar devolución
  const processReturn = async () => {
    if (!order) {
      toast.error('No hay pedido seleccionado');
      return;
    }

    const selectedItems = returnItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast.error('Selecciona al menos un producto para devolver');
      return;
    }

    if (!returnBranch) {
      toast.error('Selecciona la sucursal de devolución');
      return;
    }

    // Validar que todos los items seleccionados tengan motivo
    const itemsWithoutReason = selectedItems.filter(item => !item.return_reason.trim());
    if (itemsWithoutReason.length > 0) {
      toast.error('Todos los productos seleccionados deben tener un motivo de devolución');
      return;
    }

    setIsProcessing(true);
    try {
      const returnPayload = {
        order_id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name,
        seller_name: order.seller,
        return_branch: returnBranch,
        return_amount: calculateReturnAmount(),
        reason: generalReason || 'Devolución procesada desde sistema web',
        return_method: returnMethod,
        items: selectedItems.map(item => ({
          product_name: item.product_name,
          quantity: item.return_quantity,
          unit_price: item.unit_price,
          reason: item.return_reason
        }))
      };

      const response = await fetch('/endpoints/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar devolución');
      }

      const result = await response.json();
      toast.success(`Devolución procesada exitosamente. ID: ${result.id}`);
      
      // Resetear formulario
      setOrder(null);
      setReturnItems([]);
      setSearchTerm('');
      setReturnBranch('');
      setGeneralReason('');
      setReturnMethod('EFECTIVO');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar devolución');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <RotateCcw className="w-8 h-8" />
          Gestión de Devoluciones
        </h1>
        <p className="text-gray-600">Busca un pedido y procesa las devoluciones de productos</p>
      </div>

      {/* Búsqueda de pedido */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Número de pedido o ID</Label>
              <Input
                id="search"
                placeholder="Ej: 12345 o order-abc123"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchOrder} 
                disabled={isSearching || !searchTerm.trim()}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del pedido */}
      {order && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pedido #{order.order_no}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                <p className="font-medium">{order.customer_name}</p>
                {order.customer_phone && (
                  <p className="text-sm text-gray-600">{order.customer_phone}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Vendedor</Label>
                <p className="font-medium">{order.seller}</p>
                <p className="text-sm text-gray-600">{order.local}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total Original</Label>
                <p className="font-medium text-lg">Bs. {order.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h3 className="font-semibold mb-4">Productos del Pedido</h3>
              <div className="space-y-3">
                {returnItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => 
                          toggleItemSelection(item.id, checked as boolean)
                        }
                      />
                      
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Producto</Label>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-600">
                              Cantidad original: {item.quantity}
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Precio Unitario</Label>
                            <p className="font-medium">Bs. {item.unit_price.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">
                              Subtotal: Bs. {item.subtotal.toFixed(2)}
                            </p>
                          </div>
                          
                          {item.selected && (
                            <>
                              <div>
                                <Label htmlFor={`quantity-${item.id}`}>Cantidad a devolver</Label>
                                <Input
                                  id={`quantity-${item.id}`}
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={item.return_quantity}
                                  onChange={(e) => 
                                    updateReturnQuantity(item.id, parseInt(e.target.value) || 1)
                                  }
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`reason-${item.id}`}>Motivo</Label>
                                <Select
                                  value={item.return_reason}
                                  onValueChange={(value) => updateReturnReason(item.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar motivo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RETURN_REASONS.map(reason => (
                                      <SelectItem key={reason} value={reason}>
                                        {reason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {item.selected && (
                          <div className="mt-2 text-right">
                            <Badge variant="secondary">
                              Devolución: Bs. {(item.return_quantity * item.unit_price).toFixed(2)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuración de devolución */}
      {order && returnItems.some(item => item.selected) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuración de Devolución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch">Sucursal de devolución</Label>
                <Select value={returnBranch} onValueChange={setReturnBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(branch => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="method">Método de devolución</Label>
                <Select value={returnMethod} onValueChange={(value: any) => setReturnMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="general-reason">Motivo general (opcional)</Label>
              <Textarea
                id="general-reason"
                placeholder="Descripción adicional del motivo de devolución..."
                value={generalReason}
                onChange={(e) => setGeneralReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">
                  Total a devolver: Bs. {calculateReturnAmount().toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {returnItems.filter(item => item.selected).length} producto(s) seleccionado(s)
                </p>
              </div>
              
              <Button 
                onClick={processReturn} 
                disabled={isProcessing || !returnBranch}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Procesar Devolución
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {!order && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No hay pedido seleccionado
            </h3>
            <p className="text-gray-500">
              Busca un pedido por su número o ID para comenzar el proceso de devolución
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


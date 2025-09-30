'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Copy,
  Check,
  ChevronRight,
  Heart,
  MessageCircle,
  Eye,
  Sparkles,
  CheckCircle,
  Users,
  Clock,
  Phone,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Headphones,
  ClipboardList,
  Truck,
  PackageCheck,
  BarChart3,
  AlertTriangle,
  Navigation,
  Coins,
  ListChecks,
  Inbox,
} from 'lucide-react';

// -----------------------------------------------------
// TIPOS Y CONFIGURACIÓN BASE
// -----------------------------------------------------
type IconType = React.ComponentType<{ className?: string; size?: number }>;

type RoleId = 'asesores' | 'coordinadores' | 'cajas';

type KPI = {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: IconType;
  accent: string;
};

type FocusArea = {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  color: string;
  accent: string;
};

type StepAction = {
  id: string;
  label: string;
  detail: string;
};

type StepCheckpoint = {
  id: string;
  label: string;
  detail: string;
};

type StepTemplate = {
  id: string;
  title: string;
  channel: string;
  situation: string;
  content: string;
  tips?: string;
};

type StepEscalation = {
  id: string;
  trigger: string;
  action: string;
};

type ProcessStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: IconType;
  color: string;
  keyActions: StepAction[];
  checkpoints?: StepCheckpoint[];
  templates?: StepTemplate[];
  escalations?: StepEscalation[];
};

type RoleChecklist = {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  color: string;
  items: string[];
};

type QuickResponse = {
  id: string;
  label: string;
  situation: string;
  response: string;
  icon: string;
  color: string;
  channel?: string;
};

type RoleGuide = {
  id: RoleId;
  label: string;
  heroTitle: string;
  heroSubtitle: string;
  mission: string;
  icon: IconType;
  color: string;
  kpis: KPI[];
  focusAreas: FocusArea[];
  checklists: RoleChecklist[];
  processes: ProcessStep[];
  quickResponses?: QuickResponse[];
  quickTemplates?: StepTemplate[];
  escalations?: StepEscalation[];
  notes?: string[];
  searchPlaceholder: string;
};

const ROLE_GUIDES: RoleGuide[] = [
  {
    id: 'asesores',
    label: 'Asesoras de Venta',
    heroTitle: 'Central Operativa · Asesoras de Venta',
    heroSubtitle: 'Del primer saludo al seguimiento con fidelización',
    mission:
      'Garantizar una experiencia cálida, consultiva y sin fricciones que conecte necesidades con soluciones Fénix.',
    icon: Heart,
    color: 'from-apple-pink-500 to-apple-red-500',
    searchPlaceholder: 'Buscar guías, acciones SPIN o plantillas...',
    kpis: [
      {
        id: 'kpi-respuesta',
        label: 'Tiempo de respuesta',
        value: '< 2 min',
        description: 'Responder cada consulta nuevo ingreso antes de 120 segundos.',
        icon: Clock,
        accent: 'text-apple-blue-300',
      },
      {
        id: 'kpi-conversion',
        label: 'Cierres efectivos',
        value: '60%',
        description: 'Pedidos que pasan de presupuesto enviado a cierre asegurado.',
        icon: Target,
        accent: 'text-apple-green-300',
      },
      {
        id: 'kpi-followup',
        label: 'Seguimientos SPIN',
        value: '100%',
        description: 'Cada cliente con confirmación de entrega y encuesta.',
        icon: CheckCircle,
        accent: 'text-apple-pink-300',
      },
    ],
    focusAreas: [
      {
        id: 'focus-spin',
        title: 'SPIN en cada contacto',
        description:
          'Aplicar Situación, Problema, Implicación y Necesidad de solución para detectar oportunidades de venta cruzada.',
        icon: Sparkles,
        color: 'bg-apple-pink-500/10 border border-apple-pink-500/30',
        accent: 'text-apple-pink-300',
      },
      {
        id: 'focus-personalizacion',
        title: 'Experiencia personalizada',
        description:
          'Trato respetuoso, uso del nombre y recomendaciones basadas en uso real para generar confianza inmediata.',
        icon: Users,
        color: 'bg-apple-blue-500/10 border border-apple-blue-500/30',
        accent: 'text-apple-blue-300',
      },
      {
        id: 'focus-seguimiento',
        title: 'Seguimiento proactivo',
        description:
          'Confirmar entrega, agradecer e invitar a encuesta dentro de las primeras 24h del despacho.',
        icon: MessageCircle,
        color: 'bg-apple-green-500/10 border border-apple-green-500/30',
        accent: 'text-apple-green-300',
      },
    ],
    checklists: [
      {
        id: 'check-inicio-dia',
        title: 'Inicio de jornada',
        description: 'Todo listo antes del primer mensaje del día.',
        icon: ClipboardList,
        color: 'from-apple-blue-500 to-apple-green-500',
        items: [
          'Verificar batería y conexión del dispositivo asignado.',
          'Actualizar catálogo digital y precios vigentes.',
          'Revisar stock crítico y novedades desde coord. de ruta.',
          'Abrir CRM / sistema para registrar cada contacto entrante.',
        ],
      },
      {
        id: 'check-cierre-dia',
        title: 'Cierre de día',
        description: 'Nada queda sin seguimiento ni registro.',
        icon: ListChecks,
        color: 'from-apple-pink-500 to-apple-red-500',
        items: [
          'Confirmar con coordinador estado de todos los pedidos enviados.',
          'Actualizar CRM con notas finales y etiquetas de oportunidad.',
          'Registrar incidencias para retroalimentación semanal.',
          'Preparar lista de posibles recompras para la mañana siguiente.',
        ],
      },
    ],
    processes: [
      {
        id: 'paso-saludo',
        number: 1,
        title: 'Saludo y conexión',
        description: 'Primera impresión impecable y recolección de contexto.',
        icon: Heart,
        color: 'apple-pink',
        keyActions: [
          {
            id: 'accion-respuesta-rapida',
            label: 'Responder en menos de 2 minutos',
            detail: 'Confirma disponibilidad y muestra energía positiva desde el primer mensaje.',
          },
          {
            id: 'accion-presentacion',
            label: 'Presentarte con nombre y rol',
            detail: 'Utiliza siempre "usted" y confirma con quién estás hablando para personalizar la asesoría.',
          },
          {
            id: 'accion-contexto',
            label: 'Captar motivo del contacto',
            detail: 'Pregunta qué necesita y desde qué sucursal o zona contacta.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-crm',
            label: 'Registro inicial en CRM',
            detail: 'Cliente creado o actualizado con nombre, teléfono y producto de interés.',
          },
        ],
        templates: [
          {
            id: 'tmpl-saludo',
            title: 'Saludo inicial cálido',
            channel: 'WhatsApp',
            situation: 'Primer contacto entrante',
            content:
              '¡Hola! 😊 Soy [TU NOMBRE] de Fénix. ¿Cómo está usted? Me da mucho gusto poder atenderle hoy.',
            tips: 'Escribe con energía y agrega siempre un emoji que refuerce cercanía.',
          },
          {
            id: 'tmpl-presentacion',
            title: 'Presentación personal',
            channel: 'WhatsApp',
            situation: 'Luego del saludo de bienvenida',
            content:
              'Mi nombre es [TU NOMBRE] y estoy aquí para ayudarle a encontrar exactamente lo que necesita. ¿Con quién tengo el gusto de conversar?',
          },
        ],
      },
      {
        id: 'paso-descubrimiento',
        number: 2,
        title: 'Descubrimiento consultivo',
        description: 'Aplicar SPIN para entender uso, urgencia y oportunidades.',
        icon: Eye,
        color: 'apple-blue',
        keyActions: [
          {
            id: 'accion-pregunta-abierta',
            label: 'Formula preguntas abiertas',
            detail: 'Explora qué problema espera resolver o qué uso dará al producto.',
          },
          {
            id: 'accion-urgencia',
            label: 'Confirma urgencia y contexto',
            detail: 'Define si es compra inmediata o programada para priorizar seguimiento.',
          },
          {
            id: 'accion-cross',
            label: 'Detecta venta cruzada',
            detail: 'Identifica productos complementarios que agreguen valor al pedido principal.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-stock',
            label: 'Validación de stock',
            detail: 'Revisa disponibilidad en sistema o consulta a coordinador antes de prometer tiempos.',
          },
        ],
        templates: [
          {
            id: 'tmpl-pregunta-abierta',
            title: 'Pregunta abierta inicial',
            channel: 'WhatsApp',
            situation: 'Después de conocer el nombre de la persona',
            content:
              'Perfecto, [NOMBRE]. ¿Qué producto le interesa ver hoy? Tenemos una gran variedad y me encanta ayudar a encontrar lo ideal para cada persona.',
          },
          {
            id: 'tmpl-descubrimiento',
            title: 'Profundizar en uso',
            channel: 'WhatsApp',
            situation: 'Cuando menciona un producto general',
            content:
              'Para poder mostrarle las mejores opciones, ¿me puede contar para qué lo va a usar? Así le recomiendo algo que realmente le sirva.',
          },
        ],
      },
      {
        id: 'paso-presentacion',
        number: 3,
        title: 'Presentación de opciones',
        description: 'Mostrar máximo tres alternativas claras y comparables.',
        icon: Sparkles,
        color: 'purple',
        keyActions: [
          {
            id: 'accion-curadoria',
            label: 'Curar opciones relevantes',
            detail: 'Selecciona 2-3 alternativas alineadas a la necesidad detectada.',
          },
          {
            id: 'accion-beneficio',
            label: 'Hablar de beneficios',
            detail: 'Aterriza cómo el producto mejora la situación del cliente, no solo sus características.',
          },
          {
            id: 'accion-evidencia',
            label: 'Usa evidencia social',
            detail: 'Menciona testimonios, número de clientes satisfechos o calidad comprobada.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-media',
            label: 'Material visual enviado',
            detail: 'Incluye foto o ficha técnica en PDF para cada alternativa ofrecida.',
          },
        ],
        templates: [
          {
            id: 'tmpl-opciones',
            title: 'Opción A vs Opción B',
            channel: 'WhatsApp',
            situation: 'Presentación de alternativas comparables',
            content:
              'Opción A: [PRODUCTO] - Perfecto para [BENEFICIO ESPECÍFICO]. Precio: [PRECIO]\nOpción B: [PRODUCTO] - Ideal para [BENEFICIO ESPECÍFICO]. Precio: [PRECIO]\n\n¿Cuál le llama más la atención?',
            tips: 'Acompaña con imágenes y resalta diferenciadores en mayúsculas.',
          },
          {
            id: 'tmpl-refuerzo',
            title: 'Refuerzo de valor',
            channel: 'WhatsApp',
            situation: 'Al cerrar la presentación',
            content:
              'Ambos productos son de excelente calidad. Nuestros clientes quedan muy contentos porque realmente duran y cumplen lo que prometen.',
          },
        ],
      },
      {
        id: 'paso-objeciones',
        number: 4,
        title: 'Gestión de dudas y objeciones',
        description: 'Responde con empatía, ofrece alternativas y lleva a decisión.',
        icon: MessageCircle,
        color: 'apple-orange',
        keyActions: [
          {
            id: 'accion-escucha',
            label: 'Escuchar sin interrumpir',
            detail: 'Repite con tus palabras la objeción para validar comprensión.',
          },
          {
            id: 'accion-solucion',
            label: 'Responder con beneficio',
            detail: 'Conecta cada respuesta con cómo solucionas la preocupación.',
          },
          {
            id: 'accion-alternativa',
            label: 'Ofrecer plan B',
            detail: 'Si aplica, sugiere alternativa en precio, forma de pago o modelo.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-escalacion',
            label: 'Escalar objeción compleja',
            detail: 'Si es un problema de políticas o stock, coordinar con líder o ruta antes de prometer.',
          },
        ],
        templates: [
          {
            id: 'tmpl-precio',
            title: 'Objeción precio alto',
            channel: 'WhatsApp',
            situation: 'Cuando indican que el producto está caro',
            content:
              'Entiendo perfectamente, [NOMBRE]. El precio siempre es importante. Este producto es una inversión que le va a durar mucho tiempo. Además, si lo compara con opciones similares en tiendas, verá que nuestro precio es muy competitivo. ¿Le gustaría que le muestre una opción más económica?',
          },
          {
            id: 'tmpl-pensar',
            title: '"Lo voy a pensar"',
            channel: 'WhatsApp',
            situation: 'Cliente pide tiempo para decidir',
            content:
              'Por supuesto, [NOMBRE]. Es normal querer pensarlo bien. ¿Hay algo específico que le preocupa? Me encantaría resolver cualquier duda que tenga.',
          },
          {
            id: 'tmpl-garantia',
            title: 'Garantía de tranquilidad',
            channel: 'WhatsApp',
            situation: 'Cuando desconfía de la utilidad',
            content:
              'Entiendo su preocupación, [NOMBRE]. Le ofrecemos una garantía de 48 horas una vez recepcionado el producto. Así puede probarlo con total tranquilidad.',
          },
        ],
      },
      {
        id: 'paso-cierre',
        number: 5,
        title: 'Cierre y confirmación',
        description: 'Facilitar la decisión y asegurar datos sin errores.',
        icon: CheckCircle,
        color: 'apple-green',
        keyActions: [
          {
            id: 'accion-cierre-suave',
            label: 'Solicitar confirmación amable',
            detail: 'Usa cierres suaves enfocados en el beneficio, evitando presión.',
          },
          {
            id: 'accion-detalle',
            label: 'Confirmar todos los detalles',
            detail: 'Producto, precio, dirección, método de pago y horario.',
          },
          {
            id: 'accion-registro',
            label: 'Registrar pedido en sistema',
            detail: 'Cargar datos completos en CRM / sistema de ventas y asignar etiqueta.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-coord',
            label: 'Notificar al coordinador',
            detail: 'Enviar ficha resumida del pedido por canal oficial (WhatsApp rutas).',
          },
        ],
        templates: [
          {
            id: 'tmpl-cierre',
            title: 'Cierre suave',
            channel: 'WhatsApp',
            situation: 'Cliente muestra interés claro',
            content:
              '¿Le parece bien si procedemos con su pedido, [NOMBRE]? Me da mucha alegría poder ayudarle con esto.',
          },
          {
            id: 'tmpl-detalle',
            title: 'Confirmación de detalles',
            channel: 'WhatsApp',
            situation: 'Post acuerdo verbal por WhatsApp',
            content:
              'Perfecto. Entonces confirmamos:\n✅ Producto: [NOMBRE DEL PRODUCTO]\n✅ Precio: [PRECIO]\n✅ Entrega en: [DIRECCIÓN]\n✅ Forma de pago: [MÉTODO]\n\n¿Todo correcto?',
          },
        ],
      },
      {
        id: 'paso-seguimiento',
        number: 6,
        title: 'Seguimiento y fidelización',
        description: 'Acompañar la entrega y sembrar próximas compras.',
        icon: Users,
        color: 'apple-teal',
        keyActions: [
          {
            id: 'accion-whats',
            label: 'Avisar envío a cliente',
            detail: 'Comunica cuando el pedido está en ruta con hora estimada.',
          },
          {
            id: 'accion-confirmacion',
            label: 'Confirmar recepción',
            detail: 'Dentro de 24 horas valida que todo llegó correcto.',
          },
          {
            id: 'accion-encuesta',
            label: 'Invitar a encuesta breve',
            detail: 'Comparte link de 3 preguntas para medir satisfacción.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-reporte',
            label: 'Notas CRM post entrega',
            detail: 'Actualizar estado a entregado, adjuntar feedback y oportunidades futuras.',
          },
        ],
        templates: [
          {
            id: 'tmpl-envio',
            title: 'Confirmación de envío',
            channel: 'WhatsApp',
            situation: 'Pedido salió de la sucursal',
            content:
              '¡Hola [NOMBRE]! Su pedido ya está en camino. Debería llegar [TIEMPO]. Le aviso cuando esté cerca de su casa.',
          },
          {
            id: 'tmpl-post-entrega',
            title: 'Seguimiento post entrega',
            channel: 'WhatsApp',
            situation: '1-2 días después de la entrega',
            content:
              '¡Hola [NOMBRE]! ¿Ya recibió su [PRODUCTO]? Espero que le esté gustando mucho. Si tiene alguna pregunta o necesita algo más, aquí estoy.',
          },
          {
            id: 'tmpl-recompra',
            title: 'Invitación a recompra',
            channel: 'WhatsApp',
            situation: 'Clientes con más de 3 semanas sin comprar',
            content:
              '¡Hola [NOMBRE]! ¿Cómo está? Tenemos productos nuevos que creo que le pueden interesar. ¿Le gustaría que le cuente?',
          },
        ],
      },
    ],
    quickResponses: [
      {
        id: 'qr-precio-caro',
        label: 'Está caro',
        situation: 'Objeción de precio',
        response:
          'Entiendo perfectamente, [NOMBRE]. El precio siempre es importante. Este producto es una inversión que le va a durar mucho tiempo. ¿Le muestro una alternativa?',
        icon: '💰',
        color: 'apple-red',
        channel: 'WhatsApp',
      },
      {
        id: 'qr-lo-pienso',
        label: 'Lo voy a pensar',
        situation: 'Indecisión',
        response:
          'Por supuesto, [NOMBRE]. Es normal querer pensarlo bien. ¿Hay algo específico que le preocupe? Estoy para acompañarle.',
        icon: '🤔',
        color: 'apple-orange',
        channel: 'WhatsApp',
      },
      {
        id: 'qr-no-sirve',
        label: 'No sé si me sirve',
        situation: 'Duda sobre utilidad',
        response:
          'Entiendo su preocupación, [NOMBRE]. Puede probarlo con total tranquilidad: tiene nuestra garantía de satisfacción de 48 horas.',
        icon: '❓',
        color: 'purple',
        channel: 'WhatsApp',
      },
      {
        id: 'qr-sin-dinero',
        label: 'No tengo dinero ahora',
        situation: 'Limitación económica',
        response:
          'No se preocupe, [NOMBRE]. Podemos apartarlo 24 horas sin costo o coordinar pago contra entrega. ¿Cuál opción prefiere?',
        icon: '💳',
        color: 'apple-blue',
        channel: 'WhatsApp',
      },
      {
        id: 'qr-garantia',
        label: 'Dar garantía',
        situation: 'Generar confianza',
        response:
          'Le ofrecemos garantía total de satisfacción: si algo no llega como esperaba, lo resolvemos en menos de 48 horas.',
        icon: '🛡️',
        color: 'apple-green',
        channel: 'WhatsApp',
      },
    ],
    escalations: [
      {
        id: 'esc-stock',
        trigger: 'Producto sin stock en sistema',
        action: 'Escalar inmediato a coordinador de ruta y ofrecer alternativa o fecha estimada.',
      },
      {
        id: 'esc-incidencia',
        trigger: 'Cliente reporta daño o falta en pedido',
        action: 'Registrar evidencia, informar a líder y activar protocolo de reposición en 30 minutos.',
      },
    ],
    notes: [
      'Las asesoras son la voz de Fénix: cada mensaje debe transmitir confianza, empatía y resolución.',
      'Registra cada conversación en CRM. Lo que no está escrito no existe en nuestra cadena de servicio.',
    ],
  },
  {
    id: 'coordinadores',
    label: 'Coordinadores de Ruta',
    heroTitle: 'Central Operativa · Coordinadores de Ruta',
    heroSubtitle: 'Orquestar pedidos, rutas y repartidores con precisión',
    mission:
      'Garantizar que cada venta se transforme en entrega puntual, trazable y sin incidencias en terreno.',
    icon: Truck,
    color: 'from-apple-blue-500 to-emerald-500',
    searchPlaceholder: 'Buscar etapas de ruta, incidencias o mensajes de coordinación...',
    kpis: [
      {
        id: 'kpi-tiempo',
        label: 'Tiempo de despacho',
        value: '< 45 min',
        description: 'Desde confirmación del pedido hasta salida a ruta.',
        icon: Clock,
        accent: 'text-apple-blue-300',
      },
      {
        id: 'kpi-entrega',
        label: 'Pedidos sin incidencias',
        value: '98%',
        description: 'Entregas completadas sin reclamos ni reprogramaciones.',
        icon: PackageCheck,
        accent: 'text-apple-green-300',
      },
      {
        id: 'kpi-comunicacion',
        label: 'Confirmaciones a asesores',
        value: '100%',
        description: 'Cada estado comunicado en canal oficial dentro de 5 min.',
        icon: MessageCircle,
        accent: 'text-apple-orange-300',
      },
    ],
    focusAreas: [
      {
        id: 'focus-trazabilidad',
        title: 'Trazabilidad total',
        description: 'Cada pedido debe tener responsable, hora estimada y confirmación de entrega.',
        icon: Navigation,
        color: 'bg-apple-blue-500/10 border border-apple-blue-500/30',
        accent: 'text-apple-blue-300',
      },
      {
        id: 'focus-optimizacion',
        title: 'Rutas eficientes',
        description:
          'Optimizar secuencias según distancia, capacidad y SLA comprometido con clientes.',
        icon: BarChart3,
        color: 'bg-apple-green-500/10 border border-apple-green-500/30',
        accent: 'text-apple-green-300',
      },
      {
        id: 'focus-comunicacion',
        title: 'Comunicación proactiva',
        description:
          'Mantener a asesores y clientes informados en cada hito crítico del despacho.',
        icon: MessageCircle,
        color: 'bg-apple-orange-500/10 border border-apple-orange-500/30',
        accent: 'text-apple-orange-300',
      },
    ],
    checklists: [
      {
        id: 'check-prep',
        title: 'Antes de iniciar rutas',
        description: 'Control de tablero y asignaciones matinales.',
        icon: ClipboardList,
        color: 'from-apple-blue-500 to-apple-purple-500',
        items: [
          'Revisar backlog de pedidos confirmados por asesoras.',
          'Verificar disponibilidad de repartidores y vehículos.',
          'Actualizar tablero con prioridades por zona y SLA.',
          'Sincronizar con cajas sobre cobros pendientes o contra entrega.',
        ],
      },
      {
        id: 'check-cierre',
        title: 'Cierre de ruta',
        description: 'Todo pedido con evidencia y reporte final.',
        icon: ListChecks,
        color: 'from-emerald-500 to-apple-green-500',
        items: [
          'Recopilar confirmaciones de entrega (foto, firma o mensaje).',
          'Registrar incidentes y soluciones aplicadas en bitácora.',
          'Informar a asesoras cierre total o motivos de pendientes.',
          'Actualizar métricas de puntualidad y capacidad para retro semanal.',
        ],
      },
    ],
    processes: [
      {
        id: 'ruta-recepcion',
        number: 1,
        title: 'Recepción y priorización de pedidos',
        description: 'Tomar control del pedido apenas asesoras lo confirman.',
        icon: Inbox,
        color: 'apple-blue',
        keyActions: [
          {
            id: 'accion-validar',
            label: 'Validar ficha completa',
            detail: 'Revisar dirección, cobro, tipo de entrega y notas especiales.',
          },
          {
            id: 'accion-priorizar',
            label: 'Clasificar por SLA',
            detail: 'Asignar prioridad según urgencia, zona y ventana de entrega.',
          },
          {
            id: 'accion-confirmar',
            label: 'Confirmar recepción a asesora',
            detail: 'Responder en canal oficial que el pedido está en gestión.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-coord-caja',
            label: 'Verificación con cajas',
            detail: 'Confirmar estado de pago o monto pendiente para contraentrega.',
          },
        ],
        templates: [
          {
            id: 'tmpl-confirmacion-asesora',
            title: 'Confirmación a asesora',
            channel: 'WhatsApp interno',
            situation: 'Al recibir pedido en grupo de zona',
            content:
              'Pedido [CÓDIGO] recibido ✅. Ruta: [RUTA/ZONA]. Programando salida, actualizo ETA en breve.',
          },
        ],
      },
      {
        id: 'ruta-planificacion',
        number: 2,
        title: 'Planificación y asignación de ruta',
        description: 'Armar la hoja de ruta en base a capacidad real.',
        icon: Truck,
        color: 'apple-green',
        keyActions: [
          {
            id: 'accion-routing',
            label: 'Construir secuencia óptima',
            detail: 'Usar cercanía geográfica y ventanas de cliente para ordenar entregas.',
          },
          {
            id: 'accion-brief',
            label: 'Brief a repartidor',
            detail: 'Entregar direccionamiento, observaciones y contactos clave.',
          },
          {
            id: 'accion-eta',
            label: 'Informar ETA a asesora',
            detail: 'Compartir hora estimada y condición de pago para que cliente esté listo.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-vehiculo',
            label: 'Capacidad / temperatura',
            detail: 'Confirmar que vehículo asignado soporta volumen y condiciones del producto.',
          },
        ],
        templates: [
          {
            id: 'tmpl-eta-asesora',
            title: 'ETA a asesora',
            channel: 'WhatsApp interno',
            situation: 'Tras definir ruta final',
            content:
              'Ruta [CÓDIGO] sale a las [HORA]. ETA cliente [APELLIDO]: [HORA ESTIMADA]. Pago: [DETALLE].',
          },
          {
            id: 'tmpl-brief-repartidor',
            title: 'Brief para repartidor',
            channel: 'WhatsApp / Ficha impresa',
            situation: 'Antes de salir a reparto',
            content:
              'Resumen pedido [CÓDIGO]\n📍 Dirección: [DIRECCIÓN]\n👤 Contacto: [NOMBRE - TEL]\n💵 Pago: [DETALLE]\n🔎 Observaciones: [NOTA IMPORTANTE]',
          },
        ],
      },
      {
        id: 'ruta-seguimiento',
        number: 3,
        title: 'Seguimiento en tránsito',
        description: 'Monitoreo en tiempo real y resolución de desvíos.',
        icon: Navigation,
        color: 'apple-orange',
        keyActions: [
          {
            id: 'accion-track',
            label: 'Trackear avances',
            detail: 'Solicitar checkpoints de salida, llegada a zona y entrega.',
          },
          {
            id: 'accion-incidencias',
            label: 'Resolver incidencias rápido',
            detail: 'Si hay demora o cliente ausente, coordinar nueva hora con asesora/caja.',
          },
          {
            id: 'accion-comunicacion',
            label: 'Actualizar estado',
            detail: 'Mantener al canal oficial informado: en tránsito, entregado o reprogramado.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-evidencia',
            label: 'Evidencia de entrega',
            detail: 'Foto, firma digital o mensaje del cliente confirmando recepción.',
          },
        ],
        templates: [
          {
            id: 'tmpl-incidencia',
            title: 'Incidencia en ruta',
            channel: 'WhatsApp interno',
            situation: 'Cuando ocurre un retraso o cliente no responde',
            content:
              'Alerta 🚨 Pedido [CÓDIGO] con demora por [MOTIVO]. Nueva ETA [HORA]. ¿Autoriza informar al cliente?',
          },
        ],
        escalations: [
          {
            id: 'esc-retraso',
            trigger: 'Retraso mayor a 20 min vs ETA original',
            action: 'Informar a asesora y cliente, ofrecer compensación o nueva ventana.',
          },
        ],
      },
      {
        id: 'ruta-cierre',
        number: 4,
        title: 'Cierre y retroalimentación',
        description: 'Cerrar el ciclo con reportes y aprendizajes.',
        icon: CheckCircle,
        color: 'apple-teal',
        keyActions: [
          {
            id: 'accion-confirmar',
            label: 'Confirmar cierres',
            detail: 'Notificar a asesora entrega exitosa con evidencia en archivo compartido.',
          },
          {
            id: 'accion-reporte',
            label: 'Actualizar tablero',
            detail: 'Marcar estado final, tiempos reales y observaciones.',
          },
          {
            id: 'accion-mejora',
            label: 'Levantar mejoras',
            detail: 'Documentar desvíos para revisión semanal y oportunidades de ajuste.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-pagos',
            label: 'Conciliación con cajas',
            detail: 'Validar cobros contra entrega y transferencias recibidas.',
          },
        ],
        templates: [
          {
            id: 'tmpl-cierre-asesora',
            title: 'Cierre a asesora',
            channel: 'WhatsApp interno',
            situation: 'Pedido marcado como entregado',
            content:
              'Pedido [CÓDIGO] entregado ✅ a las [HORA]. Evidencia cargada en carpeta [LINK]. Cliente feliz 🙌.',
          },
        ],
      },
    ],
    quickResponses: [
      {
        id: 'qr-asignado',
        label: 'Pedido asignado',
        situation: 'Respuesta a asesora',
        response: 'Pedido [CÓDIGO] asignado a ruta [NOMBRE]. Salida programada [HORA], confirmo al salir.',
        icon: '🗺️',
        color: 'apple-blue',
        channel: 'WhatsApp interno',
      },
      {
        id: 'qr-transito',
        label: 'En tránsito',
        situation: 'Estado intermedio',
        response: 'Pedido [CÓDIGO] en tránsito. ETA cliente [HORA ESTIMADA]. Cualquier cambio aviso de inmediato.',
        icon: '🚚',
        color: 'apple-green',
        channel: 'WhatsApp interno',
      },
      {
        id: 'qr-reprogramacion',
        label: 'Reprogramación',
        situation: 'Cliente no disponible',
        response: 'Cliente [APELLIDO] no se encontraba. Propuesta: reagendar mañana [HORA]. Confirmar con asesora.',
        icon: '🔁',
        color: 'apple-orange',
        channel: 'WhatsApp interno',
      },
    ],
    escalations: [
      {
        id: 'esc-capacidad',
        trigger: 'Sobrecupo o falta de repartidores',
        action: 'Informar a operaciones para refuerzo y priorizar pedidos críticos.',
      },
      {
        id: 'esc-incidente',
        trigger: 'Accidente, pérdida o daño en tránsito',
        action: 'Activar protocolo de emergencia, documentar y avisar a gerencia en 10 minutos.',
      },
    ],
    notes: [
      'Los coordinadores son el centro de control: cada minuto sin información genera incertidumbre en cliente.',
      'Utiliza tableros actualizados y plantillas para mantener consistencia entre turnos.',
    ],
  },
  {
    id: 'cajas',
    label: 'Equipo de Cajas',
    heroTitle: 'Central Operativa · Cajas e Inventario',
    heroSubtitle: 'Exactitud en cobros, control de inventario y servicio presencial',
    mission:
      'Asegurar cuadraturas impecables, stock controlado y soporte al cliente en punto de venta.',
    icon: Coins,
    color: 'from-amber-500 to-apple-green-500',
    searchPlaceholder: 'Buscar controles de caja, inventario o protocolos de atención...',
    kpis: [
      {
        id: 'kpi-cuadratura',
        label: 'Cuadratura diaria',
        value: '100%',
        description: 'Ingresos registrados = fondos en caja + respaldos digitales.',
        icon: Coins,
        accent: 'text-amber-300',
      },
      {
        id: 'kpi-inventario',
        label: 'Diferencias de inventario',
        value: '< 0.5%',
        description: 'Diferencias máximas permitidas versus stock teórico.',
        icon: PackageCheck,
        accent: 'text-apple-green-300',
      },
      {
        id: 'kpi-atencion',
        label: 'Tiempo en ventanilla',
        value: '< 3 min',
        description: 'Tiempo promedio de atención por cliente presencial.',
        icon: Clock,
        accent: 'text-apple-blue-300',
      },
    ],
    focusAreas: [
      {
        id: 'focus-cuadratura',
        title: 'Cuadratura sin errores',
        description: 'Arqueo doble, respaldos fotográficos y reporte inmediato de diferencias.',
        icon: CheckCircle,
        color: 'bg-apple-green-500/10 border border-apple-green-500/30',
        accent: 'text-apple-green-300',
      },
      {
        id: 'focus-inventario',
        title: 'Control de inventario vivo',
        description: 'Registrar entradas/salidas en tiempo real y alinear con coordinadores.',
        icon: PackageCheck,
        color: 'bg-apple-blue-500/10 border border-apple-blue-500/30',
        accent: 'text-apple-blue-300',
      },
      {
        id: 'focus-servicio',
        title: 'Atención presencial cálida',
        description: 'Resolver dudas, escalar incidencias y mantener orden en kiosco/caja.',
        icon: Heart,
        color: 'bg-apple-pink-500/10 border border-apple-pink-500/30',
        accent: 'text-apple-pink-300',
      },
    ],
    checklists: [
      {
        id: 'check-apertura',
        title: 'Apertura de caja',
        description: 'Protocolos antes de recibir al primer cliente.',
        icon: ClipboardList,
        color: 'from-amber-500 to-apple-orange-500',
        items: [
          'Revisar fondo fijo, terminales y boletas disponibles.',
          'Encender sistemas (POS, ERP, planilla de control) y verificar conexión.',
          'Validar inventario crítico con bodega (productos de mayor rotación).',
          'Anotar números iniciales de folios y meter firma en bitácora.',
        ],
      },
      {
        id: 'check-cierre-caja',
        title: 'Cierre y reporte final',
        description: 'Dejar todo cuadrado y con evidencia respaldada.',
        icon: ListChecks,
        color: 'from-apple-green-500 to-apple-blue-500',
        items: [
          'Arqueo doble: efectivo, vouchers, transferencias y comprobantes.',
          'Cotejar contra ventas registradas en sistema y reportar diferencias.',
          'Guardar documentación en carpeta digital (boletas, comprobantes, actas).',
          'Enviar reporte a contabilidad y coordinador con foto de cuadratura.',
        ],
      },
    ],
    processes: [
      {
        id: 'caja-apertura',
        number: 1,
        title: 'Apertura y control inicial',
        description: 'Preparar la estación para operar con seguridad.',
        icon: BookOpen,
        color: 'apple-yellow',
        keyActions: [
          {
            id: 'accion-fondo',
            label: 'Verificar fondo fijo',
            detail: 'Contar efectivo inicial con apoyo de segunda persona y firmar bitácora.',
          },
          {
            id: 'accion-sistemas',
            label: 'Revisión de sistemas',
            detail: 'Iniciar POS, sistema de inventario y planilla de control compartida.',
          },
          {
            id: 'accion-alertas',
            label: 'Detectar pendientes',
            detail: 'Revisar correos/WhatsApp de contabilidad o coordinadores con alertas del día.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-firma',
            label: 'Bitácora firmada',
            detail: 'Registrar hora de apertura y firma responsable y supervisión.',
          },
        ],
        templates: [
          {
            id: 'tmpl-alerta-coord',
            title: 'Aviso de terminal listo',
            channel: 'WhatsApp interno',
            situation: 'Al iniciar la jornada',
            content:
              'Caja lista ✅ Fondo inicial verificado y sistemas online. Avisar si requieren control extra en ruta.',
          },
        ],
      },
      {
        id: 'caja-atencion',
        number: 2,
        title: 'Atención y cobro',
        description: 'Procesar pagos presenciales sin errores.',
        icon: Heart,
        color: 'apple-pink',
        keyActions: [
          {
            id: 'accion-identificar',
            label: 'Identificar cliente y pedido',
            detail: 'Solicitar código o nombre para vincular venta correctamente.',
          },
          {
            id: 'accion-documentar',
            label: 'Emitir documento tributario',
            detail: 'Seleccionar boleta/factura correcta y validar datos antes de imprimir.',
          },
          {
            id: 'accion-registro',
            label: 'Registrar pago en sistema',
            detail: 'Ingresar monto, método y observaciones en POS y planilla diaria.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-soporte',
            label: 'Atención incidencias',
            detail: 'Si el cliente trae reclamo, documentar y derivar a coordinador/asesora.',
          },
        ],
        templates: [
          {
            id: 'tmpl-confirmacion-pago',
            title: 'Confirmación de pago a coordinador',
            channel: 'WhatsApp interno',
            situation: 'Cuando se realiza pago contra entrega',
            content:
              'Pago CE confirmado 🧾 Pedido [CÓDIGO]. Monto $[MONTO]. Se entrega copia a repartidor y respaldo en carpeta.',
          },
        ],
      },
      {
        id: 'caja-inventario',
        number: 3,
        title: 'Control de inventario diario',
        description: 'Mantener stock al día y sin diferencias.',
        icon: PackageCheck,
        color: 'apple-blue',
        keyActions: [
          {
            id: 'accion-entradas',
            label: 'Registrar entradas y salidas',
            detail: 'Toda reposición o merma se registra en sistema y planilla física.',
          },
          {
            id: 'accion-conteo',
            label: 'Conteo rápido (flash)',
            detail: 'Dos veces al día validar SKUs críticos junto a bodega.',
          },
          {
            id: 'accion-alertar',
            label: 'Alertar bajas de stock',
            detail: 'Comunicar a coordinadores y asesoras cuando stock llegue a nivel mínimo.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-fotos',
            label: 'Evidencia visual',
            detail: 'Foto de inventario crítico cargada en carpeta compartida 11:00 y 17:00.',
          },
        ],
        templates: [
          {
            id: 'tmpl-stock-alerta',
            title: 'Alerta de stock bajo',
            channel: 'WhatsApp interno',
            situation: 'Cuando SKU llega al mínimo operativo',
            content:
              'Alerta stock 📦 SKU [NOMBRE] quedan [CANTIDAD]. Pedido de reposición sugerido: [DETALLE].',
          },
        ],
      },
      {
        id: 'caja-cuadratura',
        number: 4,
        title: 'Cierre y cuadratura',
        description: 'Consolidar cobros, inventario y reportes diarios.',
        icon: CheckCircle,
        color: 'apple-green',
        keyActions: [
          {
            id: 'accion-arqueo',
            label: 'Arqueo cruzado',
            detail: 'Realizar conteo con doble verificación y registrar diferencias.',
          },
          {
            id: 'accion-conciliar',
            label: 'Conciliar con sistema',
            detail: 'Comparar ventas POS vs planilla y vs depósitos bancarios.',
          },
          {
            id: 'accion-reportar',
            label: 'Enviar reporte final',
            detail: 'Compartir resumen con contabilidad, coordinador y gerente de turno.',
          },
        ],
        checkpoints: [
          {
            id: 'checkpoint-soportes',
            label: 'Soportes digitales',
            detail: 'Escanear o fotografiar boletas, vouchers y formularios de inventario.',
          },
        ],
        templates: [
          {
            id: 'tmpl-reporte-cierre',
            title: 'Reporte de cierre',
            channel: 'Email / WhatsApp',
            situation: 'Al finalizar arqueo',
            content:
              'Cierre de caja ✅\n• Ventas POS: $[MONTO]\n• Efectivo en caja: $[MONTO]\n• Transferencias: $[MONTO]\n• Diferencias: $[MONTO] (detallado en acta adjunta)',
          },
        ],
        escalations: [
          {
            id: 'esc-diferencia',
            trigger: 'Diferencia mayor a $5.000',
            action: 'Notificar a contabilidad y gerencia inmediato, levantar acta con evidencia.',
          },
        ],
      },
    ],
    quickResponses: [
      {
        id: 'qr-boleta',
        label: 'Solicitud de boleta',
        situation: 'Cliente presencial',
        response: 'Por supuesto, aquí tiene su boleta electrónica. También se la puedo enviar por correo si lo prefiere.',
        icon: '🧾',
        color: 'apple-blue',
        channel: 'Presencial',
      },
      {
        id: 'qr-diferencia',
        label: 'Diferencia detectada',
        situation: 'Aviso interno',
        response: 'Detectamos diferencia de $[MONTO] en arqueo parcial. Iniciamos revisión y comparto reporte en 15 minutos.',
        icon: '📊',
        color: 'apple-orange',
        channel: 'WhatsApp interno',
      },
      {
        id: 'qr-inventario',
        label: 'Inventario actualizado',
        situation: 'Coordinador solicita stock',
        response: 'Stock al corte 17:00 hrs 👉 [SKU]: [CANTIDAD DISPONIBLE]. Reposición solicitada para mañana am.',
        icon: '📦',
        color: 'apple-green',
        channel: 'WhatsApp interno',
      },
    ],
    escalations: [
      {
        id: 'esc-pago',
        trigger: 'Pago rechazado repetidas veces',
        action: 'Llamar a asesora y coordinador; si persiste, activar protocolo de retención de producto.',
      },
      {
        id: 'esc-inventario',
        trigger: 'Diferencia inventario > 0.5%',
        action: 'Realizar conteo total con bodega y levantar acta con fotos y responsables.',
      },
    ],
    notes: [
      'Cajas es el último filtro de control. La precisión aquí sostiene la salud financiera y reputación de la marca.',
      'Documenta absolutamente todo: fotos, firmas, comprobantes y comentarios en sistema.',
    ],
  },
];

// -----------------------------------------------------
// HOOKS Y UTILIDADES
// -----------------------------------------------------
const useCopyToClipboard = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  };

  return { copiedId, copyText };
};

const colorClasses: Record<string, string> = {
  'apple-pink': 'from-apple-pink-500/20 to-apple-red-500/10 border-apple-pink-500/30 text-apple-pink-300',
  'apple-blue': 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-300',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
  'apple-orange': 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-300',
  'apple-green': 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-300',
  'apple-teal': 'from-teal-500/20 to-cyan-500/10 border-teal-500/30 text-teal-300',
  'apple-yellow': 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300',
};

const getStepColor = (color: string) => colorClasses[color] ?? colorClasses['apple-blue'];

// -----------------------------------------------------
// COMPONENTES VISUALES
// -----------------------------------------------------
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-center"
  >
    <div className="flex items-center space-x-3">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: i + 1 <= currentStep ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`w-9 h-9 rounded-apple flex items-center justify-center apple-caption font-bold transition-all duration-300 ${
              i + 1 <= currentStep
                ? 'bg-gradient-to-br from-apple-blue-500 to-apple-green-500 text-white shadow-apple'
                : 'bg-white/5 text-apple-gray-400 border border-white/10'
            }`}
          >
            {i + 1}
          </motion.div>
          {i < totalSteps - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i + 1 < currentStep ? 1 : 0.3 }}
              transition={{ duration: 0.5 }}
              className={`w-8 h-1 rounded-full transition-all duration-300 origin-left ${
                i + 1 < currentStep
                  ? 'bg-gradient-to-r from-apple-blue-500 to-apple-green-500'
                  : 'bg-white/20'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  </motion.div>
);

const RoleSelector: React.FC<{
  activeRoleId: RoleId;
  onSelect: (roleId: RoleId) => void;
}> = ({ activeRoleId, onSelect }) => (
  <div className="flex flex-wrap items-center justify-center gap-3">
    {ROLE_GUIDES.map((role) => {
      const Icon = role.icon;
      const isActive = role.id === activeRoleId;
      return (
        <motion.button
          key={role.id}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(role.id)}
          className={`relative overflow-hidden rounded-apple-lg px-5 py-3 transition-all duration-300 border ${
            isActive
              ? 'bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 border-apple-blue-400 shadow-apple-lg'
              : 'bg-white/5 border-white/10 hover:border-apple-blue-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-apple p-2 bg-gradient-to-br ${role.color} text-white shadow-apple`}
            >
              <Icon size={20} />
            </div>
            <div className="text-left">
              <p className="apple-caption2 text-apple-gray-400">Rol</p>
              <p className="apple-body text-white font-semibold">{role.label}</p>
            </div>
            <motion.div animate={{ rotate: isActive ? 90 : 0 }}>
              <ChevronRight size={16} className="text-apple-gray-400" />
            </motion.div>
          </div>
        </motion.button>
      );
    })}
  </div>
);

const KPIBadge: React.FC<{ kpi: KPI }> = ({ kpi }) => {
  const Icon = kpi.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card p-6 border border-white/10"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white/10 rounded-apple">
          <Icon size={20} className={kpi.accent} />
        </div>
        <div>
          <p className="apple-caption2 text-apple-gray-400">Indicador</p>
          <h4 className="apple-h4 text-white">{kpi.label}</h4>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="apple-h2 text-white">{kpi.value}</span>
      </div>
      <p className="apple-caption text-apple-gray-400 leading-relaxed">{kpi.description}</p>
    </motion.div>
  );
};

const FocusAreaCard: React.FC<{ focus: FocusArea }> = ({ focus }) => {
  const Icon = focus.icon;
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`rounded-apple-lg p-6 ${focus.color}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-apple bg-white/10 ${focus.accent}`}>
          <Icon size={18} />
        </div>
        <h4 className="apple-h4 text-white">{focus.title}</h4>
      </div>
      <p className="apple-caption text-apple-gray-300 leading-relaxed">{focus.description}</p>
    </motion.div>
  );
};

const ChecklistCard: React.FC<{ checklist: RoleChecklist }> = ({ checklist }) => {
  const Icon = checklist.icon;
  return (
    <motion.div whileHover={{ y: -4 }} className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-apple bg-gradient-to-br ${checklist.color} text-white shadow-apple`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="apple-h4 text-white">{checklist.title}</h4>
          <p className="apple-caption text-apple-gray-400">{checklist.description}</p>
        </div>
      </div>
      <ul className="space-y-3">
        {checklist.items.map((item, index) => (
          <li key={`${checklist.id}-${index}`} className="flex items-start gap-3">
            <Check size={16} className="text-apple-green-300 mt-0.5" />
            <span className="apple-body text-white leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

const TemplateCard: React.FC<{
  template: StepTemplate;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}> = ({ template, onCopy, isCopied }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.01 }}
    className="glass-card transition-all duration-300"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h4 className="apple-body font-semibold text-white mb-1">{template.title}</h4>
        <p className="apple-caption text-apple-blue-300 mb-1">{template.situation}</p>
        <p className="apple-caption text-apple-gray-500 flex items-center gap-2">
          <Phone size={14} className="text-apple-gray-400" /> {template.channel}
        </p>
      </div>
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(event) => {
          event.stopPropagation();
          onCopy(template.content, template.id);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-apple apple-caption font-medium transition-all duration-200 ${
          isCopied
            ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30'
            : 'bg-apple-blue-500/20 text-apple-blue-300 border border-apple-blue-500/30 hover:bg-apple-blue-500/30'
        }`}
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
        {isCopied ? 'Copiado' : 'Copiar'}
      </motion.button>
    </div>
    <div className="bg-black/30 rounded-apple p-4 border border-white/10 mb-3">
      <pre className="apple-body text-white whitespace-pre-wrap leading-relaxed">
        {template.content}
      </pre>
    </div>
    {template.tips && (
      <div className="bg-apple-orange-500/10 border border-apple-orange-500/30 rounded-apple p-3">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-apple-orange-400 mt-0.5 flex-shrink-0" />
          <p className="apple-caption text-apple-orange-300">
            <strong>Tip:</strong> {template.tips}
          </p>
        </div>
      </div>
    )}
  </motion.div>
);

const ProcessStepSection: React.FC<{
  step: ProcessStep;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  isActive: boolean;
  onActivate: () => void;
}> = ({ step, onCopy, copiedId, isActive, onActivate }) => {
  const Icon = step.icon;
  const colorClass = getStepColor(step.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`glass-card transition-all duration-300 ${
        isActive ? 'ring-2 ring-apple-blue-400/40 shadow-apple-lg' : 'hover:shadow-apple'
      }`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onActivate}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-apple-lg flex items-center justify-center bg-gradient-to-br ${colorClass} border`}
          >
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="apple-caption2 font-bold text-apple-gray-400">PASO {step.number}</span>
              <motion.div animate={{ rotate: isActive ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={16} className="text-apple-gray-400" />
              </motion.div>
            </div>
            <h3 className="apple-h3 text-white mb-1">{step.title}</h3>
            <p className="apple-body text-apple-gray-300">{step.description}</p>
          </div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-apple p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-apple-green-300" />
                    <h4 className="apple-h4 text-white">Acciones clave</h4>
                  </div>
                  <ul className="space-y-3">
                    {step.keyActions.map((action) => (
                      <li key={action.id} className="flex items-start gap-3">
                        <Check size={16} className="text-apple-green-300 mt-0.5" />
                        <div>
                          <p className="apple-body text-white font-medium">{action.label}</p>
                          <p className="apple-caption text-apple-gray-400">{action.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                {step.escalations && step.escalations.length > 0 && (
                  <div className="bg-apple-orange-500/10 border border-apple-orange-500/30 rounded-apple p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={18} className="text-apple-orange-300" />
                      <h4 className="apple-h4 text-apple-orange-200">Escalar cuando...</h4>
                    </div>
                    <ul className="space-y-3">
                      {step.escalations.map((escalation) => (
                        <li key={escalation.id} className="apple-body text-apple-orange-100">
                          <strong>{escalation.trigger}:</strong> {escalation.action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {step.checkpoints && step.checkpoints.length > 0 && (
                  <div className="bg-apple-blue-500/10 border border-apple-blue-500/30 rounded-apple p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Navigation size={18} className="text-apple-blue-200" />
                      <h4 className="apple-h4 text-apple-blue-100">Checkpoints obligatorios</h4>
                    </div>
                    <ul className="space-y-3">
                      {step.checkpoints.map((checkpoint) => (
                        <li key={checkpoint.id} className="apple-body text-white">
                          <strong>{checkpoint.label}:</strong> {checkpoint.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {step.templates && step.templates.length > 0 && (
                  <div className="space-y-4">
                    {step.templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onCopy={onCopy}
                        isCopied={copiedId === template.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const QuickResponseButton: React.FC<{
  response: QuickResponse;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}> = ({ response, onCopy, isCopied }) => {
  const gradients: Record<string, string> = {
    'apple-red': 'from-apple-red-500 to-apple-pink-500',
    'apple-orange': 'from-apple-orange-500 to-apple-red-500',
    purple: 'from-purple-500 to-indigo-500',
    'apple-blue': 'from-apple-blue-500 to-cyan-500',
    'apple-green': 'from-apple-green-500 to-emerald-500',
    'apple-yellow': 'from-amber-500 to-amber-700',
  };
  const gradient = gradients[response.color] ?? gradients['apple-blue'];

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onCopy(response.response, response.id)}
      className={`relative overflow-hidden rounded-apple-lg p-4 text-left transition-all duration-300 w-full bg-gradient-to-br ${gradient} shadow-apple hover:shadow-apple-lg`}
    >
      <div className="relative z-10">
        <div className="text-2xl mb-3">{response.icon}</div>
        <div className="text-white apple-body font-semibold mb-1">{response.label}</div>
        <div className="text-white/80 apple-caption mb-1">{response.situation}</div>
        {response.channel && (
          <div className="text-white/70 apple-caption2 flex items-center gap-2">
            <Phone size={14} className="text-white/70" /> {response.channel}
          </div>
        )}
        <AnimatePresence>
          {isCopied && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-3 right-3 bg-apple-green-500/30 text-apple-green-200 px-2 py-1 rounded-apple apple-caption2 border border-apple-green-500/50"
            >
              ✅ Copiado
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
    </motion.button>
  );
};

// -----------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------
export default function CentralOperativaPage() {
  const { copiedId, copyText } = useCopyToClipboard();
  const [activeRoleId, setActiveRoleId] = useState<RoleId>('asesores');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStepId, setActiveStepId] = useState<string>(ROLE_GUIDES[0]?.processes[0]?.id ?? '');

  const activeRole = useMemo(
    () => ROLE_GUIDES.find((role) => role.id === activeRoleId) ?? ROLE_GUIDES[0],
    [activeRoleId]
  );

  useEffect(() => {
    const firstStep = activeRole.processes[0];
    setActiveStepId(firstStep?.id ?? '');
    setSearchTerm('');
  }, [activeRoleId, activeRole.processes]);

  const filteredSteps = useMemo(() => {
    if (!searchTerm.trim()) return activeRole.processes;
    const lower = searchTerm.toLowerCase();
    return activeRole.processes.filter((step) => {
      if (
        step.title.toLowerCase().includes(lower) ||
        step.description.toLowerCase().includes(lower) ||
        step.keyActions.some(
          (action) =>
            action.label.toLowerCase().includes(lower) ||
            action.detail.toLowerCase().includes(lower)
        )
      ) {
        return true;
      }
      if (
        step.checkpoints?.some(
          (checkpoint) =>
            checkpoint.label.toLowerCase().includes(lower) ||
            checkpoint.detail.toLowerCase().includes(lower)
        )
      ) {
        return true;
      }
      if (
        step.templates?.some(
          (template) =>
            template.title.toLowerCase().includes(lower) ||
            template.content.toLowerCase().includes(lower) ||
            template.situation.toLowerCase().includes(lower)
        )
      ) {
        return true;
      }
      return false;
    });
  }, [searchTerm, activeRole.processes]);

  const filteredQuickResponses = useMemo(() => {
    if (!activeRole.quickResponses) return [] as QuickResponse[];
    if (!searchTerm.trim()) return activeRole.quickResponses;
    const lower = searchTerm.toLowerCase();
    return activeRole.quickResponses.filter(
      (response) =>
        response.label.toLowerCase().includes(lower) ||
        response.situation.toLowerCase().includes(lower) ||
        response.response.toLowerCase().includes(lower)
    );
  }, [searchTerm, activeRole.quickResponses]);

  const totalSteps = activeRole.processes.length;
  const currentIndex = activeRole.processes.findIndex((step) => step.id === activeStepId);

  return (
    <div className="min-h-screen bg-black">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-8"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-apple-pink-500/20 to-apple-red-500/20 border border-apple-pink-500/30 rounded-apple-lg">
              <Headphones size={28} className="text-apple-pink-400" />
            </div>
            <div className="p-3 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
              <BookOpen size={28} className="text-apple-blue-400" />
            </div>
          </div>
          <h1 className={`apple-h1 mb-3 bg-gradient-to-r from-apple-blue-500 to-apple-green-500 bg-clip-text text-transparent`}>
            Central Operativa Fénix
          </h1>
          <p className="apple-h4 text-apple-gray-300 max-w-2xl mx-auto mb-8">
            Selecciona el rol para revisar flujos, mensajes y checklists que aseguran una experiencia impecable.
          </p>
          <RoleSelector activeRoleId={activeRoleId} onSelect={setActiveRoleId} />

          <div className="mt-8">
            <h2 className="apple-h2 text-white mb-2">{activeRole.heroTitle}</h2>
            <p className="apple-body text-apple-gray-300 max-w-3xl mx-auto">
              {activeRole.heroSubtitle}
            </p>
            <p className="apple-caption text-apple-gray-500 mt-3 max-w-2xl mx-auto">
              {activeRole.mission}
            </p>
          </div>

          {totalSteps > 0 && (
            <div className="mt-8">
              <ProgressIndicator currentStep={currentIndex + 1 || 1} totalSteps={totalSteps} />
            </div>
          )}
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-6 space-y-10 pb-16">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeRole.kpis.map((kpi) => (
              <KPIBadge key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeRole.focusAreas.map((focus) => (
              <FocusAreaCard key={focus.id} focus={focus} />
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
                <Search size={18} className="text-apple-blue-400" />
              </div>
              <h2 className="apple-h3 text-white">Búsqueda inteligente</h2>
            </div>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-500" />
              <input
                type="text"
                placeholder={activeRole.searchPlaceholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field pl-12 apple-h4"
              />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRole.checklists.map((checklist) => (
              <ChecklistCard key={checklist.id} checklist={checklist} />
            ))}
          </div>
        </motion.section>

        {activeRole.quickResponses && activeRole.quickResponses.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-apple-orange-500/20 border border-apple-orange-500/30 rounded-apple">
                <Zap size={18} className="text-apple-orange-400" />
              </div>
              <h2 className="apple-h2 text-white">Respuestas rápidas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuickResponses.map((response) => (
                <QuickResponseButton
                  key={response.id}
                  response={response}
                  onCopy={copyText}
                  isCopied={copiedId === response.id}
                />
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
              <Target size={18} className="text-apple-green-400" />
            </div>
            <h2 className="apple-h2 text-white">Flujo operativo paso a paso</h2>
          </div>
          <div className="space-y-6">
            {filteredSteps.map((step) => (
              <ProcessStepSection
                key={step.id}
                step={step}
                onCopy={copyText}
                copiedId={copiedId}
                isActive={activeStepId === step.id}
                onActivate={() => setActiveStepId(step.id)}
              />
            ))}
          </div>
        </motion.section>

        {activeRole.escalations && activeRole.escalations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-apple-red-500/20 border border-apple-red-500/30 rounded-apple">
                  <AlertTriangle size={18} className="text-apple-red-300" />
                </div>
                <h3 className="apple-h2 text-white">Protocolos de escalamiento</h3>
              </div>
              <ul className="space-y-3">
                {activeRole.escalations.map((escalation) => (
                  <li key={escalation.id} className="apple-body text-apple-gray-200">
                    <strong>{escalation.trigger}:</strong> {escalation.action}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        {activeRole.notes && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-apple-pink-500/20 border border-apple-pink-500/30 rounded-apple">
                  <Heart size={18} className="text-apple-pink-300" />
                </div>
                <h3 className="apple-h2 text-white">Notas clave del rol</h3>
              </div>
              <ul className="space-y-3">
                {activeRole.notes.map((note, index) => (
                  <li key={`${activeRole.id}-note-${index}`} className="apple-body text-apple-gray-200">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="border-t border-white/10"
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart size={16} className="text-apple-pink-400" />
              <span className="apple-body text-apple-gray-400">Fénix • Central Operativa</span>
              <Heart size={16} className="text-apple-pink-400" />
            </div>
            <p className="apple-caption text-apple-gray-500">Diseñado para ordenar procesos, inspirar servicio y crecer juntos.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

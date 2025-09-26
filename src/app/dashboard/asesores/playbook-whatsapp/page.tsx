'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Copy, Check, ChevronRight, Heart, MessageCircle, Eye, 
  Sparkles, CheckCircle, Users, Clock, ArrowRight, Phone, ChevronDown,
  ChevronUp, Star, Lightbulb, Target, Zap, BookOpen, Headphones
} from 'lucide-react';

// -----------------------------------------------------
// CONFIGURACIÓN Y TIPOS
// -----------------------------------------------------
const BRAND = {
  title: 'Guía de Atención Fénix',
  subtitle: 'Tu compañera para atender con calidez y cerrar más ventas',
  primaryColor: 'from-apple-blue-500 to-apple-green-500',
  accentColor: 'from-apple-pink-500 to-apple-red-500',
};

type SalesStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  scripts: Script[];
};

type Script = {
  id: string;
  title: string;
  content: string;
  situation: string;
  tips?: string;
};

type QuickResponse = {
  id: string;
  label: string;
  situation: string;
  response: string;
  icon: string;
  color: string;
};

// -----------------------------------------------------
// DATOS DEL FLUJO DE ATENCIÓN
// -----------------------------------------------------
const SALES_FLOW: SalesStep[] = [
  {
    id: 'saludo',
    number: 1,
    title: 'Saludo y Conexión',
    description: 'Crear un ambiente cálido y de confianza',
    icon: Heart,
    color: 'apple-pink',
    scripts: [
      {
        id: 'saludo-inicial',
        title: 'Saludo Inicial Cálido',
        content: '¡Hola! 😊 Soy [TU NOMBRE] de Fénix. ¿Cómo está usted? Me da mucho gusto poder atenderle hoy.',
        situation: 'Primer contacto con el cliente',
        tips: 'Siempre usar "usted" y mencionar tu nombre para generar confianza'
      },
      {
        id: 'presentacion-personal',
        title: 'Presentación Personal',
        content: 'Mi nombre es [TU NOMBRE] y estoy aquí para ayudarle a encontrar exactamente lo que necesita. ¿Con quién tengo el gusto de conversar?',
        situation: 'Después del saludo inicial',
        tips: 'Preguntar el nombre es clave para personalizar toda la conversación'
      }
    ]
  },
  {
    id: 'descubrimiento',
    number: 2,
    title: 'Descubrimiento de Necesidades',
    description: 'Entender qué busca y por qué lo necesita',
    icon: Eye,
    color: 'apple-blue',
    scripts: [
      {
        id: 'pregunta-abierta',
        title: 'Pregunta Abierta Inicial',
        content: 'Perfecto, [NOMBRE]. ¿Qué producto le interesa ver hoy? Tenemos una gran variedad y me encanta ayudar a encontrar lo ideal para cada persona.',
        situation: 'Después de conocer el nombre',
        tips: 'Mostrar entusiasmo genuino por ayudar'
      },
      {
        id: 'descubrimiento-especifico',
        title: 'Descubrimiento Específico',
        content: 'Para poder mostrarle las mejores opciones, ¿me puede contar para qué lo va a usar? Así le recomiendo algo que realmente le sirva.',
        situation: 'Cuando el cliente menciona un producto general',
        tips: 'Enfocarse en el uso específico para recomendar mejor'
      },
      {
        id: 'urgencia',
        title: 'Calificación de Urgencia',
        content: '¿Es algo que necesita pronto o podemos tomarnos el tiempo para encontrar la opción perfecta?',
        situation: 'Para entender el timing del cliente',
        tips: 'Esto te ayuda a saber si puedes ser más consultiva o necesitas ser más directa'
      }
    ]
  },
  {
    id: 'presentacion',
    number: 3,
    title: 'Presentación de Opciones',
    description: 'Mostrar productos que resuelvan su necesidad',
    icon: Sparkles,
    color: 'purple',
    scripts: [
      {
        id: 'presentacion-consultiva',
        title: 'Presentación Consultiva',
        content: 'Basándome en lo que me cuenta, [NOMBRE], tengo 2 opciones que creo que le van a encantar. Ambas son de excelente calidad y muy populares entre nuestros clientes.',
        situation: 'Antes de mostrar las opciones',
        tips: 'Siempre presentar máximo 2-3 opciones para no abrumar'
      },
      {
        id: 'opcion-a-b',
        title: 'Opción A vs Opción B',
        content: 'Opción A: [PRODUCTO] - Perfecto para [BENEFICIO ESPECÍFICO]. Precio: [PRECIO]\nOpción B: [PRODUCTO] - Ideal para [BENEFICIO ESPECÍFICO]. Precio: [PRECIO]\n\n¿Cuál le llama más la atención?',
        situation: 'Al presentar las opciones específicas',
        tips: 'Siempre mencionar el beneficio específico, no solo las características'
      },
      {
        id: 'refuerzo-valor',
        title: 'Refuerzo de Valor',
        content: 'Ambos productos son importados de excelente calidad. Nuestros clientes quedan muy contentos porque realmente duran y cumplen lo que prometen.',
        situation: 'Después de presentar las opciones',
        tips: 'Usar prueba social (otros clientes contentos) para generar confianza'
      }
    ]
  },
  {
    id: 'objeciones',
    number: 4,
    title: 'Manejo de Dudas',
    description: 'Resolver inquietudes con empatía',
    icon: MessageCircle,
    color: 'apple-orange',
    scripts: [
      {
        id: 'precio-alto',
        title: '"Está muy caro"',
        content: 'Entiendo perfectamente, [NOMBRE]. El precio siempre es importante. Este producto es una inversión que le va a durar mucho tiempo. Además, si lo compara con opciones similares en tiendas, verá que nuestro precio es muy competitivo. ¿Le gustaría que le muestre una opción más económica?',
        situation: 'Cuando el cliente objeta por precio',
        tips: 'Validar la preocupación, justificar el precio y ofrecer alternativa'
      },
      {
        id: 'lo-voy-pensar',
        title: '"Lo voy a pensar"',
        content: 'Por supuesto, [NOMBRE]. Es normal querer pensarlo bien. ¿Hay algo específico que le preocupa? ¿El precio, la calidad, o tal vez cómo funciona? Me encantaría resolver cualquier duda que tenga.',
        situation: 'Cuando el cliente quiere pensarlo',
        tips: 'No presionar, pero indagar qué específicamente le preocupa'
      },
      {
        id: 'no-me-sirve',
        title: '"No sé si me va a servir"',
        content: 'Entiendo su preocupación, [NOMBRE]. Le ofrecemos una garantía de 48 horas una vez recepcionado el producto. Así puede probarlo con total tranquilidad.',
        situation: 'Cuando hay dudas sobre la utilidad',
        tips: 'Ofrecer garantía para eliminar el riesgo percibido'
      },
      {
        id: 'no-tengo-dinero',
        title: '"No tengo dinero ahora"',
        content: 'No se preocupe, [NOMBRE]. Entiendo que a veces el timing no es el ideal. ¿Le parece si se lo aparto por 24 horas sin compromiso? O también tenemos la opción de pago contra entrega, así no paga hasta que lo tenga en sus manos.',
        situation: 'Cuando hay limitaciones económicas',
        tips: 'Ofrecer opciones flexibles de pago o apartado'
      }
    ]
  },
  {
    id: 'cierre',
    number: 5,
    title: 'Cierre y Confirmación',
    description: 'Facilitar la decisión de compra',
    icon: CheckCircle,
    color: 'apple-green',
    scripts: [
      {
        id: 'cierre-suave',
        title: 'Cierre Suave',
        content: '¿Le parece bien si procedemos con su pedido, [NOMBRE]? Me da mucha alegría poder ayudarle con esto.',
        situation: 'Cuando el cliente muestra interés',
        tips: 'Usar un cierre suave y emocional, no presionar'
      },
      {
        id: 'confirmacion-detalles',
        title: 'Confirmación de Detalles',
        content: 'Perfecto. Entonces confirmamos:\n✅ Producto: [NOMBRE DEL PRODUCTO]\n✅ Precio: [PRECIO]\n✅ Entrega en: [DIRECCIÓN]\n✅ Forma de pago: [MÉTODO]\n\n¿Todo correcto?',
        situation: 'Al confirmar el pedido',
        tips: 'Siempre confirmar todos los detalles para evitar malentendidos'
      },
      {
        id: 'tranquilidad-final',
        title: 'Tranquilidad Final',
        content: 'Excelente, [NOMBRE]. Su pedido queda confirmado. Le voy a estar enviando el seguimiento y cualquier duda que tenga, me escribe sin pena. Estoy aquí para ayudarle.',
        situation: 'Después de confirmar el pedido',
        tips: 'Dar tranquilidad y dejar la puerta abierta para futuras consultas'
      }
    ]
  },
  {
    id: 'seguimiento',
    number: 6,
    title: 'Seguimiento y Cuidado',
    description: 'Asegurar satisfacción y fidelizar',
    icon: Users,
    color: 'apple-teal',
    scripts: [
      {
        id: 'confirmacion-envio',
        title: 'Confirmación de Envío',
        content: '¡Hola [NOMBRE]! Su pedido ya está en camino. Debería llegar [TIEMPO]. Le aviso cuando esté cerca de su casa.',
        situation: 'Cuando se envía el pedido',
        tips: 'Mantener informado al cliente genera confianza'
      },
      {
        id: 'seguimiento-entrega',
        title: 'Seguimiento Post-Entrega',
        content: '¡Hola [NOMBRE]! ¿Ya recibió su [PRODUCTO]? Espero que le esté gustando mucho. Si tiene alguna pregunta o necesita algo más, aquí estoy.',
        situation: '1-2 días después de la entrega',
        tips: 'El seguimiento post-venta es clave para la fidelización'
      },
      {
        id: 'invitacion-recompra',
        title: 'Invitación a Recompra',
        content: '¡Hola [NOMBRE]! ¿Cómo está? Tenemos productos nuevos que creo que le pueden interesar. ¿Le gustaría que le cuente?',
        situation: 'Después de algunas semanas',
        tips: 'Mantener contacto para futuras ventas, pero sin ser invasiva'
      }
    ]
  }
];

const QUICK_RESPONSES: QuickResponse[] = [
  {
    id: 'precio-caro',
    label: 'Está caro',
    situation: 'Objeción de precio',
    response: 'Entiendo perfectamente, [NOMBRE]. El precio siempre es importante. Este producto es una inversión que le va a durar mucho tiempo. ¿Le gustaría que le muestre una opción más económica?',
    icon: '💰',
    color: 'apple-red'
  },
  {
    id: 'lo-pienso',
    label: 'Lo voy a pensar',
    situation: 'Indecisión',
    response: 'Por supuesto, [NOMBRE]. Es normal querer pensarlo bien. ¿Hay algo específico que le preocupa? Me encantaría resolver cualquier duda que tenga.',
    icon: '🤔',
    color: 'apple-orange'
  },
  {
    id: 'no-sirve',
    label: 'No sé si me sirve',
    situation: 'Duda sobre utilidad',
    response: 'Entiendo su preocupación, [NOMBRE]. Por eso le ofrezco nuestra garantía: si no queda satisfecho, le devolvemos su dinero sin preguntas.',
    icon: '❓',
    color: 'purple'
  },
  {
    id: 'sin-dinero',
    label: 'No tengo dinero',
    situation: 'Limitación económica',
    response: 'No se preocupe, [NOMBRE]. ¿Le parece si se lo aparto por 24 horas sin compromiso? O tenemos pago contra entrega.',
    icon: '💳',
    color: 'apple-blue'
  },
  {
    id: 'garantia',
    label: 'Dar garantía',
    situation: 'Generar confianza',
    response: 'Le ofrecemos una garantía de 48 horas una vez recepcionado el producto, [NOMBRE]. Así puede probarlo con total tranquilidad.',
    icon: '🛡️',
    color: 'apple-green'
  }
];

// -----------------------------------------------------
// HOOKS PERSONALIZADOS
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

const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSteps = useMemo(() => {
    if (!searchTerm.trim()) return SALES_FLOW;
    
    const lowerSearch = searchTerm.toLowerCase();
    return SALES_FLOW.map(step => {
      const filteredScripts = step.scripts.filter(script =>
        script.title.toLowerCase().includes(lowerSearch) ||
        script.content.toLowerCase().includes(lowerSearch) ||
        script.situation.toLowerCase().includes(lowerSearch)
      );
      
      if (filteredScripts.length > 0 || step.title.toLowerCase().includes(lowerSearch)) {
        return { ...step, scripts: filteredScripts.length > 0 ? filteredScripts : step.scripts };
      }
      return null;
    }).filter(Boolean) as SalesStep[];
  }, [searchTerm]);

  const filteredQuickResponses = useMemo(() => {
    if (!searchTerm.trim()) return QUICK_RESPONSES;
    
    const lowerSearch = searchTerm.toLowerCase();
    return QUICK_RESPONSES.filter(response =>
      response.label.toLowerCase().includes(lowerSearch) ||
      response.situation.toLowerCase().includes(lowerSearch) ||
      response.response.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm]);

  return { searchTerm, setSearchTerm, filteredSteps, filteredQuickResponses };
};

// -----------------------------------------------------
// COMPONENTES UI REDISEÑADOS CON ESTILO APPLE
// -----------------------------------------------------
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-center mb-8"
  >
    <div className="flex items-center space-x-3">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: i + 1 <= currentStep ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`
              w-10 h-10 rounded-apple flex items-center justify-center apple-caption font-bold transition-all duration-300
              ${i + 1 <= currentStep 
                ? 'bg-gradient-to-br from-apple-blue-500 to-apple-green-500 text-white shadow-apple' 
                : 'bg-white/10 text-apple-gray-400 border border-white/20'
              }
            `}
          >
            {i + 1}
          </motion.div>
          {i < totalSteps - 1 && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i + 1 < currentStep ? 1 : 0.3 }}
              transition={{ duration: 0.5 }}
              className={`
                w-8 h-1 rounded-full transition-all duration-300 origin-left
                ${i + 1 < currentStep ? 'bg-gradient-to-r from-apple-blue-500 to-apple-green-500' : 'bg-white/20'}
              `} 
            />
          )}
        </React.Fragment>
      ))}
    </div>
  </motion.div>
);

const ScriptCard: React.FC<{
  script: Script;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}> = ({ script, onCopy, isCopied }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    className="glass-card hover:shadow-apple-lg transition-all duration-300"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h4 className="apple-body font-semibold text-white mb-1">{script.title}</h4>
        <p className="apple-caption text-apple-blue-300 mb-2">{script.situation}</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onCopy(script.content, script.id)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-apple apple-caption font-medium transition-all duration-200
          ${isCopied 
            ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30' 
            : 'bg-apple-blue-500/20 text-apple-blue-300 border border-apple-blue-500/30 hover:bg-apple-blue-500/30'
          }
        `}
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
        {isCopied ? 'Copiado' : 'Copiar'}
      </motion.button>
    </div>
    
    <div className="bg-black/30 rounded-apple p-4 border border-white/10 mb-4">
      <pre className="apple-body text-white whitespace-pre-wrap leading-relaxed">
        {script.content}
      </pre>
    </div>
    
    {script.tips && (
      <div className="bg-apple-orange-500/10 border border-apple-orange-500/30 rounded-apple p-3">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-apple-orange-400 mt-0.5 flex-shrink-0" />
          <p className="apple-caption text-apple-orange-300">
            <strong>Tip:</strong> {script.tips}
          </p>
        </div>
      </div>
    )}
  </motion.div>
);

const SalesStepSection: React.FC<{
  step: SalesStep;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  isActive: boolean;
  onActivate: () => void;
}> = ({ step, onCopy, copiedId, isActive, onActivate }) => {
  const Icon = step.icon;
  
  const colorClasses = {
    'apple-pink': 'from-apple-pink-500/20 to-apple-red-500/10 border-apple-pink-500/30 text-apple-pink-400',
    'apple-blue': 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    'purple': 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    'apple-orange': 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    'apple-green': 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    'apple-teal': 'from-teal-500/20 to-cyan-500/10 border-teal-500/30 text-teal-400',
  };

  const colorClass = colorClasses[step.color as keyof typeof colorClasses] || colorClasses['apple-blue'];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`
        glass-card cursor-pointer transition-all duration-300
        ${isActive ? 'ring-2 ring-apple-blue-400/50 shadow-apple-lg' : 'hover:shadow-apple'}
      `} 
      onClick={onActivate}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`
          w-14 h-14 rounded-apple-lg flex items-center justify-center
          bg-gradient-to-br ${colorClass} border
        `}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="apple-caption2 font-bold text-apple-gray-400">PASO {step.number}</span>
            <motion.div
              animate={{ rotate: isActive ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="text-apple-gray-400" />
            </motion.div>
          </div>
          <h3 className="apple-h3 text-white mb-1">{step.title}</h3>
          <p className="apple-body text-apple-gray-300">{step.description}</p>
        </div>
      </div>
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 mt-6 overflow-hidden"
          >
            {step.scripts.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ScriptCard
                  script={script}
                  onCopy={onCopy}
                  isCopied={copiedId === script.id}
                />
              </motion.div>
            ))}
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
  const colorClasses = {
    'apple-red': 'from-apple-red-500 to-apple-pink-500',
    'apple-orange': 'from-apple-orange-500 to-apple-red-500',
    'purple': 'from-purple-500 to-indigo-500',
    'apple-blue': 'from-apple-blue-500 to-cyan-500',
    'apple-green': 'from-apple-green-500 to-emerald-500',
  };

  const colorClass = colorClasses[response.color as keyof typeof colorClasses] || colorClasses['apple-blue'];

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onCopy(response.response, response.id)}
      className={`
        relative overflow-hidden rounded-apple-lg p-4 text-left transition-all duration-300 w-full
        bg-gradient-to-br ${colorClass} shadow-apple hover:shadow-apple-lg
      `}
    >
      <div className="relative z-10">
        <div className="text-2xl mb-3">{response.icon}</div>
        <div className="text-white apple-body font-semibold mb-1">{response.label}</div>
        <div className="text-white/80 apple-caption">{response.situation}</div>
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
// COMPONENTE PRINCIPAL REDISEÑADO
// -----------------------------------------------------
export default function WhatsAppPlaybookPage() {
  const { copiedId, copyText } = useCopyToClipboard();
  const { searchTerm, setSearchTerm, filteredSteps, filteredQuickResponses } = useSearch();
  const [activeStepId, setActiveStepId] = useState<string>('saludo');

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
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
          
          <h1 className={`apple-h1 mb-4 bg-gradient-to-r ${BRAND.primaryColor} bg-clip-text text-transparent`}>
            {BRAND.title}
          </h1>
          <p className="apple-h4 text-apple-gray-300 max-w-2xl mx-auto mb-8">
            {BRAND.subtitle}
          </p>
          
          {/* Progress Indicator */}
          <ProgressIndicator 
            currentStep={SALES_FLOW.findIndex(s => s.id === activeStepId) + 1} 
            totalSteps={SALES_FLOW.length} 
          />
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Search */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
                <Search size={18} className="text-apple-blue-400" />
              </div>
              <h2 className="apple-h3 text-white">Búsqueda Inteligente</h2>
            </div>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-500" />
              <input
                type="text"
                placeholder="Buscar scripts, situaciones o respuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-12 apple-h4"
              />
            </div>
          </div>
        </motion.section>

        {/* Quick Responses */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apple-orange-500/20 border border-apple-orange-500/30 rounded-apple">
              <Zap size={18} className="text-apple-orange-400" />
            </div>
            <h2 className="apple-h2 text-white">Respuestas Rápidas</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredQuickResponses.map((response, index) => (
              <motion.div
                key={response.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <QuickResponseButton
                  response={response}
                  onCopy={copyText}
                  isCopied={copiedId === response.id}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Sales Flow */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
              <Target size={18} className="text-apple-green-400" />
            </div>
            <h2 className="apple-h2 text-white">Flujo de Atención Paso a Paso</h2>
          </div>
          <div className="space-y-6">
            {filteredSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <SalesStepSection
                  step={step}
                  onCopy={copyText}
                  copiedId={copiedId}
                  isActive={activeStepId === step.id}
                  onActivate={() => setActiveStepId(step.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tips Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-apple-pink-500/20 border border-apple-pink-500/30 rounded-apple">
                <Heart size={18} className="text-apple-pink-400" />
              </div>
              <h3 className="apple-h2 text-white">Recuerda Siempre</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-apple-pink-500/10 border border-apple-pink-500/30 rounded-apple-lg p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Users size={20} className="text-apple-pink-400" />
                  <h4 className="apple-h4 text-apple-pink-300">Trato Respetuoso</h4>
                </div>
                <p className="apple-body text-white">Siempre usar "usted" y el nombre del cliente. Esto genera confianza inmediata.</p>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-apple-blue-500/10 border border-apple-blue-500/30 rounded-apple-lg p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Heart size={20} className="text-apple-blue-400" />
                  <h4 className="apple-h4 text-apple-blue-300">Empatía Genuina</h4>
                </div>
                <p className="apple-body text-white">Usar frases como "entiendo", "es normal", "no se preocupe" para conectar emocionalmente.</p>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-apple-green-500/10 border border-apple-green-500/30 rounded-apple-lg p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Star size={20} className="text-apple-green-400" />
                  <h4 className="apple-h4 text-apple-green-300">Beneficios sobre Características</h4>
                </div>
                <p className="apple-body text-white">Siempre explicar cómo el producto les ayuda en su vida diaria, no solo qué hace.</p>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-purple-500/10 border border-purple-500/30 rounded-apple-lg p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle size={20} className="text-purple-400" />
                  <h4 className="apple-h4 text-purple-300">Generar Seguridad</h4>
                </div>
                <p className="apple-body text-white">Ofrecer garantías, pago contra entrega y seguimiento para eliminar miedos.</p>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-white/10 mt-16"
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart size={16} className="text-apple-pink-400" />
              <span className="apple-body text-apple-gray-400">Fénix • Guía de Atención</span>
              <Heart size={16} className="text-apple-pink-400" />
            </div>
            <p className="apple-caption text-apple-gray-500">Diseñada con amor para nuestras vendedoras</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
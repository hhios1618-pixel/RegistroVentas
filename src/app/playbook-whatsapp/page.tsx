'use client';

import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronRight, Heart, MessageCircle, Eye, Sparkles, CheckCircle, Users, Clock, ArrowRight, Phone } from 'lucide-react';

// -----------------------------------------------------
// CONFIGURACIÓN Y TIPOS
// -----------------------------------------------------
const BRAND = {
  title: 'Guía de Atención Fénix',
  subtitle: 'Tu compañera para atender con calidez y cerrar más ventas',
  primaryColor: 'from-blue-500 to-cyan-400',
  accentColor: 'from-pink-400 to-rose-400',
  glassBg: 'backdrop-blur-xl bg-white/5 border border-white/10',
  cardBg: 'bg-gradient-to-br from-white/8 to-white/4 backdrop-blur-sm border border-white/10',
};

type SalesStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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
    color: 'from-pink-500 to-rose-500',
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
    color: 'from-blue-500 to-cyan-500',
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
    color: 'from-purple-500 to-indigo-500',
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
    color: 'from-orange-500 to-red-500',
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
    color: 'from-green-500 to-emerald-500',
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
    color: 'from-teal-500 to-cyan-500',
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
    color: 'from-red-500 to-pink-500'
  },
  {
    id: 'lo-pienso',
    label: 'Lo voy a pensar',
    situation: 'Indecisión',
    response: 'Por supuesto, [NOMBRE]. Es normal querer pensarlo bien. ¿Hay algo específico que le preocupa? Me encantaría resolver cualquier duda que tenga.',
    icon: '🤔',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'no-sirve',
    label: 'No sé si me sirve',
    situation: 'Duda sobre utilidad',
    response: 'Entiendo su preocupación, [NOMBRE]. Por eso le ofrezco nuestra garantía: si no queda satisfecho, le devolvemos su dinero sin preguntas.',
    icon: '❓',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'sin-dinero',
    label: 'No tengo dinero',
    situation: 'Limitación económica',
    response: 'No se preocupe, [NOMBRE]. ¿Le parece si se lo aparto por 24 horas sin compromiso? O tenemos pago contra entrega.',
    icon: '💳',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'garantia',
    label: 'Dar garantía',
    situation: 'Generar confianza',
    response: 'Le ofrecemos una garantía de 48 horas una vez recepcionado el producto, [NOMBRE]. Así puede probarlo con total tranquilidad.',
    icon: '🛡️',
    color: 'from-green-500 to-emerald-500'
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
// COMPONENTES UI
// -----------------------------------------------------
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center mb-8">
    <div className="flex items-center space-x-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
            ${i + 1 <= currentStep 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white' 
              : 'bg-white/10 text-white/50'
            }
          `}>
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`
              w-8 h-1 rounded transition-all duration-300
              ${i + 1 < currentStep ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-white/10'}
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ScriptCard: React.FC<{
  script: Script;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}> = ({ script, onCopy, isCopied }) => (
  <div className={`${BRAND.cardBg} rounded-xl p-4 hover:bg-white/10 transition-all duration-300`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h4 className="font-semibold text-white text-sm mb-1">{script.title}</h4>
        <p className="text-xs text-cyan-300 mb-2">{script.situation}</p>
      </div>
      <button
        onClick={() => onCopy(script.content, script.id)}
        className={`
          flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
          ${isCopied 
            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
          }
        `}
      >
        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {isCopied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
    
    <div className="bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
      <pre className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
        {script.content}
      </pre>
    </div>
    
    {script.tips && (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
        <p className="text-xs text-yellow-300">
          💡 <strong>Tip:</strong> {script.tips}
        </p>
      </div>
    )}
  </div>
);

const SalesStepSection: React.FC<{
  step: SalesStep;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  isActive: boolean;
  onActivate: () => void;
}> = ({ step, onCopy, copiedId, isActive, onActivate }) => {
  const Icon = step.icon;
  
  return (
    <div className={`
      rounded-2xl p-6 transition-all duration-300 cursor-pointer
      ${isActive ? `${BRAND.cardBg} ring-2 ring-blue-400/50` : 'bg-white/5 hover:bg-white/8'}
    `} onClick={onActivate}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          bg-gradient-to-br ${step.color}
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white/60">PASO {step.number}</span>
            <ChevronRight className={`w-4 h-4 text-white/60 transition-transform ${isActive ? 'rotate-90' : ''}`} />
          </div>
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
          <p className="text-sm text-white/70">{step.description}</p>
        </div>
      </div>
      
      {isActive && (
        <div className="space-y-4 mt-6">
          {step.scripts.map(script => (
            <ScriptCard
              key={script.id}
              script={script}
              onCopy={onCopy}
              isCopied={copiedId === script.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const QuickResponseButton: React.FC<{
  response: QuickResponse;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}> = ({ response, onCopy, isCopied }) => (
  <button
    onClick={() => onCopy(response.response, response.id)}
    className={`
      relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:scale-105
      bg-gradient-to-br ${response.color} group w-full
    `}
  >
    <div className="relative z-10">
      <div className="text-2xl mb-2">{response.icon}</div>
      <div className="text-white font-semibold text-sm mb-1">{response.label}</div>
      <div className="text-white/80 text-xs">{response.situation}</div>
      {isCopied && (
        <div className="absolute top-2 right-2 bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
          ✅ Copiado
        </div>
      )}
    </div>
    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

// -----------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------
export default function WhatsAppPlaybookPage() {
  const { copiedId, copyText } = useCopyToClipboard();
  const { searchTerm, setSearchTerm, filteredSteps, filteredQuickResponses } = useSearch();
  const [activeStepId, setActiveStepId] = useState<string>('saludo');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${BRAND.primaryColor} bg-clip-text text-transparent mb-4`}>
              {BRAND.title}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              {BRAND.subtitle}
            </p>
            
            {/* Progress Indicator */}
            <ProgressIndicator currentStep={SALES_FLOW.findIndex(s => s.id === activeStepId) + 1} totalSteps={SALES_FLOW.length} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Search */}
        <section>
          <div className={`${BRAND.glassBg} rounded-2xl p-6`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar scripts, situaciones o respuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Quick Responses */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-pink-400" />
            Respuestas Rápidas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredQuickResponses.map(response => (
              <QuickResponseButton
                key={response.id}
                response={response}
                onCopy={copyText}
                isCopied={copiedId === response.id}
              />
            ))}
          </div>
        </section>

        {/* Sales Flow */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <ArrowRight className="w-6 h-6 text-cyan-400" />
            Flujo de Atención Paso a Paso
          </h2>
          <div className="space-y-4">
            {filteredSteps.map(step => (
              <SalesStepSection
                key={step.id}
                step={step}
                onCopy={copyText}
                copiedId={copiedId}
                isActive={activeStepId === step.id}
                onActivate={() => setActiveStepId(step.id)}
              />
            ))}
          </div>
        </section>

        {/* Tips Section */}
        <section>
          <div className={`${BRAND.cardBg} rounded-2xl p-6`}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              Recuerda Siempre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-pink-300 mb-2">Trato Respetuoso</h4>
                <p className="text-sm text-white/80">Siempre usar "usted" y el nombre del cliente. Esto genera confianza inmediata.</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Empatía Genuina</h4>
                <p className="text-sm text-white/80">Usar frases como "entiendo", "es normal", "no se preocupe" para conectar emocionalmente.</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-300 mb-2">Beneficios sobre Características</h4>
                <p className="text-sm text-white/80">Siempre explicar cómo el producto les ayuda en su vida diaria, no solo qué hace.</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-300 mb-2">Generar Seguridad</h4>
                <p className="text-sm text-white/80">Ofrecer garantías, pago contra entrega y seguimiento para eliminar miedos.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-white/50">
            <p>Fénix • Guía de Atención • Diseñada con ❤️ para nuestras vendedoras</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// SolarMonitor PV - Info Section
// Sección informativa sobre el proyecto y el sistema fotovoltaico
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Sun, 
  MapPin, 
  Cpu, 
  Wifi, 
  Database, 
  Zap,
  Clock,
  ThermometerSun,
  ArrowRight
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// COMPONENTE INFO SECTION
// =============================================================================

const InfoSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current?.children || [],
        { y: 60, opacity: 0, rotateX: 15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 80%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: <Sun className="w-8 h-8" />,
      title: 'Energía Solar',
      description: 'Panel fotovoltaico captura la energía del sol y la convierte en electricidad limpia y renovable.',
      color: 'amber',
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: 'ESP8266',
      description: 'Microcontrolador WiFi de bajo consumo que procesa los datos del sensor y los transmite a la nube.',
      color: 'cyan',
    },
    {
      icon: <Wifi className="w-8 h-8" />,
      title: 'Conexión WiFi',
      description: 'Transmisión inalámbrica de datos en tiempo real mediante el protocolo HTTP a Firebase.',
      color: 'blue',
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: 'Firebase RTDB',
      description: 'Base de datos en tiempo real de Google que almacena y sincroniza los datos instantáneamente.',
      color: 'green',
    },
  ];

  const stats = [
    { label: 'Ubicación', value: 'Parque Caldas', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Ciudad', value: 'Popayán, Cauca', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Latitud', value: '2°27\'N', icon: <Zap className="w-4 h-4" /> },
    { label: 'Longitud', value: '76°37\'W', icon: <Zap className="w-4 h-4" /> },
    { label: 'Altitud', value: '1,760 msnm', icon: <ThermometerSun className="w-4 h-4" /> },
    { label: 'Zona Horaria', value: 'UTC-5', icon: <Clock className="w-4 h-4" /> },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    cyan: { bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', border: 'border-neon-cyan/30' },
    blue: { bg: 'bg-neon-blue/10', text: 'text-neon-blue', border: 'border-neon-blue/30' },
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  };

  return (
    <section
      id="info"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-void-black py-20 px-4 sm:px-6 lg:px-8"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-blue/10 border border-neon-blue/30 mb-6">
            <Zap className="w-4 h-4 text-neon-blue" />
            <span className="font-mono-custom text-xs uppercase tracking-wider text-neon-blue">
              Sobre el Proyecto
            </span>
          </div>
          
          <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
            Sistema Fotovoltaico
            <span className="text-neon-blue"> Inteligente</span>
          </h2>
          
          <p className="font-mono-custom text-white/50 max-w-3xl mx-auto">
            Experimentos de energía renovable en el Parque Caldas de Popayán, 
            utilizando tecnología IoT para monitoreo remoto en tiempo real.
          </p>
        </div>

        {/* Feature Cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {features.map((feature, index) => {
            const colors = colorMap[feature.color];
            return (
              <div
                key={index}
                className={`
                  group relative p-6 rounded-2xl border backdrop-blur-sm
                  ${colors.bg} ${colors.border}
                  transition-all duration-300 hover:scale-[1.02]
                `}
              >
                {/* Glow effect */}
                <div className={`
                  absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
                  transition-opacity duration-500 blur-xl
                  ${colors.bg}
                `} />

                {/* Content */}
                <div className="relative z-10">
                  <div className={`${colors.text} mb-4`}>
                    {feature.icon}
                  </div>
                  
                  <h3 className="font-display text-xl text-white mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="font-mono-custom text-sm text-white/60 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className={`
                    mt-4 flex items-center gap-2
                    ${colors.text} opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                  `}>
                    <span className="font-mono-custom text-xs">Ver más</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Corner accent */}
                <div className={`
                  absolute top-0 right-0 w-16 h-16
                  bg-gradient-to-bl from-white/5 to-transparent
                  rounded-tr-2xl
                `} />
              </div>
            );
          })}
        </div>

        {/* Location Stats */}
        <div className="p-8 rounded-3xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-neon-cyan" />
            <h3 className="font-display text-2xl text-white">
              Ubicación del Experimento
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-white/5 border border-white/5 text-center"
              >
                <div className="flex justify-center mb-2 text-neon-cyan">
                  {stat.icon}
                </div>
                <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <p className="font-display text-lg text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Map placeholder */}
          <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl text-white mb-1">
                  Parque Caldas, Popayán
                </p>
                <p className="font-mono-custom text-sm text-white/50">
                  Cerca de la Torre del Reloj - Unimayor
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-neon-cyan" />
              </div>
            </div>
          </div>
        </div>

        {/* --- NUEVAS SECCIONES DE REQUERIMIENTOS --- */}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16">
          
          {/* Montaje Experimental */}
          <div className="p-8 rounded-3xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
            <h3 className="font-display text-2xl text-white mb-6 flex items-center gap-3">
              <Sun className="w-6 h-6 text-amber-400" />
              Montaje Experimental
            </h3>
            <div className="space-y-4 font-mono-custom text-sm text-white/60 leading-relaxed">
              <p>
                El sistema consiste en un panel solar monocristalino de rientado hacia el cenit para maximizar la captación en latitudes ecuatoriales (Popayán, 2°N). 
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Sensor INA219 (Panel):</strong> Monitorea la generación bruta del panel.</li>
                <li><strong>Sensor INA219 (Batería):</strong> Mide el flujo neto hacia/desde el acumulador.</li>
                <li><strong>Regulador DC-DC:</strong> Convertidor Buck para estabilizar la carga a 13.8V.</li>
                <li><strong>Condiciones Ambientales:</strong> Clima templado (18-24°C) con alta nubosidad variable.</li>
              </ul>
            </div>
          </div>

          {/* Configuración de Cargas */}
          <div className="p-8 rounded-3xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
            <h3 className="font-display text-2xl text-white mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-neon-blue" />
              Configuración de Cargas
            </h3>
            <div className="space-y-4 font-mono-custom text-sm text-white/60 leading-relaxed">
              <p>
                Para evaluar el rendimiento bajo diferentes perfiles de consumo, se han configurado las siguientes cargas controladas por el ESP8266:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-neon-cyan font-bold mb-1">Carga 1: LEDs</p>
                  <p className="text-[11px]">Matriz de 12 LEDs de alta potencia (3W total) para simular iluminación nocturna.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-neon-blue font-bold mb-1">Carga 2: Ventilador</p>
                  <p className="text-[11px]">Motor DC de 12V (5W) para simular cargas inductivas y enfriamiento del sistema.</p>
                </div>
              </div>
              <p className="text-[11px] mt-2 italic">
                * La eficiencia del convertidor se calcula comparando la potencia de entrada del panel vs la potencia consumida por las cargas activas.
              </p>
            </div>
          </div>

        </div>

        {/* Tabla de Calibración y Referencia */}
        <div className="mt-8 p-8 rounded-3xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="font-display text-2xl text-white flex items-center gap-3">
                <Cpu className="w-6 h-6 text-neon-cyan" />
                Validación y Calibración
              </h3>
              <p className="font-mono-custom text-xs text-white/40 mt-1 uppercase tracking-widest">
                Instrumento de referencia: Multímetro Fluke 115 (True RMS)
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="font-mono-custom text-[10px] text-emerald-400 uppercase">Error Promedio: &lt; 1.5%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full font-mono-custom text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-4 font-normal">Parámetro</th>
                  <th className="py-4 px-4 font-normal">Lectura Sensor (INA)</th>
                  <th className="py-4 px-4 font-normal">Multímetro Ref.</th>
                  <th className="py-4 px-4 font-normal">Error (%)</th>
                  <th className="py-4 px-4 font-normal text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white">Voltaje Panel</td>
                  <td className="py-4 px-4">12.45 V</td>
                  <td className="py-4 px-4">12.51 V</td>
                  <td className="py-4 px-4 text-amber-400">0.48 %</td>
                  <td className="py-4 px-4 text-right text-emerald-400 font-bold">Óptimo</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white">Corriente Carga</td>
                  <td className="py-4 px-4">350.2 mA</td>
                  <td className="py-4 px-4">355.0 mA</td>
                  <td className="py-4 px-4 text-amber-400">1.35 %</td>
                  <td className="py-4 px-4 text-right text-emerald-400 font-bold">Óptimo</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white">Voltaje Batería</td>
                  <td className="py-4 px-4">13.62 V</td>
                  <td className="py-4 px-4">13.65 V</td>
                  <td className="py-4 px-4 text-amber-400">0.22 %</td>
                  <td className="py-4 px-4 text-right text-emerald-400 font-bold">Óptimo</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex gap-4">
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="font-mono-custom text-[10px] text-white/40 uppercase mb-2">Confiabilidad de Datos</p>
              <p className="text-xs leading-relaxed text-white/60">
                Los datos presentan una alta correlación con el instrumental de laboratorio. Se recomienda calibración trimestral para compensar derivas térmicas en el shunt del INA219.
              </p>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="font-mono-custom text-[10px] text-white/40 uppercase mb-2">Compensación por Software</p>
              <p className="text-xs leading-relaxed text-white/60">
                Se aplica un offset de -0.05V en firmware para corregir caídas de tensión en los conectores JST del circuito.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;

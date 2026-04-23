// =============================================================================
// SolarMonitor PV - Solar Hero Section
// Hero inmersivo con efecto de decodificación de texto para el proyecto solar
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Sun, Activity, MapPin, ChevronDown, Lightbulb, BarChart2 } from 'lucide-react';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const TARGET_TEXT = 'SOLARMONITOR';
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NAV_ITEMS = [
  { label: 'Dashboard', sectionId: 'dashboard', icon: Activity },
  { label: 'Luces',     sectionId: 'luces',     icon: Lightbulb },
  { label: 'Histórico', sectionId: 'historico', icon: BarChart2 },
  { label: 'Proyecto',  sectionId: 'info',       icon: Sun },
];

// =============================================================================
// COMPONENTE SOLAR HERO
// =============================================================================

const SolarHero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const [displayText, setDisplayText] = useState(' '.repeat(TARGET_TEXT.length));
  const [isDecoding, setIsDecoding] = useState(true);

  // Decode text effect
  useEffect(() => {
    let iteration = 0;
    const maxIterations = TARGET_TEXT.length * 8;

    const interval = setInterval(() => {
      setDisplayText(() => {
        return TARGET_TEXT.split('')
          .map((_, index) => {
            if (index < iteration / 8) {
              return TARGET_TEXT[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('');
      });

      iteration += 1;

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(TARGET_TEXT);
        setIsDecoding(false);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Nav slide in
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 }
      );

      // Subtitle fade in
      gsap.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 1.5 }
      );

      // Scroll indicator bounce
      gsap.to('.scroll-indicator', {
        y: 10,
        repeat: -1,
        yoyo: true,
        duration: 1,
        ease: 'power1.inOut',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative w-full h-screen overflow-hidden bg-void-black"
    >
      {/* Background with animated gradient */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-void-black via-void-dark to-void-black" />
        
        {/* Animated solar gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(0, 212, 255, 0.15) 0%, transparent 50%)',
          }}
        />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 70% 80%, rgba(255, 184, 0, 0.1) 0%, transparent 50%)',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-neon-cyan rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.5 + 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation pill */}
      <nav
        ref={navRef}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 nav-pill rounded-full px-2 py-2"
      >
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.sectionId}
                onClick={() => scrollToSection(item.sectionId)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-mono-custom uppercase tracking-wider text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Logo / Brand */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display text-lg text-white block leading-tight">SolarMonitor</span>
              <span className="font-mono-custom text-[10px] text-neon-cyan uppercase tracking-wider">PV System</span>
            </div>
          </div>
        </div>

        {/* Main title with decode effect */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono-custom text-xs text-neon-cyan uppercase tracking-wider">
              Sistema en Línea
            </span>
          </div>

          <h1
            ref={titleRef}
            className="decode-text text-[14vw] md:text-[10vw] lg:text-[8vw] font-bold text-white leading-none tracking-tighter mb-4"
          >
            <span className={`${isDecoding ? 'text-glow-cyan' : ''} transition-all duration-300`}>
              {displayText}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="font-mono-custom text-sm md:text-base text-neon-soft/70 uppercase tracking-[0.3em]"
          >
            Monitoreo Fotovoltaico en Tiempo Real
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button
            onClick={() => scrollToSection('dashboard')}
            className="group px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-blue text-void-black font-display text-sm uppercase tracking-wider rounded-full hover:shadow-lg hover:shadow-neon-cyan/30 transition-all duration-300 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Ver Dashboard
          </button>
          <button
            onClick={() => scrollToSection('info')}
            className="px-8 py-4 border border-white/30 text-white font-display text-sm uppercase tracking-wider rounded-full hover:border-neon-cyan hover:text-neon-cyan transition-colors duration-300 flex items-center gap-2"
          >
            <Sun className="w-4 h-4" />
            Conocer el Proyecto
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
          <div className="text-center">
            <p className="font-display text-2xl sm:text-3xl text-neon-cyan">24h</p>
            <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Monitoreo</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl sm:text-3xl text-neon-blue">Real</p>
            <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Tiempo</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl sm:text-3xl text-emerald-400">IoT</p>
            <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Conectado</p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Desplazar</span>
        <ChevronDown className="scroll-indicator w-5 h-5 text-neon-cyan" />
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      {/* Corner accents */}
      <div className="absolute top-8 right-8 text-right">
        <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Ubicación</p>
        <div className="flex items-center gap-1 justify-end mt-1">
          <MapPin className="w-3 h-3 text-neon-cyan" />
          <p className="font-mono-custom text-xs text-neon-soft/60">Parque Caldas, Popayán</p>
        </div>
      </div>

      {/* Side decorations */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2">
        <div className="w-1 h-16 bg-gradient-to-b from-transparent via-neon-cyan/50 to-transparent rounded-full" />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2">
        <div className="w-1 h-16 bg-gradient-to-b from-transparent via-neon-blue/50 to-transparent rounded-full" />
      </div>
    </section>
  );
};

export default SolarHero;

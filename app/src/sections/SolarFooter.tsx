// =============================================================================
// SolarMonitor PV - Solar Footer
// Footer moderno con información del proyecto y enlaces
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Sun,
  Mail,
  Globe,
  MapPin,
  Github,
  Twitter,
  Linkedin,
  Zap,
  Activity,
  ArrowUp
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// COMPONENTE SOLAR FOOTER
// =============================================================================

const SolarFooter: React.FC = () => {
  const footerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const quickLinks = [
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Sobre el Proyecto', href: '#info' },
    { label: 'Estadísticas', href: '#stats' },
    { label: 'Documentación', href: '#' },
  ];

  const resources = [
    { label: 'API REST', href: '#' },
    { label: 'Firebase RTDB', href: 'https://caldas-d4fa9-default-rtdb.firebaseio.com' },
    { label: 'Código Fuente', href: '#' },
    { label: 'Reportes', href: '#' },
  ];

  const socialLinks = [
    { icon: <Github className="w-5 h-5" />, label: 'GitHub', href: '#' },
    { icon: <Twitter className="w-5 h-5" />, label: 'Twitter', href: '#' },
    { icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', href: '#' },
  ];

  return (
    <footer
      id="contact"
      ref={footerRef}
      className="relative w-full bg-void-black pt-20 pb-8 px-4 sm:px-6 lg:px-8"
    >
      {/* Top border gradient */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
      </div>

      <div ref={contentRef} className="relative z-10 max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-display text-xl text-white">SolarMonitor</h3>
                <p className="font-mono-custom text-xs text-neon-cyan uppercase tracking-wider">PV System</p>
              </div>
            </div>

            <p className="font-mono-custom text-sm text-white/60 leading-relaxed mb-6">
              Sistema de monitoreo fotovoltaico en tiempo real para experimentos
              de energía renovable en el Parque Caldas, Popayán.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-300"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg text-white mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan" />
              Enlaces Rápidos
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="font-mono-custom text-sm text-white/60 hover:text-neon-cyan transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-white/30 group-hover:bg-neon-cyan transition-colors" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display text-lg text-white mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-blue" />
              Recursos
            </h4>
            <ul className="space-y-3">
              {resources.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="font-mono-custom text-sm text-white/60 hover:text-neon-blue transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-white/30 group-hover:bg-neon-blue transition-colors" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-display text-lg text-white mb-6 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Contacto
            </h4>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-white/40 mt-1" />
                <div>
                  <p className="font-mono-custom text-sm text-white">Unimayor</p>
                  <p className="font-mono-custom text-xs text-white/50">Parque Caldas, Popayán</p>
                  <p className="font-mono-custom text-xs text-white/50">Cauca, Colombia</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-white/40" />
                <a
                  href="mailto:solar@unimayor.edu.co"
                  className="font-mono-custom text-sm text-white/60 hover:text-neon-cyan transition-colors"
                >
                  solar@unimayor.edu.co
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-white/40" />
                <a
                  href="https://www.unimayor.edu.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-custom text-sm text-white/60 hover:text-neon-cyan transition-colors"
                >
                  www.unimayor.edu.co
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="font-mono-custom text-xs text-white/40 text-center md:text-left">
              © 2026 SolarMonitor PV. Proyecto de energía renovable - Unimayor.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono-custom text-xs text-emerald-400 uppercase tracking-wider">
                Sistema Operativo
              </span>
            </div>

            {/* Back to top */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-neon-cyan/10 hover:border-neon-cyan/30 transition-all duration-300 group"
            >
              <span className="font-mono-custom text-xs text-white/60 group-hover:text-neon-cyan transition-colors">
                Volver arriba
              </span>
              <ArrowUp className="w-4 h-4 text-white/60 group-hover:text-neon-cyan transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SolarFooter;

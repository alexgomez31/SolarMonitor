// =============================================================================
// SolarMonitor PV - Configuration
// Configuración del sitio web de monitoreo fotovoltaico
// =============================================================================

// -- Site-wide settings -------------------------------------------------------
export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export const siteConfig: SiteConfig = {
  title: "SolarMonitor PV - Monitoreo Fotovoltaico en Tiempo Real",
  description: "Plataforma de monitoreo en tiempo real para sistema fotovoltaico experimental en Parque Caldas, Popayán. Datos transmitidos vía ESP8266 WiFi.",
  language: "es",
};

// -- API Configuration --------------------------------------------------------
export interface ApiConfig {
  baseUrl: string;
  refreshInterval: number;
  endpoints: {
    data: string;
    status: string;
    history: string;
  };
}

export const apiConfig: ApiConfig = {
  baseUrl: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`,
  refreshInterval: 2000, // 2 segundos
  endpoints: {
    data: "/data",
    status: "/status",
    history: "/history",
  },
};

// -- Firebase Configuration ---------------------------------------------------
export interface FirebaseConfig {
  databaseUrl: string;
  projectName: string;
}

export const firebaseConfig: FirebaseConfig = {
  databaseUrl: "https://caldas-d4fa9-default-rtdb.firebaseio.com",
  projectName: "caldas-d4fa9",
};

// -- Location Configuration ---------------------------------------------------
export interface LocationConfig {
  name: string;
  city: string;
  department: string;
  country: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
  altitude: string;
  timezone: string;
  landmark: string;
}

export const locationConfig: LocationConfig = {
  name: "Parque Caldas",
  city: "Popayán",
  department: "Cauca",
  country: "Colombia",
  coordinates: {
    latitude: "2°27'N",
    longitude: "76°37'W",
  },
  altitude: "1,760 msnm",
  timezone: "UTC-5",
  landmark: "Torre del Reloj",
};

// -- Hardware Configuration ---------------------------------------------------
export interface HardwareConfig {
  microcontroller: string;
  communication: string;
  sensors: string[];
  powerSource: string;
}

export const hardwareConfig: HardwareConfig = {
  microcontroller: "ESP8266",
  communication: "WiFi 2.4GHz",
  sensors: ["Sensor de Voltaje", "Sensor de Corriente"],
  powerSource: "Panel Solar 50W",
};

// -- Dashboard Configuration --------------------------------------------------
export interface DashboardConfig {
  gauges: {
    voltage: {
      min: number;
      max: number;
      unit: string;
      label: string;
      color: string;
    };
    current: {
      min: number;
      max: number;
      unit: string;
      label: string;
      color: string;
    };
    power: {
      min: number;
      max: number;
      unit: string;
      label: string;
      color: string;
    };
  };
  charts: {
    maxPoints: number;
    updateInterval: number;
  };
}

export const dashboardConfig: DashboardConfig = {
  gauges: {
    voltage: {
      min: 0,
      max: 24,
      unit: "V",
      label: "Voltaje",
      color: "cyan",
    },
    current: {
      min: 0,
      max: 5,
      unit: "A",
      label: "Corriente",
      color: "blue",
    },
    power: {
      min: 0,
      max: 100,
      unit: "W",
      label: "Potencia",
      color: "green",
    },
  },
  charts: {
    maxPoints: 50,
    updateInterval: 2000,
  },
};

// -- Navigation Configuration -------------------------------------------------
export interface NavItem {
  label: string;
  sectionId: string;
  icon: string;
}

export interface NavigationConfig {
  items: NavItem[];
}

export const navigationConfig: NavigationConfig = {
  items: [
    { label: "Dashboard", sectionId: "dashboard", icon: "activity" },
    { label: "Proyecto", sectionId: "info", icon: "sun" },
    { label: "Estadísticas", sectionId: "stats", icon: "zap" },
  ],
};

// -- Footer Configuration -----------------------------------------------------
export interface FooterConfig {
  brandName: string;
  brandDescription: string;
  projectInfo: {
    institution: string;
    department: string;
    location: string;
  };
  contact: {
    email: string;
    website: string;
  };
  socialLinks: {
    name: string;
    url: string;
    icon: string;
  }[];
  copyright: string;
}

export const footerConfig: FooterConfig = {
  brandName: "SolarMonitor PV",
  brandDescription: "Sistema de monitoreo fotovoltaico en tiempo real para experimentos de energía renovable.",
  projectInfo: {
    institution: "Unimayor",
    department: "Facultad de Ingeniería",
    location: "Popayán, Cauca, Colombia",
  },
  contact: {
    email: "solar@unimayor.edu.co",
    website: "https://www.unimayor.edu.co",
  },
  socialLinks: [
    { name: "GitHub", url: "#", icon: "github" },
    { name: "Twitter", url: "#", icon: "twitter" },
    { name: "LinkedIn", url: "#", icon: "linkedin" },
  ],
  copyright: "© 2026 SolarMonitor PV. Todos los derechos reservados.",
};

// -- Theme Configuration ------------------------------------------------------
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  fonts: {
    display: string;
    mono: string;
  };
}

export const themeConfig: ThemeConfig = {
  colors: {
    primary: "#00D4FF",
    secondary: "#4D9FFF",
    accent: "#FFB800",
    success: "#00FF88",
    warning: "#FFB800",
    danger: "#FF4D4D",
    background: "#050508",
    surface: "#0A0A0F",
    text: "#FFFFFF",
    textMuted: "rgba(255, 255, 255, 0.5)",
  },
  fonts: {
    display: "Inter",
    mono: "JetBrains Mono",
  },
};

export default {
  siteConfig,
  apiConfig,
  firebaseConfig,
  locationConfig,
  hardwareConfig,
  dashboardConfig,
  navigationConfig,
  footerConfig,
  themeConfig,
};

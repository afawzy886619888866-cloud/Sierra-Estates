/**
 * SIERRA ESTATES — GLOBAL CONFIGURATION
 * Centralized source of truth for contact info, social links, and site metadata.
 * Part of the "Cleanup & Unify" initiative.
 */

export const SiteConfig = {
  branding: {
    name: "Sierra Blu Realty / Sierra Estates",
    legalName: "Sierra Blu Realty & Sierra Estates Real Estate Investment",
    tagline: "Beyond Brokerage — Smarter Decisions, AI-Driven.",
    foundedIn: "2026",
    palette: {
      navy: "#0A1628",
      gold: "#C9A84C",
      ivory: "#F4F0E8",
      sierraBlue: "#BFDAF7",
    },
    fonts: {
      headings: "Playfair Display, serif",
      arabic: "Cairo, sans-serif",
      metrics: "Inter, sans-serif",
    },
  },
  leadership: [
    {
      name: "Ahmed Fawzy",
      role: "Chief Executive Officer & Sales Manager",
      rbac: "Super Admin",
      duties: "Executive Leadership, Foreign Buyer Sales & Deal Closing",
    },
    {
      name: "Farida",
      role: "Sales Team Leader & HR Manager",
      rbac: "Operational Admin",
      duties: "Operations Management, Team Leadership & Direct Closing",
    },
  ],
  executive: {
    name: "Ahmed Fawzy",
    role: "Chief Executive Officer & Sales Manager",
    phone: "+20 10 61399688",
    email: "EmeraldEstatesegypt@gmail.com",
    telegramBot: "https://t.me/Sierrablurealtybot",
  },
  contact: {
    whatsapp: "https://wa.me/201061399688",
    mainOffice: "Cairo, Egypt",
  },
  links: {
    portal: "/",
    landing: "/landing",
  }
};

/**
 * OS V4.0 Intelligence Thresholds
 * Used by Matching and Ranking engines.
 */
export const SierraEstatesOS = {
  version: "4.0.0",
  thresholds: {
    matchingScore: 0.75,       // Minimum score to suggest a match
    highIntensityLead: 0.85,  // Threshold for hot leads
    priceDeviation: 0.15,     // Alert if price differs by >15% from project avg
  },
  stages: [
    "acquisition", "parsing", "branding", "distribution", 
    "intelligence", "matching", "sales", "viewing", 
    "closing", "feedback"
  ],
  enabledEngines: {
    geminiNLP: true,
    matchingNeuralNet: true,
    marketingAutomation: true,
    orchestrationLedger: true
  }
};

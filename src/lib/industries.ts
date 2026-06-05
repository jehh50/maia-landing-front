export const INDUSTRIES = [
  'Retail / E-commerce',
  'Finanzas / Banca',
  'Salud / Farmacéutica',
  'Educación',
  'Manufactura',
  'Logística / Transporte',
  'Telecomunicaciones',
  'Servicios profesionales',
  'Tecnología / SaaS',
  'Gobierno / Sector público',
  'Hospitalidad / Turismo',
  'Inmobiliaria',
  'Otro',
] as const;

export type Industry = typeof INDUSTRIES[number];

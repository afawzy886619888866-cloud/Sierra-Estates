/**
 * Sierra Estates · New Cairo compound reference data.
 *
 * NOTE: This is *reference / seed* data used only by the client-facing AI tools
 * (ROI leaderboard, AVM pricing base rates, Dream-Home recommendations).
 * The real property inventory shown on /client still comes live from Firestore
 * (onSnapshot on the 'listings' collection) — this file does NOT replace it.
 */

export interface CompoundRef {
  /** Display name */
  n: string;
  /** [lat, lng] */
  c: [number, number];
  /** YoY appreciation, e.g. "+22%" */
  g: string;
  /** Sierra AI score /10 */
  ai: number;
  /** Zone label */
  z: string;
  /** Base resale price in EGP millions (for a ~200 m², 3-bed benchmark unit) */
  priceM: number;
  /** Benchmark monthly rent in USD */
  rent: number;
}

export const COMPOUNDS: CompoundRef[] = [
  { n: 'Katameya Heights', c: [29.99, 31.48], g: '+10%', ai: 9, z: 'Katameya', priceM: 26, rent: 5000 },
  { n: 'Katameya Dunes', c: [29.985, 31.492], g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400 },
  { n: 'Swan Lake Residence', c: [30.045, 31.635], g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700 },
  { n: 'Mivida', c: [30.007, 31.589], g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100 },
  { n: 'Cairo Festival City (CFC) Residences', c: [30.016, 31.469], g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
  { n: 'Hyde Park New Cairo', c: [30.008, 31.645], g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200 },
  { n: 'Taj City', c: [30.065, 31.531], g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500 },
  { n: 'Eastown (SODIC)', c: [30.018, 31.587], g: '+19%', ai: 9, z: '5th Settlement', priceM: 11.5, rent: 2400 },
  { n: 'Mountain View iCity', c: [30.014, 31.618], g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200 },
  { n: 'Zed East (Ora)', c: [30.095, 31.61], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600 },
  { n: 'Palm Hills New Cairo', c: [30.002, 31.608], g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800 },
  { n: 'The Waterway', c: [30.04, 31.47], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300 },
  { n: 'Lake View / Lake View Residence', c: [30.022, 31.532], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900 },
  { n: 'Fifth Square (Al Marasem)', c: [30.025, 31.578], g: '+17%', ai: 9, z: '5th Settlement', priceM: 8.5, rent: 1750 },
  { n: 'Villette (SODIC)', c: [30.053, 31.598], g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400 },
  { n: 'Stone Residence (Rooya Group)', c: [30.028, 31.557], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550 },
  { n: 'The Square (Al Ahly Sabbour)', c: [30.033, 31.542], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800 },
  { n: 'El Patio Oro (La Vista)', c: [30.029, 31.56], g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000 },
  { n: 'El Patio 7 (La Vista)', c: [30.035, 31.565], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700 },
  { n: 'Katameya Gardens', c: [29.992, 31.488], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800 },
  { n: 'Village Gardens Katameya (Palm Hills)', c: [29.988, 31.484], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000 },
  { n: 'Galleria Moon Valley (Arabia Holding)', c: [30.02, 31.55], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400 },
  { n: '90 Avenue (Tabarak)', c: [30.028, 31.572], g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600 },
  { n: 'Azzar New Cairo (Reedy Group)', c: [30.022, 31.568], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
  { n: 'District 5 (Marakez)', c: [30.012, 31.5], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900 },
  { n: 'The Brooks (PRE Developments)', c: [30.07, 31.57], g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400 },
  { n: 'STEI8HT (LMD)', c: [30.075, 31.575], g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300 },
  { n: 'The Crest (IL Cazar)', c: [30.068, 31.562], g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450 },
  { n: 'Azad & Azad Views (Tameer)', c: [30.078, 31.558], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350 },
  { n: 'Eastshire (Alqamzi)', c: [30.082, 31.565], g: '+13%', ai: 8.5, z: 'Mostakbal', priceM: 6, rent: 1200 },
  { n: 'The Waterway Branded Residences', c: [30.042, 31.472], g: '+18%', ai: 9.1, z: 'New Cairo', priceM: 18, rent: 3500 },
  { n: 'Aster Residence', c: [30.062, 31.548], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8, rent: 1600 },
  { n: 'The MarQ', c: [30.058, 31.544], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 9, rent: 1800 },
  { n: 'Capital Gate (Al Marasem)', c: [30.026, 31.58], g: '+16%', ai: 9, z: '5th Settlement', priceM: 8.5, rent: 1700 },
  { n: 'Bloomfields (Tatweer Misr)', c: [30.08, 31.55], g: '+16%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1500 },
  { n: 'IL Bosco City (Misr Italia)', c: [30.085, 31.556], g: '+17%', ai: 9, z: 'Mostakbal', priceM: 8.5, rent: 1700 },
  { n: 'Odyssia (Al Ahly Sabbour)', c: [30.09, 31.56], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.5, rent: 1500 },
  { n: 'Haptown (Hassan Allam)', c: [30.086, 31.553], g: '+15%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300 },
  { n: 'Sarai (Madinet Masr)', c: [30.105, 31.662], g: '+14%', ai: 8.9, z: 'New Cairo', priceM: 7, rent: 1400 },
  { n: 'Madinaty', c: [30.078, 31.657], g: '+13%', ai: 8.7, z: 'Madinaty', priceM: 4.5, rent: 900 },
  { n: 'El Shorouk', c: [30.13, 31.62], g: '+11%', ai: 8.5, z: 'El Shorouk', priceM: 5.5, rent: 1100 },
];

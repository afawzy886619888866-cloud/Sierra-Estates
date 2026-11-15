// Generator for floorplan descriptions adhering strictly to plain language rules
import fs from 'node:fs';
import path from 'node:path';

const descDir = 'floorplan/descriptions';
const wsDir = 'floorplan/.cache/worksheets';

// Jargon cleaner according to references/writing-descriptions.md
function cleanJargon(text) {
  if (!text) return '';
  return text
    .replace(/\bAPI endpoint\b/gi, 'request')
    .replace(/\bAPI routes?\b/gi, 'request handler')
    .replace(/\bendpoints?\b/gi, 'requests')
    .replace(/\bAPIs?\b/gi, 'services')
    .replace(/\bwebhooks?\b/gi, 'alerts')
    .replace(/\bmiddleware\b/gi, 'request check')
    .replace(/\bmigrations?\b/gi, 'database updates')
    .replace(/\bqueries\b/gi, 'lookups')
    .replace(/\bquery\b/gi, 'lookup')
    .replace(/\bauth\b/gi, 'sign-in')
    .replace(/\bauthentication\b/gi, 'sign-in')
    .replace(/\bauthorization\b/gi, 'permissions')
    .replace(/\bJWT\b/gi, 'sign-in token')
    .replace(/\bSDK\b/gi, 'service client')
    .replace(/\bcomponents?\b/gi, 'screen building block')
    .replace(/\bfrontend\b/gi, 'website')
    .replace(/\bbackend\b/gi, 'server')
    .replace(/\bUI\b/gi, 'screen')
    .replace(/\bcron jobs?\b/gi, 'scheduled tasks')
    .replace(/\bcron\b/gi, 'timetable')
    .replace(/\bdeploy\b/gi, 'publish')
    .replace(/\bdeployment\b/gi, 'publishing')
    .replace(/\bCI\/CD\b/gi, 'automation checks')
    .replace(/\bmonolith\b/gi, 'main server')
    .replace(/\bNext\.?js\b/gi, 'web')
    .replace(/\bReact\b/gi, 'screen')
    .replace(/\bTailwind\b/gi, 'styling')
    .replace(/\bZod\b/gi, 'data validation')
    .replace(/\bSupabase client\b/gi, 'database connection')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(str) {
  return str
    .replace(/[-_.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function generateFileDescription(filePath, parsedDoc, parsedDef) {
  const base = path.basename(filePath);
  const p = filePath.replace(/\\/g, '/');

  // If parsedDoc exists and is meaningful, refine it
  if (parsedDoc && parsedDoc.length > 10 && !parsedDoc.includes('eslint') && !parsedDoc.includes('TODO')) {
    let doc = parsedDoc.replace(/\r?\n/g, ' ').replace(/^[*#/ -]+/, '').trim();
    doc = cleanJargon(doc);
    if (!/^[A-Z]/.test(doc)) doc = doc.charAt(0).toUpperCase() + doc.slice(1);
    if (!doc.endsWith('.')) doc += '.';
    if (doc.length < 140) return doc;
    const firstSentence = doc.split('.')[0] + '.';
    if (firstSentence.length < 140) return firstSentence;
  }

  // Next.js pages & layouts
  if (p.includes('/app/(site)/') || p.includes('/app/')) {
    if (base === 'page.tsx' || base === 'page.jsx') {
      const segs = p.split('/');
      const parent = segs[segs.length - 2];
      if (parent === '(site)' || parent === 'app') return 'Shows the Sierra Estates home screen with featured properties and overview.';
      if (parent === 'properties') return 'Shows the property catalog with search, price filters, and area selection.';
      if (parent === 'compounds') return 'Displays residential compounds and master projects in New Cairo.';
      if (parent === 'roi') return 'Calculates property investment return, rental yield, and payback period.';
      if (parent === 'price-index') return 'Tracks historical price trends and square-meter market rates in New Cairo.';
      if (parent === 'career' || parent === 'careers') return 'Shows open real estate positions and handles job applications.';
      if (parent === 'advice') return 'Provides property buying guides and legal tips for buyers.';
      if (parent === 'contact') return 'Displays contact details and messaging options for Sierra Estates.';
      if (parent === 'login') return 'Provides the sign-in form for clients and staff members.';
      if (parent === 'client') return 'Displays saved properties, scheduled viewings, and client account status.';
      if (parent === 'admin') return 'Provides the central staff dashboard for managing listings and leads.';
      return `Displays the ${titleCase(parent)} screen and related tools.`;
    }
    if (base === 'layout.tsx') return 'Provides the common page frame, header, navigation, and footer.';
    if (base === 'loading.tsx') return 'Shows a loading placeholder while property data is being retrieved.';
    if (base === 'error.tsx') return 'Shows an error notice and recovery options when a page fails to load.';
    if (base === 'not-found.tsx') return 'Displays a friendly notice when a requested property or page cannot be found.';
  }

  // Admin views
  if (p.includes('/admin/views/') || p.includes('/admin/')) {
    const name = base.replace(/\.[^.]+$/, '');
    return `Lets staff inspect and manage ${titleCase(name).toLowerCase()} records and actions.`;
  }

  // Components
  if (p.includes('/components/')) {
    const name = base.replace(/\.[^.]+$/, '');
    if (name.includes('Hero')) return 'Displays the main banner, headline, and search bar at the top of the screen.';
    if (name.includes('Card')) return `Displays a summary card for a single ${name.replace('Card', '').toLowerCase()} item.`;
    if (name.includes('Map')) return 'Renders an interactive map of New Cairo compounds and available units.';
    if (name.includes('Modal') || name.includes('Dialog')) return 'Opens a pop-up window for user confirmation or form entry.';
    if (name.includes('Filter') || name.includes('Search')) return 'Provides filter controls to narrow down property listings.';
    if (name.includes('Nav') || name.includes('Header')) return 'Shows navigation links, language switcher, and account shortcuts.';
    if (name.includes('Footer')) return 'Displays copyright, contact links, and legal disclaimers at the bottom of the page.';
    return `Displays the ${titleCase(name).toLowerCase()} section on the screen.`;
  }

  // Services
  if (p.includes('/services/') || p.includes('/lib/services/')) {
    const name = base.replace(/\.[^.]+$/, '');
    if (name.includes('Inventory')) return 'Manages property inventory records, pricing updates, and availability status.';
    if (name.includes('WhatsApp')) return 'Reads and formats WhatsApp messages and extracts property details from chats.';
    if (name.includes('Telegram')) return 'Sends notifications and distributes leads across Telegram role chats.';
    if (name.includes('PropertyFinder') || name.includes('PF')) return 'Prepares and syncs property listings and lead data with Property Finder.';
    if (name.includes('Sheet') || name.includes('Excel')) return 'Imports and exports property listings between spreadsheets and the database.';
    if (name.includes('Owner')) return 'Tracks owner contact information, listing submissions, and outreach schedules.';
    if (name.includes('Lead') || name.includes('Laila')) return 'Captures new buyer leads and routes them to available agents.';
    if (name.includes('Viewing') || name.includes('feedback')) return 'Coordinates property viewing appointments and collects client feedback.';
    if (name.includes('closing') || name.includes('Closing') || name.includes('commission')) return 'Calculates deal commissions, closing steps, and payment schedules.';
    if (name.includes('Price') || name.includes('roi') || name.includes('financial')) return 'Calculates property valuation, rental yields, and financial projections.';
    return `Handles ${titleCase(name).toLowerCase()} operations and business calculations.`;
  }

  // Server helpers
  if (p.includes('/lib/server/')) {
    const name = base.replace(/\.[^.]+$/, '');
    if (name.includes('auth')) return 'Verifies user permissions and checks that incoming requests are signed in.';
    if (name.includes('cors')) return 'Configures which external websites are permitted to send requests.';
    if (name.includes('rate-limit')) return 'Prevents abuse by capping how many requests a visitor can send per minute.';
    if (name.includes('telegram')) return 'Formats and broadcasts property alerts to Telegram staff channels.';
    if (name.includes('whatsapp')) return 'Queues and dispatches outgoing WhatsApp messages reliably.';
    return `Provides server-side support for ${titleCase(name).toLowerCase()}.`;
  }

  // Database migrations & models
  if (p.includes('/migrations/') || p.includes('supabase/')) {
    const name = base.replace(/^\d+_/, '').replace(/\.sql$/, '');
    return `Sets up database tables, columns, and access rules for ${titleCase(name).toLowerCase()}.`;
  }

  // Tests
  if (p.includes('__tests__') || p.includes('.test.') || p.includes('.spec.')) {
    const target = base.replace(/\.(test|spec)\.[^.]+$/, '');
    return `Checks that ${titleCase(target).toLowerCase()} functions correctly and catches errors.`;
  }

  // Scripts
  if (p.startsWith('scripts/')) {
    const name = base.replace(/\.[^.]+$/, '');
    if (name.startsWith('check-') || name.startsWith('test-') || name.startsWith('verify-')) {
      return `Checks that ${titleCase(name.replace(/^(check|test|verify)-/, '')).toLowerCase()} is healthy and working.`;
    }
    if (name.startsWith('sync-') || name.startsWith('import-') || name.startsWith('export-')) {
      return `Transfers ${titleCase(name.replace(/^(sync|import|export)-/, '')).toLowerCase()} data between storage systems.`;
    }
    if (name.startsWith('publish-') || name.startsWith('deploy-')) {
      return `Publishes ${titleCase(name.replace(/^(publish|deploy)-/, '')).toLowerCase()} updates to live services.`;
    }
    if (name.startsWith('backfill-') || name.startsWith('retriage-') || name.startsWith('harvest-')) {
      return `Processes and cleans up ${titleCase(name.replace(/^(backfill|retriage|harvest)-/, '')).toLowerCase()} records.`;
    }
    return `Automates ${titleCase(name).toLowerCase()} management tasks from the command line.`;
  }

  // Workflows
  if (p.startsWith('workflows/')) {
    const name = base.replace(/\.[^.]+$/, '');
    return `Runs automated background steps for ${titleCase(name).toLowerCase()}.`;
  }

  // Easy listing app
  if (p.startsWith('apps/easy-listing/')) {
    return 'Supports the streamlined property submission tool for unit owners.';
  }

  // Packages
  if (p.startsWith('packages/')) {
    const name = base.replace(/\.[^.]+$/, '');
    return `Provides shared logic for ${titleCase(name).toLowerCase()}.`;
  }

  return `Provides ${titleCase(base.replace(/\.[^.]+$/, '')).toLowerCase()} functionality.`;
}

export function generateRouteDescription(routeKey, parsedDoc) {
  const [method, routePath] = routeKey.split(' ');
  const cleanPath = routePath.replace(/^\/api\//, '');
  const parts = cleanPath.split('/').filter(Boolean);
  const subject = parts.slice(-2).join(' ').replace(/[-_]/g, ' ');

  if (parsedDoc && parsedDoc.length > 10 && !parsedDoc.includes('TODO')) {
    let doc = cleanJargon(parsedDoc.replace(/\r?\n/g, ' '));
    if (!/^[A-Z]/.test(doc)) doc = doc.charAt(0).toUpperCase() + doc.slice(1);
    if (!doc.endsWith('.')) doc += '.';
    if (doc.length < 140) return doc;
    const first = doc.split('.')[0] + '.';
    if (first.length < 140) return first;
  }

  if (method === 'GET') {
    return `Retrieves ${subject} records and information.`;
  }
  if (method === 'POST') {
    return `Receives and stores new ${subject} submissions.`;
  }
  if (method === 'PUT' || method === 'PATCH') {
    return `Updates existing ${subject} details.`;
  }
  if (method === 'DELETE') {
    return `Removes ${subject} records from the system.`;
  }
  return `Processes ${method} requests for ${subject}.`;
}

export function generateRouteName(routeKey) {
  const [method, routePath] = routeKey.split(' ');
  const cleanPath = routePath.replace(/^\/api\//, '');
  const parts = cleanPath.split('/').filter(Boolean);
  const subject = titleCase(parts.slice(-2).join(' '));
  const verb = { GET: 'View', POST: 'Submit', PUT: 'Update', PATCH: 'Update', DELETE: 'Remove' }[method] || method;
  return `${verb} ${subject}`.slice(0, 40);
}

export function generateFileName(filePath) {
  const base = path.basename(filePath);
  const stem = base.replace(/\.(test|spec)\.[^.]+$/, '').replace(/\.[^.]+$/, '');
  const isTest = /\.(test|spec)\.[^.]+$/.test(base) || filePath.includes('__tests__');
  let clean = titleCase(stem);
  if (isTest) return `${clean} tests`;
  return clean;
}

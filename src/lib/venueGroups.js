import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Default config (used to seed Firestore the first time, and as a fallback) ───
export const DEFAULT_GROUPS = [
  { name: 'Dwyers Group',     color: '#a080ff' },
  { name: 'Clancys Group',    color: '#40a0ff' },
  { name: 'Wedding & Events', color: '#ff60c0' },
];

export const DEFAULT_VENUES = [
  { name: 'Dwyers',                     group: 'Dwyers Group',     logo: '/logos/dwyers.jpg' },
  { name: 'Seventy Seven',              group: 'Dwyers Group',     logo: '/logos/seventyseven.jpg' },
  { name: 'Seventy Seven (1st Floor)',  group: 'Dwyers Group',     logo: '/logos/seventyseven.jpg' },
  { name: 'Stamp Room',                 group: 'Dwyers Group',     logo: '/logos/stamproom.jpg' },
  { name: 'Clancys Cork',               group: 'Clancys Group',    logo: '/logos/clancys.png' },
  { name: 'JJ Walsh',                   group: 'Clancys Group',    logo: '/logos/jjs.png' },
  { name: 'Sky Bar',                    group: 'Clancys Group',    logo: '/logos/skybar.jpg' },
  { name: 'The Wilton',                 group: 'Clancys Group',    logo: '/logos/wilton.jpg' },
  { name: 'The Wash',                   group: null,               logo: '/logos/thewash.jpg' },
  { name: 'The Pav',                    group: null,               logo: '/logos/thepav.png' },
  { name: 'The Dean',                   group: null,               logo: '/logos/thedean.png' },
  { name: 'The Woodford',               group: null,               logo: null },
  { name: 'Mardyke',                    group: null,               logo: '/logos/mardyke.jpeg' },
  { name: 'Wedding',                    group: 'Wedding & Events', logo: '/logos/wedding.jpeg' },
  { name: 'Private Event',              group: 'Wedding & Events', logo: '/logos/event.png' },
];

// Logo files that exist in /public/logos — offered as a picker in the Venues tab
export const AVAILABLE_LOGOS = [
  '/logos/clancys.png', '/logos/dwyers.jpg', '/logos/event.png', '/logos/jjs.png',
  '/logos/mardyke.jpeg', '/logos/skybar.jpg', '/logos/stamproom.jpg', '/logos/thedean.png',
  '/logos/thepav.png', '/logos/thewash.jpg', '/logos/wedding.jpeg', '/logos/wilton.jpg',
  '/logos/seventyseven.jpg',
];

export const GROUP_COLOR_PALETTE = ['#a080ff','#40a0ff','#ff60c0','#ffbb00','#00d4aa','#ff9900','#80d040','#ff4070'];
const INDIVIDUAL_COLOR = '#00d4aa';

// ─── In-memory cache ───
let CONFIG = { groups: DEFAULT_GROUPS, venues: DEFAULT_VENUES };
const listeners = new Set();

export function getVenueConfig() { return CONFIG; }

export function subscribeVenueConfig(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyConfig(cfg) {
  CONFIG = cfg;
  listeners.forEach(fn => fn(cfg));
}

// Load from Firestore. Seeds the doc from defaults (+ any names in settings/venues) on first run.
export async function loadVenueConfig() {
  try {
    const ref  = doc(db, 'settings', 'venueConfig');
    const snap = await getDoc(ref);
    if (snap.exists() && Array.isArray(snap.data().venues)) {
      applyConfig({ groups: snap.data().groups || [], venues: snap.data().venues });
      return CONFIG;
    }
    // Seed: merge default venues with any extra names already in settings/venues
    let extraNames = [];
    try {
      const vSnap = await getDoc(doc(db, 'settings', 'venues'));
      const arr   = vSnap.exists() ? (vSnap.data().list || vSnap.data().venues || []) : [];
      extraNames  = Array.isArray(arr) ? arr : [];
    } catch (_) {}
    const known  = new Set(DEFAULT_VENUES.map(v => v.name));
    const extras = extraNames.filter(n => !known.has(n)).map(n => ({ name: n, group: null, logo: null }));
    const seeded = { groups: DEFAULT_GROUPS, venues: [...DEFAULT_VENUES, ...extras] };
    await setDoc(ref, seeded);
    applyConfig(seeded);
    return CONFIG;
  } catch (e) {
    console.error('loadVenueConfig failed, using defaults:', e);
    return CONFIG;
  }
}

export async function saveVenueConfig(cfg) {
  const clean = {
    groups: cfg.groups.map(g => ({ name: g.name, color: g.color })),
    venues: cfg.venues.map(v => ({ name: v.name, group: v.group || null, logo: v.logo || null })),
  };
  await setDoc(doc(db, 'settings', 'venueConfig'), clean);
  // Keep the legacy flat list in sync so anything still reading settings/venues works
  try {
    await setDoc(doc(db, 'settings', 'venues'), { list: clean.venues.map(v => v.name) }, { merge: true });
  } catch (_) {}
  applyConfig(clean);
}

// ─── Lookups used throughout the app ───
export function getVenueNames() {
  return CONFIG.venues.map(v => v.name);
}

export function getVenueColor(venueName) {
  const v = CONFIG.venues.find(x => x.name === venueName);
  const g = v?.group ? CONFIG.groups.find(gr => gr.name === v.group) : null;
  const color = g?.color || INDIVIDUAL_COLOR;
  return { color, bg: color + '18', group: g?.name || null };
}

export function getVenueLogo(venueName) {
  return CONFIG.venues.find(x => x.name === venueName)?.logo || null;
}

// Scopes a venue admin can be limited to — one per group
export const VENUE_ADMIN_SCOPES = new Proxy([], {
  get(_, prop) {
    const scopes = CONFIG.groups.map(g => ({ label: g.name, venues: CONFIG.venues.filter(v => v.group === g.name).map(v => v.name) }));
    return typeof scopes[prop] === 'function' ? scopes[prop].bind(scopes) : scopes[prop];
  },
});

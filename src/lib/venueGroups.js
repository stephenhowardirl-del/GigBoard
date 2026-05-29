export const VENUE_LOGOS = {
  'Dwyers':                     '/logos/dwyers.jpg',
  'Seventy Seven':              '/logos/seventyseven.jpg',
  'Seventy Seven (1st Floor)':  '/logos/seventyseven.jpg',
  'Seventy Seven (Stamp Room)': '/logos/stamproom.jpg',
  'Clancys Cork':               '/logos/clancys.png',
  'JJ Walsh':                   '/logos/jjs.png',
  'Sky Bar':                    '/logos/skybar.jpg',
  'The Wilton':                 '/logos/wilton.jpg',
  'Wedding':                    '/logos/wedding.jpeg',
  'Private Event':              '/logos/event.png',
  'The Wash':                   '/logos/thewash.jpg',
  'The Pav':                    '/logos/thepav.png',
  'The Dean':                   '/logos/thedean.png',
  'The Woodford':               null,
  'Mardyke':                    '/logos/mardyke.jpeg',
};

export const VENUE_GROUPS = {
  'Dwyers Group': {
    color: '#a080ff',
    bg: '#1a1040',
    venues: ['Dwyers', 'Seventy Seven', 'Seventy Seven (1st Floor)', 'Seventy Seven (Stamp Room)'],
  },
  'Clancys Group': {
    color: '#40a0ff',
    bg: '#001020',
    venues: ['Clancys Cork', 'JJ Walsh', 'Sky Bar', 'The Wilton'],
  },
  'Wedding & Events': {
    color: '#ff60c0',
    bg: '#1a0020',
    venues: ['Wedding', 'Private Event'],
  },
};

export const VENUE_COLORS = {
  'Dwyers':                     { color: '#a080ff', bg: '#1a1040', group: 'Dwyers Group' },
  'Seventy Seven':              { color: '#a080ff', bg: '#1a1040', group: 'Dwyers Group' },
  'Seventy Seven (1st Floor)':  { color: '#a080ff', bg: '#1a1040', group: 'Dwyers Group' },
  'Seventy Seven (Stamp Room)': { color: '#a080ff', bg: '#1a1040', group: 'Dwyers Group' },
  'Clancys Cork':               { color: '#40a0ff', bg: '#001020', group: 'Clancys Group' },
  'JJ Walsh':                   { color: '#40a0ff', bg: '#001020', group: 'Clancys Group' },
  'Sky Bar':                    { color: '#40a0ff', bg: '#001020', group: 'Clancys Group' },
  'The Wilton':                 { color: '#40a0ff', bg: '#001020', group: 'Clancys Group' },
  'Wedding':                    { color: '#ff60c0', bg: '#1a0020', group: 'Wedding & Events' },
  'Private Event':              { color: '#ff60c0', bg: '#1a0020', group: 'Wedding & Events' },
  'The Wash':                   { color: '#00d4aa', bg: '#001a1a', group: null },
  'The Pav':                    { color: '#ff9040', bg: '#1a0800', group: null },
  'The Dean':                   { color: '#ffbb00', bg: '#1a1000', group: null },
  'The Woodford':               { color: '#80d040', bg: '#0d1a00', group: null },
  'Mardyke':                    { color: '#ff4070', bg: '#1a0010', group: null },
};

export function getVenueColor(venue) {
  return VENUE_COLORS[venue] || { color: '#9090b0', bg: '#1a1a2e', group: null };
}

export function getVenueLogo(venue) {
  return VENUE_LOGOS[venue] || null;
}

export function getVenueGroup(venue) {
  return VENUE_COLORS[venue]?.group || null;
}

export const DEFAULT_VENUES = [
  'Clancys Cork', 'JJ Walsh', 'Sky Bar', 'The Wilton',
  'Dwyers', 'Seventy Seven', 'Seventy Seven (1st Floor)', 'Seventy Seven (Stamp Room)',
  'The Wash', 'The Pav', 'The Dean', 'The Woodford', 'Mardyke',
  'Wedding', 'Private Event',
];

export const VENUE_ADMIN_SCOPES = [
  { label: 'Dwyers Group', venues: ['Dwyers', 'Seventy Seven', 'Seventy Seven (1st Floor)', 'Seventy Seven (Stamp Room)'] },
  { label: 'Clancys Group', venues: ['Clancys Cork', 'JJ Walsh', 'Sky Bar', 'The Wilton'] },
  { label: 'The Wash', venues: ['The Wash'] },
  { label: 'The Pav', venues: ['The Pav'] },
  { label: 'The Dean', venues: ['The Dean'] },
  { label: 'The Woodford', venues: ['The Woodford'] },
  { label: 'Mardyke', venues: ['Mardyke'] },
  { label: 'Wedding & Events', venues: ['Wedding', 'Private Event'] },
];

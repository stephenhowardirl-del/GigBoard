// Full admin - Steve Howard
export const FULL_ADMIN_EMAIL = 'stephen.howardirl@gmail.com';

// Permission levels
export const ROLES = {
  FULL_ADMIN: 'full_admin',
  VENUE_ADMIN: 'venue_admin',
  DJ: 'dj',
};

// DJ roster - update emails once each DJ logs in the first time
export const INITIAL_ROSTER = [
  { name: 'Steve Howard',  initials: 'SH', color: '#00ffc2', bg: '#001a12' },
  { name: 'Aaron Kenny',   initials: 'AK', color: '#00d4aa', bg: '#001a1a' },
  { name: "Rory O'Broin",  initials: 'RO', color: '#a080ff', bg: '#1a1040' },
  { name: 'Sean Wallace',  initials: 'SW', color: '#40a0ff', bg: '#001020' },
  { name: 'Ryan Deasy',    initials: 'RD', color: '#ff60c0', bg: '#1a0020' },
  { name: 'Cian Drinan',   initials: 'CD', color: '#80d040', bg: '#0d1a00' },
];

export const DJ_COLORS = {
  'Aaron Kenny':   { color: '#00d4aa', bg: '#001a1a', tag: 'tag-a' },
  "Rory O'Broin":  { color: '#a080ff', bg: '#1a1040', tag: 'tag-b' },
  'Sean Wallace':  { color: '#40a0ff', bg: '#001020', tag: 'tag-c' },
  'Ryan Deasy':    { color: '#ff60c0', bg: '#1a0020', tag: 'tag-d' },
  'Cian Drinan':   { color: '#80d040', bg: '#0d1a00', tag: 'tag-e' },
};

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Init Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

function escapeICS(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(isoDate, time) {
  // Returns YYYYMMDDTHHMMSS
  const [y, m, d] = isoDate.split('-');
  const [h, min]  = (time || '00:00').split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function toICSDateEnd(isoDate, time) {
  // Assume gig is 3 hours
  const [y, m, d] = isoDate.split('-');
  const [h, min]  = (time || '00:00').split(':');
  const startH    = parseInt(h, 10);
  const endH      = (startH + 3) % 24;
  return `${y}${m}${d}T${String(endH).padStart(2,'0')}${min}00`;
}

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  try {
    const db = getFirestore();

    // Find DJ profile with this calendar token
    const profilesRef = db.collection('djProfiles');
    const snapshot    = await profilesRef.where('calendarToken', '==', token).limit(1).get();

    if (snapshot.empty) {
      res.status(404).send('Calendar not found');
      return;
    }

    const profile = snapshot.docs[0].data();
    const uid     = profile.uid;
    const djName  = profile.tradingName || profile.name || 'DJ';

    // Get all confirmed gigs for this DJ
    const gigsRef  = db.collection('gigs');
    const gigsSnap = await gigsRef
      .where('djUid', '==', uid)
      .where('status', '==', 'confirmed')
      .get();

    const gigs = gigsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Build ICS
    const now     = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://gig-board.vercel.app';

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GigBoard//DJ Schedule//EN',
      `X-WR-CALNAME:${escapeICS(djName)} — GigBoard`,
      'X-WR-CALDESC:Your confirmed gigs from GigBoard',
      'X-WR-TIMEZONE:Europe/Dublin',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      `X-PUBLISHED-TTL:PT1H`,
    ].join('\r\n');

    gigs.forEach(gig => {
      const dtStart = toICSDate(gig.date, gig.time);
      const dtEnd   = toICSDateEnd(gig.date, gig.time);
      const summary = escapeICS(`${gig.venue}`);
      const desc    = [
        gig.fee ? `Fee: €${gig.fee}` : '',
        gig.notes ? `Notes: ${gig.notes}` : '',
      ].filter(Boolean).join('\\n');

      ics += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:gigboard-${gig.id}@gigboard`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Europe/Dublin:${dtStart}`,
        `DTEND;TZID=Europe/Dublin:${dtEnd}`,
        `SUMMARY:${summary}`,
        desc ? `DESCRIPTION:${escapeICS(desc)}` : '',
        `LOCATION:${escapeICS(gig.venue)}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');
    });

    ics += '\r\nEND:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="gigboard-${uid}.ics"`);
    res.status(200).send(ics);

  } catch (err) {
    console.error('Calendar feed error:', err);
    res.status(500).send('Server error');
  }
}

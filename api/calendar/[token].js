function escapeICS(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(isoDate, time) {
  const [y, m, d] = isoDate.split('-');
  const [h, min]  = (time || '00:00').split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function toICSDateEnd(isoDate, time) {
  const [y, m, d] = isoDate.split('-');
  const [h, min]  = (time || '00:00').split(':');
  const endH      = (parseInt(h, 10) + 3) % 24;
  return `${y}${m}${d}T${String(endH).padStart(2,'0')}${min}00`;
}

async function firestoreQuery(projectId, apiKey, collectionId, filters) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const structuredQuery = {
    from: [{ collectionId }],
    where: filters.length === 1 ? {
      fieldFilter: {
        field: { fieldPath: filters[0].field },
        op: 'EQUAL',
        value: { stringValue: filters[0].value },
      }
    } : {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(f => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: 'EQUAL',
            value: { stringValue: f.value },
          }
        }))
      }
    }
  };

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ structuredQuery }),
  });

  const json = await res.json();
  return json
    .filter(r => r.document)
    .map(r => {
      const fields = r.document.fields || {};
      const out    = { id: r.document.name.split('/').pop() };
      for (const [k, v] of Object.entries(fields)) {
        out[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.doubleValue ?? null;
      }
      return out;
    });
}

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
  const apiKey    = process.env.REACT_APP_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    res.status(500).send('Missing Firebase config');
    return;
  }

  try {
    // Find DJ profile by token
    const profiles = await firestoreQuery(projectId, apiKey, 'djProfiles', [
      { field: 'calendarToken', value: token }
    ]);

    if (!profiles.length) {
      res.status(404).send('Calendar not found');
      return;
    }

    const profile = profiles[0];
    const uid     = profile.uid;
    const djName  = profile.tradingName || profile.name || 'DJ';

    // Get confirmed gigs for this DJ
    const gigs = await firestoreQuery(projectId, apiKey, 'gigs', [
      { field: 'djUid',  value: uid },
      { field: 'status', value: 'confirmed' },
    ]);

    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

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
      'X-PUBLISHED-TTL:PT1H',
    ].join('\r\n');

    gigs.forEach(gig => {
      if (!gig.date) return;
      const desc = [
        gig.fee   ? `Fee: €${gig.fee}`    : '',
        gig.notes ? `Notes: ${gig.notes}` : '',
      ].filter(Boolean).join('\\n');

      ics += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:gigboard-${gig.id}@gigboard`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Europe/Dublin:${toICSDate(gig.date, gig.time)}`,
        `DTEND;TZID=Europe/Dublin:${toICSDateEnd(gig.date, gig.time)}`,
        `SUMMARY:${escapeICS(gig.venue)}`,
        desc ? `DESCRIPTION:${desc}` : '',
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
    res.status(500).send('Server error: ' + err.message);
  }
}

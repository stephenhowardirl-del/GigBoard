const CLIENT_ID = '995051121551-c2e2n29bshogiot7m9i19t2s2kaagmko.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Request a fresh token and add the gig to calendar
export function addGigToCalendar(gig) {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }
        try {
          const eventId = await createCalendarEvent(tokenResponse.access_token, gig);
          resolve(eventId);
        } catch (e) {
          reject(e);
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function createCalendarEvent(accessToken, gig) {
  const timeParts = gig.time.split('–');
  const startTime = timeParts[0]?.trim() || '22:00';
  const endTime   = timeParts[1]?.trim() || '23:00';

  const startHour = parseInt(startTime.split(':')[0]);
  const endHour   = parseInt(endTime.split(':')[0]);
  const endDate   = endHour < startHour ? addOneDay(gig.date) : gig.date;

  const event = {
    summary: `🎧 GigBoard: ${gig.venue}`,
    description: gig.notes ? `Notes: ${gig.notes}\n\nBooked via GigBoard` : 'Booked via GigBoard',
    start: { dateTime: `${gig.date}T${startTime}:00`, timeZone: 'Europe/Dublin' },
    end:   { dateTime: `${endDate}T${endTime}:00`,   timeZone: 'Europe/Dublin' },
    colorId: '3',
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Calendar API error');
  }

  const created = await res.json();
  return created.id;
}

export async function removeGigFromCalendar(accessToken, calendarEventId) {
  if (!calendarEventId) return;
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

function addOneDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Google Calendar API helpers
// Uses the access token obtained during Google Sign-In

export async function addGigToCalendar(accessToken, gig) {
  const [startHour] = gig.time.split('–')[0].split(':').map(Number);
  const [endHour]   = (gig.time.split('–')[1] || '23:00').split(':').map(Number);

  // If end hour is less than start hour, the gig crosses midnight — add 1 day
  const startDate = gig.date;
  const endDate = endHour < startHour
    ? addOneDay(gig.date)
    : gig.date;

  const startTime = gig.time.split('–')[0].padStart(5, '0');
  const endTime   = (gig.time.split('–')[1] || '23:00').padStart(5, '0');

  const event = {
    summary: `🎧 GigBoard: ${gig.venue}`,
    description: gig.notes ? `Notes: ${gig.notes}\n\nBooked via GigBoard` : 'Booked via GigBoard',
    start: { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Europe/Dublin' },
    end:   { dateTime: `${endDate}T${endTime}:00`,   timeZone: 'Europe/Dublin' },
    colorId: '3', // Sage green
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
  return created.id; // calendar event ID to store in Firestore
}

export async function removeGigFromCalendar(accessToken, calendarEventId) {
  if (!calendarEventId) return;
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

function addOneDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

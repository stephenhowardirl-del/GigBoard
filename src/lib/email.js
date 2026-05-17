async function sendEmail(to, subject, html) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) console.error('Email error:', data.error);
    return data;
  } catch (e) {
    console.error('Email send failed:', e);
  }
}

export async function notifyGigAssigned({ djName, djEmail, venue, date, time, fee, notes }) {
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const subject = `New gig offer — ${venue}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0f; color: #e8e8f0; padding: 32px; border-radius: 12px;">
      <div style="font-family: monospace; font-size: 20px; font-weight: 500; color: #fff; margin-bottom: 24px;">
        GIG<span style="color: #00ffc2;">BOARD</span>
      </div>
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #fff;">Hey ${djName} — you have a new gig offer</h2>
      <p style="color: #9090b0; font-size: 14px; margin-bottom: 24px;">Log in to GigBoard to accept or reject it.</p>

      <div style="background: #13131f; border-radius: 10px; padding: 20px; margin-bottom: 24px; border: 1px solid #1e1e2e;">
        <div style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">${venue}</div>
        <div style="font-size: 14px; color: #9090b0; margin-bottom: 4px;">📅 ${formattedDate}</div>
        <div style="font-size: 14px; color: #9090b0; margin-bottom: ${fee ? '4px' : '0'};">🕙 ${time}</div>
        ${fee ? `<div style="font-size: 16px; font-weight: 700; color: #00ffc2; margin-top: 8px;">€${fee}</div>` : ''}
        ${notes ? `<div style="font-size: 13px; color: #6060a0; margin-top: 8px;">📌 ${notes}</div>` : ''}
      </div>

      <a href="https://gig-board.vercel.app" style="display: inline-block; background: #00ffc2; color: #0a0a0f; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        View in GigBoard →
      </a>

      <p style="color: #404060; font-size: 12px; margin-top: 24px;">You're receiving this because you're on the GigBoard roster.</p>
    </div>
  `;

  return sendEmail(djEmail, subject, html);
}

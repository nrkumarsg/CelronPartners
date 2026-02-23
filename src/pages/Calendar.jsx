import React from 'react';
import { Calendar as CalendarIcon, ExternalLink, Info } from 'lucide-react';

export default function Calendar() {
    // This URL uses 'primary' which automatically shows the calendar of the logged-in Google user.
    const calendarEmbedUrl = "https://calendar.google.com/calendar/embed?src=primary&ctz=Asia%2FSingapore";

    return (
        <div className="animate-fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="page-title">My Calendar</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                            View and manage your personal schedule synced with Google.
                        </p>
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => window.open('https://calendar.google.com', '_blank')}
                >
                    <ExternalLink size={18} />
                    Open Full Google Calendar
                </button>
            </div>

            <div className="glass-panel" style={{ flex: 1, padding: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    marginBottom: '12px',
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                }}>
                    <Info size={16} color="var(--accent)" />
                    <span>This view shows your primary Google Calendar. If you don't see your events, ensure you are logged into your Google account in this browser.</span>
                </div>

                <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <iframe
                        src={calendarEmbedUrl}
                        style={{ border: 0, width: '100%', height: '100%' }}
                        frameBorder="0"
                        scrolling="no"
                        title="Google Calendar"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Calendar as CalendarIcon, ExternalLink, Info } from 'lucide-react';
import { getDocumentSettings } from '../lib/store';

export default function Calendar() {
    const [settings, setSettings] = React.useState(null);

    React.useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await getDocumentSettings();
        if (data) setSettings(data);
    };

    // Use 'primary' if no specific calendar ID is provided in settings
    const calendarId = settings?.google_calendar_id || 'primary';
    const calendarEmbedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FSingapore`;

    const refreshIframe = () => {
        const iframe = document.getElementById('google-calendar-iframe');
        if (iframe) {
            iframe.src = iframe.src;
        }
    };

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
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={refreshIframe}
                        title="Refresh embedded view"
                    >
                        Refresh View
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => window.open('https://calendar.google.com', '_blank')}
                    >
                        <ExternalLink size={18} />
                        Open Full Google Calendar
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ flex: 1, padding: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    marginBottom: '12px',
                    padding: '12px 16px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    border: '1px solid rgba(59, 130, 246, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Info size={16} color="var(--accent)" />
                        <span>Sign into Google in the new tab, then come back and click <b>Refresh View</b> to see it here.</span>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '0.8rem', background: '#4285F4' }}
                        onClick={() => {
                            window.open('https://accounts.google.com/ServiceLogin?service=cl', '_blank');
                        }}
                    >
                        Login to Google
                    </button>
                </div>

                <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <iframe
                        id="google-calendar-iframe"
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

import React, { useState, useEffect } from 'react';
import { useVesselsStore } from '../../lib/vesselsStore';
import { useWorkLocationsStore } from '../../lib/workLocationsStore';
import { Ship, MapPin, Search, Layers, ExternalLink, Info, Navigation2, Pin, PinOff, Target, ChevronDown, Activity, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LiveLocator = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('vessels');
    const { vessels, fetchVessels } = useVesselsStore();
    const { workLocations, fetchWorkLocations } = useWorkLocationsStore();

    const [selectedVessel, setSelectedVessel] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isPanelPinned, setIsPanelPinned] = useState(() => {
        const saved = localStorage.getItem('locator-panel-pinned');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('locator-panel-pinned', JSON.stringify(isPanelPinned));
    }, [isPanelPinned]);

    useEffect(() => {
        fetchVessels();
        fetchWorkLocations();
    }, [fetchVessels, fetchWorkLocations]);

    const getVesselMapUrl = () => {
        if (!selectedVessel) return null;
        const trackingId = selectedVessel.mmsi || selectedVessel.imo_number;
        const trackingType = selectedVessel.mmsi ? 'mmsi' : 'imo';
        if (!trackingId) return null;
        return `https://www.marinetraffic.com/en/ais/embed/zoom:10/centery:0/centerx:0/${trackingType}:${trackingId}/shownames:true/clusters:false/showmenu:true/remember:false/maptype:0`;
    };

    const getLocationMapUrl = () => {
        if (!selectedLocation) return null;
        const query = `${selectedLocation.location_name} ${selectedLocation.pincode || ''}`.trim();
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: '16px' }}>
            {/* Header with quick selector */}
            <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#4f46e5', color: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 className="page-title" style={{ margin: 0 }}>Live Locator</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Global AIS Fleet Tracking & Branch Monitoring</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
                    <button
                        onClick={() => setActiveTab('vessels')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'vessels' ? 'white' : 'transparent',
                            color: activeTab === 'vessels' ? '#4f46e5' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: activeTab === 'vessels' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Ship size={16} /> Vessels
                    </button>
                    <button
                        onClick={() => setActiveTab('locations')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'locations' ? 'white' : 'transparent',
                            color: activeTab === 'locations' ? '#4f46e5' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: activeTab === 'locations' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <MapPin size={16} /> Locations
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
                {/* Control Panel */}
                <div className="glass-panel" style={{
                    width: isPanelPinned ? '320px' : '0',
                    padding: isPanelPinned ? '24px' : '0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    borderRight: isPanelPinned ? '1px solid var(--border-color)' : 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                                {activeTab === 'vessels' ? 'Live Fleet' : 'Project Sites'}
                            </h3>
                            {activeTab === 'vessels' && (
                                <button
                                    onClick={() => navigate('/vessels/new')}
                                    style={{
                                        background: '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                                    }}
                                    title="Add New Vessel"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                        <button onClick={() => setIsPanelPinned(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}><PinOff size={16} /></button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                        {activeTab === 'vessels' ? (
                            vessels.length > 0 ? vessels.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVessel(v)}
                                    style={{
                                        padding: '14px',
                                        textAlign: 'left',
                                        background: selectedVessel?.id === v.id ? '#f5f7ff' : '#fff',
                                        border: `1px solid ${selectedVessel?.id === v.id ? '#4f46e5' : '#f1f5f9'}`,
                                        borderRadius: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        boxShadow: selectedVessel?.id === v.id ? '0 4px 6px -1px rgba(79, 70, 229, 0.1)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        padding: '10px',
                                        background: selectedVessel?.id === v.id ? '#4f46e5' : '#f8fafc',
                                        color: selectedVessel?.id === v.id ? 'white' : '#64748b',
                                        borderRadius: '10px'
                                    }}>
                                        <Ship size={16} />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedVessel?.id === v.id ? '#1e1b4b' : '#334155' }}>
                                            {v.vessel_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Activity size={10} /> {v.mmsi || 'No AIS'}
                                        </div>
                                    </div>
                                </button>
                            )) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading fleet...</div>
                        ) : (
                            workLocations.length > 0 ? workLocations.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelectedLocation(l)}
                                    style={{
                                        padding: '14px',
                                        textAlign: 'left',
                                        background: selectedLocation?.id === l.id ? '#fffbeb' : '#fff',
                                        border: `1px solid ${selectedLocation?.id === l.id ? '#f59e0b' : '#f1f5f9'}`,
                                        borderRadius: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        boxShadow: selectedLocation?.id === l.id ? '0 4px 6px -1px rgba(245, 158, 11, 0.1)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        padding: '10px',
                                        background: selectedLocation?.id === l.id ? '#f59e0b' : '#f8fafc',
                                        color: selectedLocation?.id === l.id ? 'white' : '#64748b',
                                        borderRadius: '10px'
                                    }}>
                                        <MapPin size={16} />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedLocation?.id === l.id ? '#92400e' : '#334155' }}>
                                            {l.location_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{l.pincode || 'Generic'}</div>
                                    </div>
                                </button>
                            )) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading sites...</div>
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                    background: '#f8fafc'
                }}>
                    {!isPanelPinned && (
                        <button
                            onClick={() => setIsPanelPinned(true)}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                left: '24px',
                                zIndex: 10,
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                padding: '12px 20px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#475569',
                                animation: 'slideInLeft 0.3s ease-out'
                            }}
                        >
                            <Pin size={16} color="#4f46e5" /> Open Asset View
                        </button>
                    )}

                    {activeTab === 'vessels' ? (
                        selectedVessel ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                <iframe
                                    src={getVesselMapUrl()}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    title="Vessel Radar"
                                    style={{ background: '#edf2f7' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '24px',
                                    left: '24px',
                                    right: '24px',
                                    background: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '24px',
                                    borderRadius: '20px',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                    animation: 'slideUp 0.4s ease-out'
                                }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{ background: '#4f46e5', color: 'white', padding: '12px', borderRadius: '14px' }}>
                                            <Ship size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{selectedVessel.vessel_name}</h4>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>IMO: <b>{selectedVessel.imo_number || 'N/A'}</b></span>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>MMSI: <b>{selectedVessel.mmsi || 'N/A'}</b></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => window.open(`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${selectedVessel.mmsi}`, '_blank')} className="btn btn-outline" style={{ gap: '8px' }}>
                                            <Info size={16} /> MT Profile
                                        </button>
                                        <a href={`/vessel-tracking/${selectedVessel.id}`} className="btn btn-primary" style={{ gap: '8px' }}>
                                            <Target size={16} /> Real-Time View
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', textAlign: 'center' }}>
                                <div style={{ padding: '40px', background: 'white', borderRadius: '50%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', marginBottom: '32px', animation: 'pulse 3s infinite' }}>
                                    <Ship size={80} strokeWidth={1} color="#4f46e5" style={{ opacity: 0.8 }} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Fleet Radar Active</h3>
                                <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: '12px', color: '#64748b', lineHeight: 1.6 }}>
                                    Select a vessel from the left panel to initialize high-precision AIS tracking through the Global MarineTraffic network.
                                </p>
                            </div>
                        )
                    ) : (
                        selectedLocation ? (
                            <div style={{ width: '100%', height: '100%' }}>
                                <iframe
                                    src={getLocationMapUrl()}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    title="Location Site"
                                    style={{ filter: 'grayscale(0.1) contrast(1.1)' }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', textAlign: 'center' }}>
                                <div style={{ padding: '40px', background: 'white', borderRadius: '50%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
                                    <MapPin size={80} strokeWidth={1} color="#f59e0b" style={{ opacity: 0.8 }} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Branch Network Map</h3>
                                <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: '12px', color: '#64748b', lineHeight: 1.6 }}>
                                    Click on any work location or project site to view pinpoint geographic data and branch specifics.
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveLocator;

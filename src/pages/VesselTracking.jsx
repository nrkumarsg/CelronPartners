import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVesselsStore } from '../lib/vesselsStore';
import { Ship, ArrowLeft, MapPin, ExternalLink, Info, Layers, Anchor, Shield, LifeBuoy, Eye, EyeOff } from 'lucide-react';

const VesselTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { vessels, fetchVessels } = useVesselsStore();
    const [vessel, setVessel] = useState(null);
    
    // Advanced Map Settings
    const [mapSettings, setMapSettings] = useState({
        shownames: true,
        clusters: false,
        maptype: 0, // 0: Standard, 1: Satellite
        showFleet: false
    });

    useEffect(() => {
        if (vessels.length === 0) {
            fetchVessels();
        }
    }, [vessels.length, fetchVessels]);

    useEffect(() => {
        const found = vessels.find(v => v.id === id);
        if (found) {
            setVessel(found);
        }
    }, [id, vessels]);

    if (!vessel) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading vessel location data...</p>
            </div>
        );
    }

    const trackingId = vessel.mmsi || vessel.imo_number;
    const trackingType = vessel.mmsi ? 'mmsi' : 'imo';

    // Enhanced MarineTraffic URL with Settings
    const marineTrafficUrl = `https://www.marinetraffic.com/en/ais/embed/zoom:10/centery:0/centerx:0/${trackingType}:${trackingId}/shownames:${mapSettings.shownames}/clusters:${mapSettings.clusters}/showmenu:true/remember:false/maptype:${mapSettings.maptype}`;

    const toggleSetting = (key) => {
        setMapSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const setMapType = (type) => {
        setMapSettings(prev => ({ ...prev, maptype: type }));
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '16px' }}>
            {/* Professional Header */}
            <div className="page-header" style={{ marginBottom: 0, paddingBottom: '8px' }}>
                <div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/vessels')}
                        style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                        <ArrowLeft size={16} />
                        Back to Directory
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
                            color: 'white', 
                            padding: '12px', 
                            borderRadius: '14px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}>
                            <Ship size={28} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 className="page-title" style={{ margin: 0 }}>{vessel.vessel_name}</h2>
                                <span style={{ 
                                    background: '#dcfce7', 
                                    color: '#15803d', 
                                    padding: '2px 8px', 
                                    borderRadius: '99px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700 
                                }}>LIVE</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                <span><span style={{ fontWeight: 600 }}>IMO:</span> {vessel.imo_number || 'N/A'}</span>
                                <span style={{ color: '#e2e8f0' }}>|</span>
                                <span><span style={{ fontWeight: 600 }}>MMSI:</span> {vessel.mmsi || 'N/A'}</span>
                                <span style={{ color: '#e2e8f0' }}>|</span>
                                <span><span style={{ fontWeight: 600 }}>Type:</span> {vessel.vessel_type || 'Unknown'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', marginBottom: 0 }}>
                        <button 
                            className={`btn ${mapSettings.maptype === 0 ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMapType(0)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            <Layers size={14} /> Standard
                        </button>
                        <button 
                            className={`btn ${mapSettings.maptype === 1 ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMapType(1)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            <Layers size={14} /> Satellite
                        </button>
                    </div>
                    
                    <a 
                        href={`https://www.marinetraffic.com/en/ais/details/ships/${trackingType}:${trackingId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ background: 'white', border: '1px solid var(--border-color)' }}
                    >
                        <ExternalLink size={18} />
                        Full MT Profile
                    </a>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
                {/* Main Map Container */}
                <div className="glass-panel" style={{ flex: 3, padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {!trackingId ? (
                        <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '50%' }}>
                                <Info size={64} color="#94a3b8" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Missing Tracking Information</h3>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.6 }}>
                                    Live tracking requires an MMSI or IMO number. Please update this vessel's record in the directory to enable global AIS tracking.
                                </p>
                            </div>
                            <button className="btn btn-primary" onClick={() => navigate(`/vessels/${vessel.id}`)}>
                                Edit Vessel Profile
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ 
                                padding: '10px 20px', 
                                background: '#f8fafc', 
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    <LifeBuoy size={14} />
                                    AIS Real-Time Monitoring
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <button 
                                        onClick={() => toggleSetting('shownames')}
                                        style={{ background: 'none', border: 'none', color: mapSettings.shownames ? 'var(--accent)' : '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                    >
                                        {mapSettings.shownames ? <Eye size={14} /> : <EyeOff size={14} />} 
                                        Vessel Names
                                    </button>
                                    <button 
                                        onClick={() => toggleSetting('clusters')}
                                        style={{ background: 'none', border: 'none', color: mapSettings.clusters ? 'var(--accent)' : '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                    >
                                        <Layers size={14} /> 
                                        Clusters
                                    </button>
                                </div>
                            </div>
                            <iframe
                                name="marinetraffic"
                                id="marinetraffic"
                                width="100%"
                                height="100%"
                                scrolling="no"
                                frameBorder="0"
                                src={marineTrafficUrl}
                                style={{ border: 'none', background: '#edf2f7' }}
                                title={`${vessel.vessel_name} tracking container`}
                            />
                        </>
                    )}
                </div>

                {/* Tracking Sidebar: Details & Safe Havens */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', minWidth: '300px' }}>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Info size={18} color="var(--accent)" />
                            Vessel Snapshot
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>Management</label>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{vessel.vessel_management || 'Not Specified'}</p>
                            </div>
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>Registered Owner</label>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{vessel.vessel_owner || 'Not Specified'}</p>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Vessel Remarks</h4>
                            </div>
                            <div 
                                style={{ 
                                    fontSize: '0.85rem', 
                                    color: 'var(--text-secondary)', 
                                    maxHeight: '120px', 
                                    overflowY: 'auto',
                                    lineHeight: 1.5 
                                }}
                                dangerouslySetInnerHTML={{ __html: vessel.other_details || 'No additional details provided.' }}
                            />
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                            <Shield size={18} />
                            Global Safe Havens
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '16px' }}>
                            Reference guide for nearby emergency ports and safe monitoring stations.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { name: "Singapore (Port Authority)", region: "Southeast Asia", status: "Active" },
                                { name: "Rotterdam (Europort)", region: "North Europe", status: "Active" },
                                { name: "Port Said (Suez Canal)", region: "Middle East", status: "Active" }
                            ].map((haven, i) => (
                                <div key={i} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    padding: '10px', 
                                    background: 'white', 
                                    borderRadius: '8px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <Anchor size={16} color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{haven.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{haven.region}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button style={{ 
                            width: '100%', 
                            marginTop: '16px', 
                            background: '#f1f5f9', 
                            border: 'none', 
                            padding: '8px', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer'
                        }}>
                           View All Safe Havens
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VesselTracking;

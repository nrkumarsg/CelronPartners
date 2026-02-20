import React, { useState, useEffect } from 'react';
import { FileText, Download, Users, Ship, BookOpen } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { getPartners, getContacts } from '../lib/store';
import { useVesselsStore } from '../lib/vesselsStore';

export default function Reports() {
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState([]);
    const [contacts, setContacts] = useState([]);
    const { vessels, fetchVessels } = useVesselsStore();

    useEffect(() => {
        const loadAllData = async () => {
            const p = await getPartners();
            const c = await getContacts();
            setPartners(p);
            setContacts(c);
            fetchVessels();
        };
        loadAllData();
    }, [fetchVessels]);

    const generatePartnersPDF = () => {
        setLoading(true);

        const element = document.createElement('div');
        element.innerHTML = `
            <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b;">
                <h1 style="color: #0d1b2a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Partners Roster</h1>
                <p style="color: #64748b; font-size: 14px;">Total Partners: ${partners.length}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f8fafc; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Name</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Type</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Email</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Country</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partners.map(p => `
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;"><b>${p.name}</b></td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${p.types?.join(', ') || '-'}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${p.email1 || '-'}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${p.country || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const opt = {
            margin: 0,
            filename: 'partners_roster.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => setLoading(false));
    };

    const generateVesselsPDF = () => {
        setLoading(true);

        const element = document.createElement('div');
        element.innerHTML = `
            <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b;">
                <h1 style="color: #0d1b2a; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">Vessels Fleet List</h1>
                <p style="color: #64748b; font-size: 14px;">Total Vessels: ${vessels.length}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f8fafc; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Vessel Name</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">IMO Number</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Type</th>
                            <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px;">Manager / Owner</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vessels.map(v => `
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;"><b>${v.vessel_name}</b></td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${v.imo_number || '-'}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${v.vessel_type || '-'}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                                    ${v.vessel_management || '-'}<br/>
                                    <span style="color: #64748b; font-size: 11px;">M: ${v.vessel_owner || '-'}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const opt = {
            margin: 0,
            filename: 'vessels_fleet_list.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => setLoading(false));
    };

    const generateSystemSummaryPDF = () => {
        setLoading(true);
        const date = new Date().toLocaleDateString();

        const element = document.createElement('div');
        element.innerHTML = `
            <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="color: #0d1b2a; margin: 0;">Cel-Ron Module Summary</h1>
                    <p style="color: #64748b; margin-top: 5px;">Generated on: ${date}</p>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e2e8f0;">
                        <h2 style="margin: 0; color: #3b82f6;">${partners.length}</h2>
                        <div style="font-size: 14px; color: #64748b; margin-top: 5px;">Total Partners</div>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e2e8f0;">
                        <h2 style="margin: 0; color: #10b981;">${contacts.length}</h2>
                        <div style="font-size: 14px; color: #64748b; margin-top: 5px;">Total Contacts</div>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e2e8f0;">
                        <h2 style="margin: 0; color: #8b5cf6;">${vessels.length}</h2>
                        <div style="font-size: 14px; color: #64748b; margin-top: 5px;">Total Vessels</div>
                    </div>
                </div>

                <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Recent Partners</h3>
                <ul style="font-size: 13px;">
                    ${partners.slice(0, 10).map(p => `<li><b>${p.name}</b> (${p.country || 'N/A'}) - ${p.types?.join(', ') || 'General'}</li>`).join('')}
                    ${partners.length > 10 ? `<li style="color:#64748b; list-style:none; margin-top:5px;">...and ${partners.length - 10} more.</li>` : ''}
                </ul>

                <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px;">Recent Vessels</h3>
                 <ul style="font-size: 13px;">
                    ${vessels.slice(0, 10).map(v => `<li><b>${v.vessel_name}</b> (IMO: ${v.imo_number || 'N/A'})</li>`).join('')}
                    ${vessels.length > 10 ? `<li style="color:#64748b; list-style:none; margin-top:5px;">...and ${vessels.length - 10} more.</li>` : ''}
                </ul>
            </div>
        `;

        const opt = {
            margin: 0,
            filename: 'system_summary.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => setLoading(false));
    }


    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                        <FileText size={28} />
                    </div>
                    <h2 className="page-title">Reports & Analysis</h2>
                </div>
            </div>

            <div className="form-grid">

                {/* PDF Report: System Summary */}
                <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <BookOpen size={24} color="#3b82f6" />
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>System Summary Report</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                            A high-level executive PDF outlining gross metrics across Partners, Contacts, and Vessels.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={generateSystemSummaryPDF} disabled={loading}>
                        <Download size={18} />
                        {loading ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>

                {/* PDF Report: Partners Roster */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Users size={24} color="#10b981" />
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Partners Roster</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        Generates a styled A4 document detailing all registered Partners, types, and primary contact emails.
                    </p>
                    <button className="btn btn-secondary" onClick={generatePartnersPDF} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                        <Download size={18} />
                        Export Roster (PDF)
                    </button>
                </div>

                {/* PDF Report: Vessels Fleet List */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Ship size={24} color="#8b5cf6" />
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Vessels Fleet List</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        Generates a landscape document listing the entire fleet, IMO numbers, and connected management.
                    </p>
                    <button className="btn btn-secondary" onClick={generateVesselsPDF} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                        <Download size={18} />
                        Export Fleet (PDF)
                    </button>
                </div>

            </div>
        </div>
    );
}

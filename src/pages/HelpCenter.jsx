import React, { useState } from 'react';
import { Book, Search, FileText, HardDrive, BadgeDollarSign, Wrench, ShieldCheck, ChevronRight, PlayCircle, ExternalLink, Settings, Library, TrendingUp, QrCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { APP_MANUAL_CONTENT } from '../lib/appManual';

export default function HelpCenter() {
    const [activeSection, setActiveSection] = useState('getting-started');

    const sections = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            icon: <PlayCircle size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Welcome to CelronHub</h2>
                    <p>CelronHub is your unified platform for maritime operations, sourcing, and financial tracking. This manual is designed to help you "Read and Practice" the new automated workflows.</p>

                    <div className="info-card" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
                        <h4 style={{ color: '#1d4ed8', margin: '0 0 10px 0' }}>💡 Pro Navigation Tip</h4>
                        <p style={{ color: '#1e40af', margin: 0, fontSize: '0.9rem' }}>
                            Think of the <strong>Job Portal</strong> as your Command Center and <strong>Google Drive</strong> as your Filing Cabinet. The system automates the bridge between them.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'manual',
            title: 'Full App Manual',
            icon: <FileText size={20} />,
            content: (
                <div className="help-content-section md-content" style={{ paddingRight: '20px' }}>
                    <div className="info-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>CelronHub Operations Manual</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Complete guide to the entire workflow system.</p>
                        </div>
                    </div>
                    <div style={{ lineHeight: '1.6', color: '#334155' }}>
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 style={{ fontSize: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: 0 }} {...props} />,
                                h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginTop: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }} {...props} />,
                                h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.2rem', color: '#334155', marginTop: '20px' }} {...props} />,
                                p: ({ node, ...props }) => <p style={{ marginBottom: '16px' }} {...props} />,
                                ul: ({ node, ...props }) => <ul style={{ marginBottom: '16px', paddingLeft: '24px' }} {...props} />,
                                li: ({ node, ...props }) => <li style={{ marginBottom: '8px' }} {...props} />,
                                hr: ({ node, ...props }) => <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} {...props} />
                            }}
                        >
                            {APP_MANUAL_CONTENT}
                        </ReactMarkdown>
                    </div>
                </div>
            )
        },
        {
            id: 'sourcing',
            title: '1. Sourcing & Finder',
            icon: <Search size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Universal Finder & Sourcing</h2>
                    <p>Find any part or supplier using our AI-powered discovery tools.</p>

                    <h3>Advanced Technical Tips</h3>
                    <p>If you see a "Navigator LockManager lock timeout" or counts show "0" despite having data:</p>
                    <ul>
                        <li><strong>Refresh the Tab</strong>: This usually resolves internal browser lock conflicts.</li>
                        <li><strong>Check Connection</strong>: Slow networks can delay your profile synchronization. We've increased timeouts to 15s to help.</li>
                        <li><strong>Clear Site Data</strong>: In rare cases, clearing browser storage for the app resolves persistent auth sync issues.</li>
                    </ul>

                    <div className="step-list">
                        <div className="step-item">
                            <div className="step-badge">AI</div>
                            <div>
                                <h4>PartFinder AI</h4>
                                <p>Describe a part or upload a photo. The AI identifies the specifications and suggests reliable vendors from your database.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-badge">Web</div>
                            <div>
                                <h4>Supplier Search</h4>
                                <p>Access live web results for global suppliers. Filter by Brand, Country, or Category to find the right partner instantly.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-badge">Ext</div>
                            <div>
                                <h4>Global Finder</h4>
                                <p>Integrated access to external tracking and manufacturer sites like Omron or Base44. Use "Open in New Tab" if a site restricts iframe loading.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'lifecycle',
            title: '2. Document Lifecycle',
            icon: <Library size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Integrated Document Lifecycle</h2>
                    <p>Experience "Zero-Upload" document management with automated Google Drive integration.</p>

                    <h3>Phase A: Automated Folder Creation</h3>
                    <p>When you create a <strong>Customer Enquiry</strong>, the system builds this structure in Drive automatically:</p>
                    <div className="folder-tree" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '20px' }}>
                        <div>📁 [Year] / [Job No] - [Client] - [Vessel]</div>
                        <div style={{ marginLeft: '20px' }}>├── 📁 1. Customer_Request_&_Offer</div>
                        <div style={{ marginLeft: '20px' }}>├── 📁 2. Supplier_Quotes_&_PO (and Bills)</div>
                        <div style={{ marginLeft: '20px' }}>├── 📁 3. Operation_DO_SR_&_Certificates</div>
                        <div style={{ marginLeft: '20px' }}>└── 📁 4. Finance_Invoices_&_Payments</div>
                    </div>

                    <h3>Phase B: One-Click Recording & Smart Emailing</h3>
                    <p>In the <strong>Job Portal</strong> or <strong>Quotation Editor</strong>, use the Send Email buttons. The system now:</p>
                    <ul>
                        <li><strong>Itemizes Content</strong>: Automatically builds a clear summary of your quotation items in the email body.</li>
                        <li><strong>Professional Footer</strong>: Attaches your standard company details (Address, Tel, Email) automatically.</li>
                        <li><strong>Auto-Attach</strong>: Generates the PDF and attaches it without you needing to download/upload anything.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'finance',
            title: '3. Profit Finder',
            icon: <BadgeDollarSign size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Financial Profit Finder</h2>
                    <p>Real-time margin tracking to ensure every job is profitable.</p>

                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                        <div className="glass-panel" style={{ padding: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Job Costing</h4>
                            <p style={{ fontSize: '0.85rem' }}>Add supplier bills directly to a job. Uploading a scan autosaves it to Drive Folder #2.</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Profit Dashboard</h4>
                            <p style={{ fontSize: '0.85rem' }}>View the global summary on the <strong>Reports</strong> page to see Order Value vs. Costs across the whole company.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'qr-barcode',
            title: '4. QR & Barcode',
            icon: <QrCode size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>QR & Barcode Operations</h2>
                    <p>Streamline your inventory management with mobile scanning and professional label printing.</p>

                    <div className="step-list">
                        <div className="step-item">
                            <div className="step-badge">1</div>
                            <div>
                                <h4>Setup Barcodes</h4>
                                <p>Go to your Catalog and edit any item. You can type in a barcode or use the <strong>Camera Icon</strong> to scan an existing label. The system will save this unique SKU for future searches.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-badge">2</div>
                            <div>
                                <h4>Multi-Column Printing</h4>
                                <p>Use the <strong>Print QR Labels</strong> sidebar link. Select your items and enter the quantity (e.g., 10 labels for 10 units in stock). Our system automatically formats these into an <strong>A4-optimized 3-column layout</strong> to save paper.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-badge">3</div>
                            <div>
                                <h4>Mobile Camera Search</h4>
                                <p>On your mobile phone, click the <strong>Scan</strong> button in the Catalog. Point your camera at a part's QR code to instantly find its price, stock level, and technical details without typing.</p>
                            </div>
                        </div>
                    </div>

                    <div className="info-card" style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '15px', borderRadius: '12px', marginTop: '30px' }}>
                        <h4 style={{ color: '#047857', margin: '0 0 8px 0' }}>💡 Pro Tip: Paper Savings</h4>
                        <p style={{ color: '#065f46', margin: 0, fontSize: '0.9rem' }}>
                            When printing, choose "Fit to Page" in your printer settings to ensure all 3 columns of labels align perfectly with your sticker sheets.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'vault',
            title: '5. Storage & Vault',
            icon: <HardDrive size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Storage & Corporate Vault</h2>
                    <p>Managing active projects vs. permanent company records.</p>

                    <div className="help-card">
                        <h4>Archive to Vault</h4>
                        <p>When a job is closed, click "Archive to Vault". The system moves the physical folder in Google Drive to the long-term archive.</p>
                    </div>

                    <div className="help-card">
                        <h4>Standards & Stationery</h4>
                        <p>Quick-access button in the <strong>Corporate Vault</strong> header provides instant access to Company Logos, Letterheads, and Templates.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'support',
            title: 'Troubleshooting',
            icon: <Wrench size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Support & Connectivity</h2>
                    <p>Common solutions for system connectivity.</p>

                    <div className="step-list">
                        <div className="step-item">
                            <Settings size={20} color="#64748b" />
                            <div>
                                <h4>Google Drive Token Expired</h4>
                                <p>If you see a "403" error when saving files, go to <strong>Settings → Connect Google</strong> to refresh your login.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <Library size={20} color="#64748b" />
                            <div>
                                <h4>Missing Folders in Existing Jobs</h4>
                                <p>For jobs created before these updates, run the "add_job_folder_column" SQL script in your Supabase editor.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'policy',
            title: '5. Manual Update Policy',
            icon: <ShieldCheck size={20} />,
            content: (
                <div className="help-content-section">
                    <h2>Manual Update Policy</h2>
                    <p>CelronHub is a living platform. To ensure you and your team are always using the latest features:</p>

                    <div className="step-list">
                        <div className="step-item">
                            <TrendingUp size={20} color="#10b981" />
                            <div>
                                <h4>Continuous Updates</h4>
                                <p>Every time a new feature, button, or logic update is added to the system, this manual and the <strong>Help Center</strong> are updated simultaneously.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <BadgeDollarSign size={20} color="#3b82f6" />
                            <div>
                                <h4>Check the Footer</h4>
                                <p>Always check the footer of this manual for the latest version date to ensure you are viewing the most recent instructions.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="help-center-wrapper animate-fade-in" style={{ display: 'flex', gap: '30px', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 180px)' }}>
            {/* Left Nav */}
            <div className="help-sidebar" style={{ width: '280px', flexShrink: 0 }}>
                <div className="glass-panel" style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Book size={20} color="var(--accent)" /> Help File
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>v1.4 Updated March 2026</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`help-nav-btn ${activeSection === section.id ? 'active' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 15px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    background: activeSection === section.id ? 'var(--accent)' : 'transparent',
                                    color: activeSection === section.id ? 'white' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.9rem',
                                    fontWeight: activeSection === section.id ? 600 : 400,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {section.icon}
                                {section.title}
                                {activeSection === section.id && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', marginTop: 'auto' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Technical Support</p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>CEL-RON Enterprise Admin Portal</p>
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="help-main-content glass-panel" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {sections.find(s => s.id === activeSection)?.content}

                <div style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Confirm you have read and understood these updates?
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a href="/" className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>
                            <ExternalLink size={14} /> Practice Now
                        </a>
                    </div>
                </div>
            </div>

            <style>{`
                .help-nav-btn:hover:not(.active) {
                    background: #f1f5f9 !important;
                }
                .help-content-section h2 {
                    margin-top: 0;
                    font-size: 2rem;
                    color: #0d1b2a;
                    margin-bottom: 24px;
                }
                .help-content-section p {
                    line-height: 1.6;
                    color: #475569;
                    font-size: 1.05rem;
                }
                .step-list {
                    margin-top: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .step-item {
                    display: flex;
                    gap: 20px;
                    padding: 20px;
                    border-radius: 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                }
                .step-badge {
                    background: #1e293b;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    height: fit-content;
                }
                .step-item h4 {
                    margin: 0 0 5px 0;
                    font-size: 1.1rem;
                }
                .step-item p {
                    margin: 0;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                .help-card {
                    margin-top: 20px;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .help-card h4 {
                    margin: 0 0 8px 0;
                    color: #0d1b2a;
                }
                .help-card p {
                    margin: 0;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
}

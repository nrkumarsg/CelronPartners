import React from 'react';
import { Mail, Phone, Globe } from 'lucide-react';

/**
 * Unified Layout for all Workflow Documents (Quotation, Invoice, DO, etc.)
 * This component is used for:
 * 1. Screen Preview / Print Page
 * 2. Background PDF generation for emails
 */
const WorkflowDocumentLayout = ({ doc, settings, logoBase64, signatureBase64, paynowBase64 }) => {
    if (!doc) return null;

    const companyLogo = settings?.logo_url || 'https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif';
    const companyName = (settings?.company_name || 'CEL-RON ENTERPRISES PTE LTD').replace('CELRON', 'CEL-RON');
    const companyAddress = settings?.address || '10, Jln Besar, #03-05, Singapore 208787';
    const companyUen = settings?.gst_uen || '201436227C';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-';

    return (
        <div className="print-paper" style={{
            background: '#fff',
            width: '100%',
            maxWidth: '210mm',
            minHeight: '280mm', // Slightly less than A4 to allow for margins in PDF
            margin: '0 auto',
            position: 'relative',
            boxSizing: 'border-box',
            color: '#1e293b',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Company Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center' }}>
                    <img
                        src={logoBase64 || companyLogo}
                        alt="Logo"
                        crossOrigin="anonymous"
                        style={{ maxHeight: '100px', maxWidth: '300px', objectFit: 'contain', objectPosition: 'left' }}
                    />
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        <span style={{ color: '#ef4444' }}>{companyName.split(' ')[0]}</span> <span style={{ color: '#000000' }}>{companyName.split(' ').slice(1).join(' ')}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: 600, marginTop: '4px' }}>
                        UEN NO. {companyUen}
                    </div>
                    <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.5', marginTop: '4px' }}>
                        {companyAddress}<br />
                        Phone: {settings?.phone || '+65 8196 2270'}<br />
                        Email: {settings?.sales_email || 'sales@celron.net'}<br />
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <Globe size={10} /> {settings?.website || 'www.celron.net'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Document Title Banner */}
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <h1 style={{ 
                    margin: 0, 
                    fontSize: '26px', 
                    color: '#1e3a8a', 
                    fontWeight: 800, 
                    letterSpacing: '1px', 
                    textTransform: 'uppercase',
                    borderBottom: '4px double #1e3a8a',
                    display: 'inline-block',
                    padding: '0 20px 5px'
                }}>
                    {doc.document_type}
                </h1>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '8px', color: '#1e293b' }}>
                    No: {doc.document_no}
                </div>
            </div>

            {/* Recipient & Metadata Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Recipient Info</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>{doc.partners?.name || 'Walk-in Customer'}</div>
                    <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', minHeight: '40px' }}>{doc.partners?.address || ''}</div>
                    
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>Attn:</span> {doc.partners?.contact_person || doc.contact_person || 'N/A'}
                        </div>
                        {doc.partners?.registration_no && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>GST/Reg No: {doc.partners.registration_no}</div>
                        )}
                    </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 700, width: '40%' }}>Date</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatDate(doc.issue_date)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 700 }}>Due/Expiry</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatDate(doc.expiry_date)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 700 }}>Reference</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{doc.customer_ref || '-'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 700 }}>Vessel</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{doc.vessels?.vessel_name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 700 }}>Salesperson</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{(doc.salesperson_name || 'N/A').toUpperCase()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Subject Line */}
            {doc.subject && (
                <div style={{ marginBottom: '20px', padding: '10px 15px', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', marginRight: '10px' }}>Subject:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>{doc.subject}</span>
                </div>
            )}

            {/* Items Table */}
            <div style={{ flex: 1, marginBottom: '30px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#0f172a', color: '#fff' }}>
                            <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '12px', fontWeight: 700, width: '55%' }}>DESCRIPTION</th>
                            <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '15%' }}>QTY</th>
                            {!(doc.document_type === 'Delivery Order' || doc.document_type === 'Packing List') && (
                                <>
                                    <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '12px', fontWeight: 700, width: '15%' }}>UNIT PRICE</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '12px', fontWeight: 700, width: '15%' }}>AMOUNT ({doc.currency || 'SGD'})</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {(doc.items || []).map((item, idx) => {
                            const isLast = idx === (doc.items.length - 1);
                            const borderStyle = isLast ? '2px solid #0f172a' : '1px solid #e2e8f0';

                            if (item.is_section) {
                                return (
                                    <tr key={idx} style={{ background: '#f1f5f9' }}>
                                        <td colSpan={!(doc.document_type === 'Delivery Order' || doc.document_type === 'Packing List') ? 4 : 2} style={{ padding: '10px 15px', fontSize: '12px', fontWeight: 800, color: '#1e3a8a', borderBottom: borderStyle }}>
                                            {item.description.toUpperCase()}
                                        </td>
                                    </tr>
                                );
                            }
                            if (item.is_note) {
                                return (
                                    <tr key={idx}>
                                        <td colSpan={!(doc.document_type === 'Delivery Order' || doc.document_type === 'Packing List') ? 4 : 2} style={{ padding: '8px 15px', fontSize: '11px', color: '#64748b', fontStyle: 'italic', borderBottom: borderStyle }}>
                                            {item.description}
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={idx}>
                                    <td style={{ padding: '15px', fontSize: '12px', borderBottom: borderStyle }}>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                        {item.details && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>{item.details}</div>}
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center', fontSize: '12px', fontWeight: 600, borderBottom: borderStyle }}>
                                        {item.quantity} <span style={{ fontSize: '10px', color: '#64748b' }}>{item.uom || 'UNIT(S)'}</span>
                                    </td>
                                    {!(doc.document_type === 'Delivery Order' || doc.document_type === 'Packing List') && (
                                        <>
                                            <td style={{ padding: '15px', textAlign: 'right', fontSize: '12px', color: '#475569', borderBottom: borderStyle }}>
                                                {(parseFloat(item.unit_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', borderBottom: borderStyle }}>
                                                {(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    {!(doc.document_type === 'Delivery Order' || doc.document_type === 'Packing List') && (
                        <tfoot>
                            <tr>
                                <td colSpan="2" style={{ padding: '20px 0 0 0' }}>
                                    {doc.notes && (
                                        <div style={{ fontSize: '11px', color: '#475569', paddingRight: '40px' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '5px', textTransform: 'uppercase' }}>Notes & Instructions:</div>
                                            <div dangerouslySetInnerHTML={{ __html: doc.notes }} />
                                        </div>
                                    )}
                                </td>
                                <td colSpan="2" style={{ padding: '20px 0 0 0' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '5px 0', color: '#64748b' }}>Subtotal</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{(doc.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            {doc.discount_amount > 0 && (
                                                <tr>
                                                    <td style={{ padding: '5px 0', color: '#ef4444' }}>Discount ({doc.discount_percent || 0}%)</td>
                                                    <td style={{ padding: '5px 0', textAlign: 'right', color: '#ef4444' }}>- {(doc.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td style={{ padding: '5px 0', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Tax (9% GST)</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{(doc.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '15px 0', fontSize: '18px', fontWeight: 900, color: '#1e3a8a' }}>TOTAL ({doc.currency})</td>
                                                <td style={{ padding: '15px 0', textAlign: 'right', fontSize: '18px', fontWeight: 900, color: '#1e3a8a' }}>
                                                    {(doc.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Footer Section: Terms, Payments, Signatures */}
            <div style={{ marginTop: 'auto', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'flex-end', borderTop: '2px solid #0f172a', paddingTop: '20px' }}>
                    <div>
                        {paynowBase64 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ textAlign: 'center', padding: '5px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <img src={paynowBase64} alt="PayNow QR" style={{ width: '80px', height: '80px' }} />
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>SCAN TO PAY</div>
                                </div>
                                <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                                    <strong>Bank Transfer Info:</strong><br />
                                    CEL-RON ENTERPRISES PTE LTD<br />
                                    OCBC BANK: 686-880436-001<br />
                                    {companyUen}
                                </div>
                            </div>
                        )}
                        {!paynowBase64 && doc.terms_conditions && (
                            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.4' }}>
                                <strong style={{ color: '#1e293b' }}>TERMS & CONDITIONS:</strong><br />
                                <div dangerouslySetInnerHTML={{ __html: doc.terms_conditions }} />
                            </div>
                        )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        {signatureBase64 && (
                            <img src={signatureBase64} alt="Signature" style={{ height: '60px', objectFit: 'contain', marginBottom: '5px' }} />
                        )}
                        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '11px', color: '#1e293b', fontWeight: 700 }}>AUTHORIZED SIGNATURE</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Electronically generated document</div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', letterSpacing: '2px' }}>WWW.CELRON.NET</div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowDocumentLayout;

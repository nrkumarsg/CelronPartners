import React, { useState, useEffect } from 'react';
import { X, Send, Users, Mail, CheckCircle2, Search, ArrowRight, Loader2 } from 'lucide-react';
import { getPartners } from '../../lib/store';

export default function FastFloatModal({ isOpen, onClose, onConfirm, enquiry }) {
    const [step, setStep] = useState(1); // 1: Select Suppliers, 2: Review Emails
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
    const [emailDrafts, setEmailDrafts] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            setStep(1);
            setSelectedSuppliers([]);
            setCurrentEmailIndex(0);
        }
    }, [isOpen]);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const data = await getPartners();
            const supps = (data || []).filter(p => Array.isArray(p.types) && p.types.includes('Supplier'));
            setSuppliers(supps);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleNextStep = () => {
        if (selectedSuppliers.length === 0) {
            alert('Please select at least one supplier.');
            return;
        }

        // Generate drafts
        const drafts = selectedSuppliers.map(s => {
            const itemsList = (enquiry.catalog_items || []).map((it, idx) => `${idx + 1}. ${it.name} (${it.qty || it.quantity} ${it.unit || it.uom || 'pcs'})`).join('\n');
            const subject = `RFQ: ${enquiry.enquiry_no} | ${enquiry.subject || enquiry.customer_ref || ''}`;
            const body = `Dear ${s.name || 'Supplier'},\n\nPlease find our Request for Quotation below:\n\n${itemsList}\n\nPlease provide your best price and lead time.\n\nBest Regards,\nCelron Team`;
            
            return {
                supplier: s,
                to: s.email1 || s.email || '',
                subject,
                body
            };
        });

        setEmailDrafts(drafts);
        setStep(2);
    };

    const handleSendCurrent = () => {
        const draft = emailDrafts[currentEmailIndex];
        const bcc = 'celron.simlim0305@gmail.com,accounts@celron.net';
        const mailto = `mailto:${draft.to}?bcc=${bcc}&subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
        window.open(mailto, '_blank');

        if (currentEmailIndex < emailDrafts.length - 1) {
            setCurrentEmailIndex(currentEmailIndex + 1);
        } else {
            onConfirm(selectedSuppliers);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '800px', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px', color: '#3b82f6' }}>
                            <Send size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Fast Float RFQ</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                {step === 1 ? 'Select suppliers to request quotes from' : `Review email for ${emailDrafts[currentEmailIndex]?.supplier?.name}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Body - Step 1: Select Suppliers */}
                {step === 1 && (
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text"
                                placeholder="Search suppliers by name or category..."
                                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => {
                                const isSelected = selectedSuppliers.some(sel => sel.id === s.id);
                                return (
                                    <div 
                                        key={s.id}
                                        onClick={() => {
                                            if (isSelected) setSelectedSuppliers(selectedSuppliers.filter(sel => sel.id !== s.id));
                                            else setSelectedSuppliers([...selectedSuppliers, s]);
                                        }}
                                        style={{ 
                                            padding: '16px', 
                                            borderRadius: '16px', 
                                            border: '2px solid',
                                            borderColor: isSelected ? '#3b82f6' : '#f1f5f9',
                                            background: isSelected ? '#eff6ff' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, color: isSelected ? '#1e40af' : '#1e293b' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email1 || s.email || 'No email'}</div>
                                        </div>
                                        {isSelected && <CheckCircle2 size={20} color="#3b82f6" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Body - Step 2: Review Emails */}
                {step === 2 && emailDrafts[currentEmailIndex] && (
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            {emailDrafts.map((_, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        height: '4px', 
                                        flex: 1, 
                                        borderRadius: '2px', 
                                        background: i === currentEmailIndex ? '#3b82f6' : (i < currentEmailIndex ? '#10b981' : '#e2e8f0'),
                                        transition: 'all 0.3s'
                                    }} 
                                />
                            ))}
                        </div>

                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Recipient</label>
                                <div style={{ fontWeight: 600 }}>{emailDrafts[currentEmailIndex].to}</div>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</label>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{emailDrafts[currentEmailIndex].subject}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Message Body</label>
                                <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
                                    {emailDrafts[currentEmailIndex].body}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                        {step === 1 ? `${selectedSuppliers.length} suppliers selected` : `Reviewing ${currentEmailIndex + 1} of ${emailDrafts.length}`}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {step === 2 && (
                            <button 
                                onClick={() => setStep(1)}
                                style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Back to Selection
                            </button>
                        )}
                        <button 
                            onClick={step === 1 ? handleNextStep : handleSendCurrent}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {step === 1 ? (
                                <>Next: Review Emails <ArrowRight size={18} /></>
                            ) : (
                                <>{currentEmailIndex === emailDrafts.length - 1 ? 'Finish & Launch Mail' : 'Launch Mail & Next'} <Send size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

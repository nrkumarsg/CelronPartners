import React, { useState } from 'react';
import { 
    Info, ChevronRight, Save, Send, 
    FileText, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function GstF5Form({ 
    companyData, 
    periodData, 
    calculations,
    onSave,
    onSubmit
}) {
    const [answers, setAnswers] = useState({
        box10: 'No',
        box11: 'No',
        box12: 'No',
        box14: 'No',
        box15: 'No',
        box16: 'No',
        box17: 'No'
    });

    const formatCurrency = (val) => {
        return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleAnswerChange = (box, value) => {
        setAnswers(prev => ({ ...prev, [box]: value }));
    };

    return (
        <div className="gst-f5-container" style={{ padding: '0 20px' }}>
            {/* IRAS Styled Header Bar */}
            <div className="iras-stepper" style={{ display: 'flex', marginBottom: '30px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                    1. Declaration
                </div>
                <div style={{ flex: 1, padding: '12px', background: '#0284c7', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', position: 'relative' }}>
                    2. Enter Details
                </div>
                <div style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                    3. Acknowledgement
                </div>
            </div>

            <div className="iras-metadata" style={{ marginBottom: '30px', fontSize: '0.9rem', color: '#1e293b' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>GST Reg No.:</span>
                    <span>{companyData?.gst_uen || '201436227C'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>Due Date:</span>
                    <span>{periodData?.dueDate || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>Period covered:</span>
                    <span>{periodData?.start} to {periodData?.end}</span>
                </div>
            </div>

            {/* SUPPLIES SECTION */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Supplies</h3>
                
                <BoxRow 
                    num="1" 
                    label="Total value of standard-rated supplies" 
                    value={calculations.box1} 
                    info="Exclude GST"
                />
                <BoxRow 
                    num="2" 
                    label="Total value of zero-rated supplies" 
                    value={calculations.box2} 
                />
                <BoxRow 
                    num="3" 
                    label="Total value of exempt supplies" 
                    value={calculations.box3} 
                />
                
                <div style={{ background: '#fef9c3', padding: '16px', borderRadius: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fde047' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#ca8a04', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>4</div>
                        <span style={{ fontWeight: 700, color: '#854d0e' }}>Total value of (1) + (2) + (3)</span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#854d0e' }}>S$ {formatCurrency(calculations.box4)}</span>
                </div>
            </div>

            {/* PURCHASES SECTION */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Purchases</h3>
                <BoxRow 
                    num="5" 
                    label="Total value of taxable purchases" 
                    value={calculations.box5} 
                    info="Exclude GST"
                />
            </div>

            {/* TAXES SECTION */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Taxes</h3>
                <BoxRow 
                    num="6" 
                    label="Output tax due" 
                    value={calculations.box6} 
                />
                <BoxRow 
                    num="7" 
                    label="Less: Input tax and refunds claimed" 
                    value={calculations.box7} 
                />
                
                <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>8</div>
                        <span style={{ fontWeight: 700, color: '#0369a1' }}>
                            {calculations.box8 >= 0 ? 'Equals: Net GST to be paid to IRAS' : 'Equals: Net GST to be claimed from IRAS'}
                        </span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1' }}>S$ {formatCurrency(Math.abs(calculations.box8))}</span>
                </div>
            </div>

            {/* APPROVED SCHEMES */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>For businesses under the Approved Schemes only</h3>
                <BoxRow 
                    num="9" 
                    label="Total value of goods imported under GST suspension schemes" 
                    value={calculations.box9} 
                    info="e.g. Major Exporter Scheme"
                />
            </div>

            {/* BOX 7 QUESTIONS */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>For claims made in Box 7 (Input Tax and Refunds Claimed)</h3>
                <QuestionRow 
                    num="10" 
                    label="Did you claim for GST you had refunded to tourists?" 
                    value={answers.box10}
                    onChange={(v) => handleAnswerChange('box10', v)}
                />
                <QuestionRow 
                    num="11" 
                    label="Did you make any bad debt relief claims and/or refund for reverse charge transactions?" 
                    value={answers.box11}
                    onChange={(v) => handleAnswerChange('box11', v)}
                />
                <QuestionRow 
                    num="12" 
                    label="Did you make any pre-registration input tax claims?" 
                    value={answers.box12}
                    onChange={(v) => handleAnswerChange('box12', v)}
                />
            </div>

            {/* REVENUE */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Revenue</h3>
                <BoxRow 
                    num="13" 
                    label="Revenue for the accounting period" 
                    value={calculations.box13} 
                />
            </div>

            {/* REVERSE CHARGE */}
            <div className="iras-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>For Businesses Subject to Reverse Charge</h3>
                <QuestionRow 
                    num="14" 
                    label="Did you import services and/or low-value goods subject to GST under Reverse Charge?" 
                    value={answers.box14}
                    onChange={(v) => handleAnswerChange('box14', v)}
                />
            </div>

            {/* NEXT STEPS BAR */}
            <div style={{ 
                marginTop: '60px', 
                background: '#f8fafc', 
                padding: '30px', 
                borderRadius: '24px', 
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '40px'
            }}>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                        Save the changes if you wish to temporarily save your return for 14 days.
                    </p>
                    <button className="btn btn-secondary" onClick={onSave} style={{ width: '100%', justifyContent: 'center', background: '#0d9488', color: '#fff', border: 'none' }}>
                        <Save size={18} /> SAVE DRAFT AND EXIT
                    </button>
                </div>
                
                <div style={{ width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }}></div>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>OR</div>
                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }}></div>
                </div>

                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                        Proceed to submit your GST F5 Return after you have confirmed that the information is complete.
                    </p>
                    <button className="btn btn-primary" onClick={onSubmit} style={{ width: '100%', justifyContent: 'center', background: '#f97316', color: '#fff', border: 'none' }}>
                        SUBMIT FORM <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CLEAR</button>
            </div>
        </div>
    );
}

function BoxRow({ num, label, value, info }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ background: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>{num}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{label}</span>
                    {info && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{info}</span>}
                </div>
                <Info size={14} color="#94a3b8" style={{ cursor: 'help' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>S$</span>
                <div style={{ 
                    width: '180px', 
                    padding: '8px 16px', 
                    background: '#fff', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    textAlign: 'right',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#1e293b'
                }}>
                    {(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        </div>
    );
}

function QuestionRow({ num, label, value, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ background: '#64748b', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>{num}</div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{label}</span>
                <Info size={14} color="#94a3b8" style={{ cursor: 'help' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: value === 'Yes' ? '#0284c7' : '#64748b' }}>
                    <input type="radio" name={`box${num}`} checked={value === 'Yes'} onChange={() => onChange('Yes')} />
                    Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: value === 'No' ? '#0284c7' : '#64748b' }}>
                    <input type="radio" name={`box${num}`} checked={value === 'No'} onChange={() => onChange('No')} />
                    No
                </label>
            </div>
        </div>
    );
}

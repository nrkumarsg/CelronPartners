import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Calculator,
    Link,
    FileText,
    Repeat,
    Layers,
    Scissors,
    RotateCw,
    Download,
    Plus,
    Trash2,
    Loader2,
    DollarSign,
    Ruler,
    CheckCircle2,
    Save,
    Type,
    Type as TypeIcon,
    Signature,
    Square,
    Circle as CircleIcon,
    Settings,
    X,
    Edit,
    ExternalLink,
    ChevronRight
} from 'lucide-react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Set up PDF.js worker - using local worker for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).href;

const CURRENCIES = ['USD', 'SGD', 'EUR', 'CNY', 'INR', 'JPY', 'GBP', 'AUD', 'CAD', 'HKD', 'MYR'];

const EXTERNAL_LINKS = {
    currency: { label: 'XE Currency Converter', url: 'https://www.xe.com/currencyconverter/' },
    unit: { label: 'Calculator.net Unit Converter', url: 'https://www.calculator.net/unit-converter.html' },
    pdf: { label: 'Stirling-PDF (Open Source PDF Suite)', url: 'https://www.stirlingpdf.com/' },
    editor: { label: 'Sejda Online PDF Editor', url: 'https://www.sejda.com/pdf-editor' }
};

const UNIT_CATEGORIES = {
    Length: [
        { name: 'Meters', factor: 1 },
        { name: 'Feet', factor: 0.3048 },
        { name: 'Nautical Miles', factor: 1852 },
        { name: 'Kilometers', factor: 1000 },
        { name: 'Inches', factor: 0.0254 }
    ],
    Weight: [
        { name: 'Kilograms', factor: 1 },
        { name: 'Metric Tons', factor: 1000 },
        { name: 'Pounds (lb)', factor: 0.453592 },
        { name: 'Ounces', factor: 0.0283495 }
    ],
    Pressure: [
        { name: 'Bar', factor: 1 },
        { name: 'PSI', factor: 0.0689476 },
        { name: 'Pascal', factor: 0.00001 }
    ],
    Speed: [
        { name: 'Knots', factor: 1 },
        { name: 'km/h', factor: 0.539957 },
        { name: 'm/s', factor: 1.94384 }
    ]
};

export default function Converter() {
    const [activeTab, setActiveTab] = useState('currency');

    // Currency State
    const [currencyAmount, setCurrencyAmount] = useState(1);
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('SGD');
    const [exchangeRate, setExchangeRate] = useState(null);
    const [isFetchingRate, setIsFetchingRate] = useState(false);

    // Unit State
    const [unitCategory, setUnitCategory] = useState('Length');
    const [unitValue, setUnitValue] = useState(1);
    const [fromUnit, setFromUnit] = useState('Meters');
    const [toUnit, setToUnit] = useState('Feet');

    // PDF State
    const [pdfFiles, setPdfFiles] = useState([]);
    const [pdfStatus, setPdfStatus] = useState('');
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);

    useEffect(() => {
        if (activeTab === 'currency' && fromCurrency && toCurrency) {
            fetchRate();
        }
    }, [fromCurrency, toCurrency]);

    const fetchRate = async () => {
        setIsFetchingRate(true);
        try {
            // Using a free rate API (Exchange Rate API)
            const res = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
            const data = await res.json();
            if (data && data.rates) {
                setExchangeRate(data.rates[toCurrency]);
            }
        } catch (err) {
            console.error('Currency fetch error:', err);
        } finally {
            setIsFetchingRate(false);
        }
    };

    const convertUnits = () => {
        const cat = UNIT_CATEGORIES[unitCategory];
        const from = cat.find(u => u.name === fromUnit);
        const to = cat.find(u => u.name === toUnit);
        if (!from || !to) return 0;
        return (unitValue * from.factor) / to.factor;
    };

    const handlePdfUpload = (e) => {
        const files = Array.from(e.target.files);
        setPdfFiles(prev => [...prev, ...files]);
    };

    const mergePdfs = async () => {
        const validFiles = pdfFiles.filter(f => f.size > 0);
        if (validFiles.length < 2) {
            alert('Select at least 2 valid (non-empty) PDF files to merge.');
            return;
        }
        setIsProcessingPdf(true);
        setPdfStatus('');
        try {
            const mergedPdf = await PDFDocument.create();
            for (const file of validFiles) {
                try {
                    const bytes = await file.arrayBuffer();
                    const pdf = await PDFDocument.load(bytes);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                } catch (fileErr) {
                    throw new Error(`Failed to load "${file.name}": ${fileErr.message}`);
                }
            }
            const pdfBytes = await mergedPdf.save();
            downloadBlob(pdfBytes, 'merged_document.pdf', 'application/pdf');
            setPdfStatus('Successfully merged PDFs!');
        } catch (err) {
            console.error('Merge error:', err);
            setPdfStatus(err.message || 'Error merging PDFs.');
        } finally {
            setIsProcessingPdf(false);
        }
    };

    // --- PDF Editor State ---
    const [editorFile, setEditorFile] = useState(null);
    const [editorDoc, setEditorDoc] = useState(null);
    const [editorPageNum, setEditorPageNum] = useState(1);
    const [editorTotalPages, setEditorTotalPages] = useState(0);
    const [annotations, setAnnotations] = useState([]); // { type, x, y, content, color, scale, page, width, height }
    const [currentTool, setCurrentTool] = useState('select'); // select, text, stamp, rect, circle
    const [customStampText, setCustomStampText] = useState('APPROVED');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [signatureImage, setSignatureImage] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [editorStatus, setEditorStatus] = useState('');
    const editorCanvasRef = useRef(null);

    const loadEditorPdf = async (file) => {
        setEditorFile(file);
        setAnnotations([]);
        setEditorStatus('Loading document...');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            setEditorDoc(pdf);
            setEditorTotalPages(pdf.numPages);
            setEditorStatus('');
            renderPage(1, pdf);
        } catch (err) {
            console.error('Editor load error:', err);
            setEditorStatus(`Failed to load PDF: ${err.message || 'Check browser console'}`);
        }
    };

    const renderPage = async (num, doc = editorDoc) => {
        if (!doc || !editorCanvasRef.current) return;
        try {
            const page = await doc.getPage(num);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = editorCanvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        } catch (err) {
            console.error('Page render error:', err);
        }
    };

    const addAnnotation = (e) => {
        if (currentTool === 'select' || !editorCanvasRef.current) return;

        const rect = editorCanvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let content = '';
        if (currentTool === 'text') {
            content = prompt('Enter text:') || '';
            if (!content) return;
        } else if (currentTool === 'stamp') {
            content = customStampText;
        } else if (currentTool === 'signature') {
            if (!signatureImage) {
                setShowSignatureModal(true);
                return;
            }
            content = signatureImage;
        }

        const newAnn = {
            id: uuidv4(),
            type: currentTool,
            x: x / (rect.width / editorCanvasRef.current.width),
            y: y / (rect.height / editorCanvasRef.current.height),
            content,
            page: editorPageNum,
            color: selectedColor,
            width: 100, // Default width for shapes
            height: 60  // Default height for shapes
        };

        setAnnotations([...annotations, newAnn]);
        setCurrentTool('select');
    };

    const saveEditedPdf = async () => {
        if (!editorFile) return;
        setIsProcessingPdf(true);
        setEditorStatus('Saving document...');
        try {
            const existingPdfBytes = await editorFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const pages = pdfDoc.getPages();

            for (const ann of annotations) {
                const page = pages[ann.page - 1];
                const { width, height } = page.getSize();

                const pdfX = (ann.x / editorCanvasRef.current.width) * width;
                const pdfY = height - ((ann.y / editorCanvasRef.current.height) * height);

                // Color conversion from hex to RGB normalized (0-1)
                const r = parseInt(ann.color.slice(1, 3), 16) / 255;
                const g = parseInt(ann.color.slice(3, 5), 16) / 255;
                const b = parseInt(ann.color.slice(5, 7), 16) / 255;
                const pdfColor = rgb(r, g, b);

                if (ann.type === 'text' || ann.type === 'stamp') {
                    page.drawText(ann.content, {
                        x: pdfX,
                        y: pdfY,
                        size: ann.type === 'stamp' ? 32 : 14,
                        font,
                        color: pdfColor
                    });
                } else if (ann.type === 'rect') {
                    page.drawRectangle({
                        x: pdfX - 50,
                        y: pdfY - 30,
                        width: 100,
                        height: 60,
                        borderColor: pdfColor,
                        borderWidth: 2
                    });
                } else if (ann.type === 'circle') {
                    page.drawCircle({
                        x: pdfX,
                        y: pdfY,
                        size: 30,
                        borderColor: pdfColor,
                        borderWidth: 2
                    });
                } else if (ann.type === 'signature') {
                    try {
                        const imageBytes = await fetch(ann.content).then(res => res.arrayBuffer());
                        const sigImage = await pdfDoc.embedPng(imageBytes);
                        page.drawImage(sigImage, {
                            x: pdfX - 75,
                            y: pdfY - 25,
                            width: 150,
                            height: 50
                        });
                    } catch (e) {
                        console.error('Signature embed error:', e);
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            downloadBlob(pdfBytes, `edited_${editorFile.name}`, 'application/pdf');
            setEditorStatus('Changes saved successfully!');
        } catch (err) {
            console.error('Save error:', err);
            setEditorStatus('Error saving edited PDF.');
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const rotatePdf = async (idx) => {
        const file = pdfFiles[idx];
        setIsProcessingPdf(true);
        setPdfStatus('');
        try {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);
            const pages = pdf.getPages();
            pages.forEach(page => {
                const rotation = page.getRotation().angle;
                page.setRotation(degrees(rotation + 90));
            });
            const pdfBytes = await pdf.save();
            downloadBlob(pdfBytes, `rotated_${file.name}`, 'application/pdf');
            setPdfStatus(`Rotated ${file.name} successfully!`);
        } catch (err) {
            console.error('Rotate error:', err);
            setPdfStatus(`Error rotating ${file.name}`);
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const splitPdf = async (idx) => {
        const file = pdfFiles[idx];
        setIsProcessingPdf(true);
        setPdfStatus('');
        try {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);
            const pageCount = pdf.getPageCount();

            if (pageCount <= 1) {
                alert('This PDF only has one page and cannot be split.');
                return;
            }

            if (!confirm(`This will download ${pageCount} separate PDF files. Continue?`)) {
                return;
            }

            for (let i = 0; i < pageCount; i++) {
                const subPdf = await PDFDocument.create();
                const [copiedPage] = await subPdf.copyPages(pdf, [i]);
                subPdf.addPage(copiedPage);
                const subPdfBytes = await subPdf.save();
                downloadBlob(subPdfBytes, `${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`, 'application/pdf');
                // Small delay to avoid browser download congestion
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            setPdfStatus(`Split ${file.name} into ${pageCount} pages!`);
        } catch (err) {
            console.error('Split error:', err);
            setPdfStatus(`Error splitting ${file.name}`);
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const downloadBlob = (data, fileName, mimeType) => {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    };

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '10px', background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', borderRadius: '12px', color: '#fff' }}>
                        <Repeat size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Universal Converter</h1>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Convert currencies, units, and manipulate PDF documents instantly.</p>
            </header>

            <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', minHeight: '600px', overflow: 'hidden' }}>
                {/* Custom Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {[
                        { id: 'currency', label: 'Currency', icon: <DollarSign size={18} /> },
                        { id: 'unit', label: 'Unit Converter', icon: <Ruler size={18} /> },
                        { id: 'pdf', label: 'PDF Tools (Merge/Split)', icon: <Scissors size={18} /> },
                        { id: 'editor', label: 'PDF Editor', icon: <Edit size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '16px 24px',
                                border: 'none',
                                background: activeTab === tab.id ? '#fff' : 'transparent',
                                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
                                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '32px', flex: 1 }}>
                    {activeTab === 'currency' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Live Currency Exchange</h2>
                                <a
                                    href={EXTERNAL_LINKS.currency.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                    title={EXTERNAL_LINKS.currency.label}
                                >
                                    <ExternalLink size={14} /> Open Online Tool
                                </a>
                            </div>
                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>Amount</label>
                                    <input
                                        type="number"
                                        value={currencyAmount}
                                        onChange={(e) => setCurrencyAmount(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>From</label>
                                        <select
                                            value={fromCurrency}
                                            onChange={(e) => setFromCurrency(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        >
                                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginTop: '24px', color: '#94a3b8' }}><Repeat size={20} /></div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>To</label>
                                        <select
                                            value={toCurrency}
                                            onChange={(e) => setToCurrency(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        >
                                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '24px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd',
                                    textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px'
                                }}>
                                    {isFetchingRate ? <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#3b82f6' }} /> : (
                                        <>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0c4a6e' }}>
                                                {(currencyAmount * (exchangeRate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#0369a1' }}>
                                                1 {fromCurrency} = {exchangeRate} {toCurrency}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'unit' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Professional Unit Converter</h2>
                                <a
                                    href={EXTERNAL_LINKS.unit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                    title={EXTERNAL_LINKS.unit.label}
                                >
                                    <ExternalLink size={14} /> Open Online Tool
                                </a>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {Object.keys(UNIT_CATEGORIES).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setUnitCategory(cat);
                                            setFromUnit(UNIT_CATEGORIES[cat][0].name);
                                            setToUnit(UNIT_CATEGORIES[cat][1].name);
                                        }}
                                        style={{
                                            padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0',
                                            background: unitCategory === cat ? '#3b82f6' : '#fff',
                                            color: unitCategory === cat ? '#fff' : '#64748b',
                                            cursor: 'pointer', fontWeight: 600
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <input
                                    type="number"
                                    value={unitValue}
                                    onChange={(e) => setUnitValue(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1.1rem' }}
                                />
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <select
                                        value={fromUnit}
                                        onChange={(e) => setFromUnit(e.target.value)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                    >
                                        {UNIT_CATEGORIES[unitCategory].map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                                    </select>
                                    <ChevronRight size={20} color="#94a3b8" />
                                    <select
                                        value={toUnit}
                                        onChange={(e) => setToUnit(e.target.value)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                    >
                                        {UNIT_CATEGORIES[unitCategory].map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                                    </select>
                                </div>

                                <div style={{
                                    padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#14532d' }}>
                                        {convertUnits().toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </div>
                                    <div style={{ fontSize: '1rem', color: '#166534', fontWeight: 600 }}>{toUnit}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pdf' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>PDF Merge & Toolbox</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <a
                                        href={EXTERNAL_LINKS.pdf.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                        title={EXTERNAL_LINKS.pdf.label}
                                    >
                                        <ExternalLink size={14} /> Open Online Tool
                                    </a>
                                    <label className="btn btn-primary" style={{ background: '#3b82f6', cursor: 'pointer' }}>
                                        <Plus size={18} /> Add PDF Files
                                        <input type="file" multiple accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            {pdfFiles.length === 0 ? (
                                <div style={{
                                    padding: '60px', border: '2px dashed #e2e8f0', borderRadius: '24px',
                                    textAlign: 'center', background: '#fff'
                                }}>
                                    <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                    <p style={{ color: '#64748b' }}>Upload your PDF documents to start merging or splitting.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {pdfFiles.map((file, idx) => (
                                        <div key={idx} style={{
                                            padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0',
                                            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px'
                                        }}>
                                            <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}>
                                                <FileText size={18} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {file.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => splitPdf(idx)}
                                                    className="history-action-btn"
                                                    title="Split into pages"
                                                    disabled={isProcessingPdf}
                                                >
                                                    <Scissors size={14} />
                                                </button>
                                                <button
                                                    onClick={() => rotatePdf(idx)}
                                                    className="history-action-btn"
                                                    title="Rotate 90°"
                                                    disabled={isProcessingPdf}
                                                >
                                                    <RotateCw size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setPdfFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="history-action-btn delete-btn"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{
                                        marginTop: '24px', padding: '24px', background: '#f8fafc',
                                        borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px'
                                    }}>
                                        <button
                                            onClick={mergePdfs}
                                            disabled={isProcessingPdf || pdfFiles.length < 2}
                                            className="btn btn-primary"
                                            style={{ flex: 1, background: '#10b981' }}
                                        >
                                            {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                                            Merge PDFs
                                        </button>
                                        <button
                                            onClick={() => splitPdf(0)}
                                            className="btn btn-secondary"
                                            style={{ flex: 1 }}
                                            disabled={isProcessingPdf || pdfFiles.length === 0}
                                        >
                                            <Scissors size={18} /> Split PDF
                                        </button>
                                        <button
                                            onClick={() => rotatePdf(0)}
                                            className="btn btn-secondary"
                                            style={{ flex: 1 }}
                                            disabled={isProcessingPdf || pdfFiles.length === 0}
                                        >
                                            <RotateCw size={18} /> Rotate
                                        </button>
                                    </div>
                                    {pdfStatus && (
                                        <div style={{
                                            marginTop: '12px', padding: '12px', borderRadius: '8px',
                                            background: pdfStatus.includes('Error') ? '#fee2e2' : '#dcfce7',
                                            color: pdfStatus.includes('Error') ? '#dc2626' : '#15803d',
                                            fontSize: '0.85rem', textAlign: 'center', fontWeight: 600
                                        }}>
                                            {pdfStatus}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
                            {!editorFile ? (
                                <div style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', textAlign: 'center', padding: '40px'
                                }}>
                                    <div style={{ padding: '40px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', maxWidth: '500px', position: 'relative' }}>
                                        <a
                                            href={EXTERNAL_LINKS.editor.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '0.75rem', padding: '4px 10px' }}
                                            title={EXTERNAL_LINKS.editor.label}
                                        >
                                            <ExternalLink size={12} /> Open Online Tool
                                        </a>
                                        <Edit size={48} color="#3b82f6" style={{ marginBottom: '24px' }} />
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Integrated PDF Editor</h2>
                                        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
                                            Add text, signatures, and stamps directly to your documents. No uploads needed—all processing stays in your browser.
                                        </p>
                                        <label className="btn btn-primary" style={{ background: '#3b82f6', cursor: 'pointer', display: 'inline-flex' }}>
                                            <Plus size={18} /> Open PDF for Editing
                                            <input type="file" accept="application/pdf" onChange={(e) => e.target.files[0] && loadEditorPdf(e.target.files[0])} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: '600px' }}>
                                    {/* Toolbar */}
                                    <div style={{ width: '220px', background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Tools</h3>
                                        <button
                                            onClick={() => setCurrentTool('select')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'select' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'select' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Repeat size={18} /> Selection
                                        </button>
                                        <button
                                            onClick={() => setCurrentTool('text')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'text' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'text' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Type size={18} /> Add Text
                                        </button>
                                        <button
                                            onClick={() => setCurrentTool('stamp')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'stamp' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'stamp' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <CheckCircle2 size={18} /> Add Stamp
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (signatureImage) {
                                                    setCurrentTool('signature');
                                                } else {
                                                    setShowSignatureModal(true);
                                                }
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'signature' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'signature' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Signature size={18} /> Add Signature
                                        </button>
                                        <button
                                            onClick={() => setCurrentTool('rect')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'rect' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'rect' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Square size={18} /> Rectangle
                                        </button>
                                        <button
                                            onClick={() => setCurrentTool('circle')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', border: 'none',
                                                background: currentTool === 'circle' ? '#eff6ff' : 'transparent',
                                                color: currentTool === 'circle' ? '#3b82f6' : '#64748b',
                                                fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <CircleIcon size={18} /> Circle
                                        </button>

                                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0', paddingTop: '16px' }}>
                                            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Settings</h3>

                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Stamp Text</label>
                                                <input
                                                    value={customStampText}
                                                    onChange={(e) => setCustomStampText(e.target.value.toUpperCase())}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Color</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {['#3b82f6', '#ef4444', '#10b981', '#000000'].map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setSelectedColor(color)}
                                                            style={{
                                                                width: '24px', height: '24px', borderRadius: '50%', background: color, border: selectedColor === color ? '2px solid #fff' : 'none',
                                                                boxShadow: selectedColor === color ? '0 0 0 2px #3b82f6' : 'none', cursor: 'pointer'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                onClick={saveEditedPdf}
                                                className="btn btn-primary"
                                                style={{ width: '100%', background: '#10b981' }}
                                                disabled={isProcessingPdf}
                                            >
                                                {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => setEditorFile(null)}
                                                className="btn btn-secondary"
                                                style={{ width: '100%' }}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>

                                    {/* Canvas Area */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <button
                                                    onClick={() => {
                                                        const newPage = Math.max(1, editorPageNum - 1);
                                                        setEditorPageNum(newPage);
                                                        renderPage(newPage);
                                                    }}
                                                    className="btn btn-secondary" style={{ padding: '6px' }}
                                                >
                                                    <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                                                </button>
                                                <span style={{ fontWeight: 600 }}>Page {editorPageNum} of {editorTotalPages}</span>
                                                <button
                                                    onClick={() => {
                                                        const newPage = Math.min(editorTotalPages, editorPageNum + 1);
                                                        setEditorPageNum(newPage);
                                                        renderPage(newPage);
                                                    }}
                                                    className="btn btn-secondary" style={{ padding: '6px' }}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                            {editorStatus && <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600 }}>{editorStatus}</div>}
                                        </div>

                                        <div style={{
                                            flex: 1, background: '#64748b', borderRadius: '16px', overflow: 'auto',
                                            padding: '40px', display: 'flex', justifyContent: 'center', position: 'relative'
                                        }}>
                                            <div style={{ position: 'relative', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', cursor: currentTool !== 'select' ? 'crosshair' : 'default' }}>
                                                <canvas
                                                    ref={editorCanvasRef}
                                                    onClick={addAnnotation}
                                                    style={{ background: '#fff', display: 'block' }}
                                                />
                                                {/* Annotations Overlay */}
                                                {annotations.filter(ann => ann.page === editorPageNum).map(ann => (
                                                    <div
                                                        key={ann.id}
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${(ann.x / editorCanvasRef.current.width) * 100}%`,
                                                            top: `${(ann.y / editorCanvasRef.current.height) * 100}%`,
                                                            color: ann.color,
                                                            pointerEvents: 'none',
                                                            transform: 'translate(-50%, -50%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        {(ann.type === 'text' || ann.type === 'stamp') && (
                                                            <div style={{
                                                                fontSize: ann.type === 'stamp' ? '2.5rem' : '1.25rem',
                                                                fontWeight: 800,
                                                                whiteSpace: 'nowrap',
                                                                padding: ann.type === 'stamp' ? '8px 16px' : '0',
                                                                border: ann.type === 'stamp' ? `4px solid ${ann.color}` : 'none',
                                                                borderRadius: '8px',
                                                                opacity: 0.8
                                                            }}>
                                                                {ann.content}
                                                            </div>
                                                        )}
                                                        {ann.type === 'rect' && (
                                                            <div style={{
                                                                width: '100px', height: '60px',
                                                                border: `3px solid ${ann.color}`,
                                                                opacity: 0.6
                                                            }} />
                                                        )}
                                                        {ann.type === 'circle' && (
                                                            <div style={{
                                                                width: '60px', height: '60px',
                                                                border: `3px solid ${ann.color}`,
                                                                borderRadius: '50%',
                                                                opacity: 0.6
                                                            }} />
                                                        )}
                                                        {ann.type === 'signature' && (
                                                            <div style={{ padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px', background: 'rgba(255,255,255,0.5)' }}>
                                                                <img src={ann.content} alt="sig" style={{ width: '150px', height: '50px', objectFit: 'contain' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


            {/* Signature Modal */}
            {showSignatureModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Draw Your Signature</h3>
                            <button onClick={() => setShowSignatureModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>

                        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc', marginBottom: '24px', overflow: 'hidden' }}>
                            <canvas
                                id="signatureCanvas"
                                width="440"
                                height="200"
                                style={{ cursor: 'crosshair', display: 'block' }}
                                onMouseDown={(e) => {
                                    const canvas = e.target;
                                    const ctx = canvas.getContext('2d');
                                    ctx.beginPath();
                                    ctx.strokeStyle = '#000';
                                    ctx.lineWidth = 3;
                                    ctx.lineJoin = 'round';
                                    ctx.lineCap = 'round';
                                    canvas.isDrawing = true;
                                    const rect = canvas.getBoundingClientRect();
                                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                                }}
                                onMouseMove={(e) => {
                                    const canvas = e.target;
                                    if (!canvas.isDrawing) return;
                                    const ctx = canvas.getContext('2d');
                                    const rect = canvas.getBoundingClientRect();
                                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                                    ctx.stroke();
                                }}
                                onMouseUp={(e) => { e.target.isDrawing = false; }}
                                onMouseLeave={(e) => { e.target.isDrawing = false; }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    const canvas = document.getElementById('signatureCanvas');
                                    const ctx = canvas.getContext('2d');
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                }}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => {
                                    const canvas = document.getElementById('signatureCanvas');
                                    setSignatureImage(canvas.toDataURL('image/png'));
                                    setShowSignatureModal(false);
                                    setCurrentTool('signature');
                                }}
                                className="btn btn-primary"
                                style={{ flex: 2, background: '#3b82f6' }}
                            >
                                Adopt Signature
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .glass-panel {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    font-size: 0.9rem;
                }
                .btn-primary {
                    color: white;
                }
                .btn-primary:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
                }
                .btn-secondary {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                }
                .btn-secondary:hover:not(:disabled) {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #1e293b;
                }
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    </div>
</div>
    );
}

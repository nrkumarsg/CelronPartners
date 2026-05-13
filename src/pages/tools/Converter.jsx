import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    currency: [
        { label: 'XE Currency Converter', url: 'https://www.xe.com/currencyconverter/' },
        { label: 'OANDA Rates', url: 'https://www.oanda.com/currency/converter/' },
        { label: 'Wise (TransferWise)', url: 'https://wise.com/gb/currency-converter/' }
    ],
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
    const [activeTab, setActiveTab] = useState('calculator');

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

    // Calculator State
    const [calcDisplay, setCalcDisplay] = useState('0');
    const [calcFormula, setCalcFormula] = useState('');
    const [calcResult, setCalcResult] = useState(null);

    // Percentage Helper State
    const [percX, setPercX] = useState(0);
    const [percY, setPercY] = useState(() => {
        return localStorage.getItem('custom_gst_rate') || '9';
    });
    const [percType, setPercType] = useState('of'); // of, isWhat, inc, dec, add, sub
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [tempRate, setTempRate] = useState('');

    const location = useLocation();

    const calculatePercentage = () => {
        const x = parseFloat(percX) || 0;
        const y = parseFloat(percY) || 0;
        switch (percType) {
            case 'of': return (y / 100) * x;
            case 'isWhat': return (x / y) * 100;
            case 'inc': return ((y - x) / x) * 100;
            case 'dec': return ((x - y) / x) * 100;
            case 'add': return x * (1 + (y / 100));
            case 'sub': return x * (1 - (y / 100));
            default: return 0;
        }
    };

    useEffect(() => {
        if (activeTab === 'currency' && fromCurrency && toCurrency) {
            fetchRate();
        }
    }, [activeTab, fromCurrency, toCurrency]);

    // Handle PDF file passed via state (e.g. from WorkflowEditor)
    useEffect(() => {
        if (location.state?.pdfFile) {
            console.log('Converter: PDF file received from state');
            setActiveTab('editor');
            loadEditorPdf(location.state.pdfFile);
        }
    }, [location.state]);

    // Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
            if (isInput && e.key !== 'Escape') return;
            if (activeTab !== 'calculator') return;

            const key = e.key;
            if (/[0-9]/.test(key) || ['+', '-', '*', '/', '.', '(', ')', '%'].includes(key)) {
                e.preventDefault();
                handleCalcPress(key);
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                handleCalcPress('=');
            } else if (key === 'Backspace') {
                e.preventDefault();
                handleCalcPress('DEL');
            } else if (key === 'Escape' || key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCalcPress('C');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, calcFormula, calcDisplay, calcResult]);

    useEffect(() => {
        const val = parseFloat(calcDisplay);
        if (!isNaN(val)) {
            setPercX(val);
        }
    }, [calcDisplay]);

    const handleCalcPress = (btn) => {
        if (btn === 'C') {
            setCalcDisplay('0');
            setCalcFormula('');
            setCalcResult(null);
        } else if (btn === '=') {
            try {
                const result = eval(calcFormula.replace(/[^-()\d/*+.]/g, ''));
                setCalcDisplay(result.toString());
                setCalcFormula(calcFormula + ' =');
                setCalcResult(result);
                setPercX(result);
            } catch (e) {
                setCalcDisplay('Error');
            }
        } else if (btn === '%') {
            const val = parseFloat(calcDisplay) / 100;
            setCalcDisplay(val.toString());
            setCalcFormula(calcFormula + '/100');
        } else if (btn === 'DEL') {
            if (calcResult !== null) {
                setCalcDisplay('0');
                setCalcFormula('');
                setCalcResult(null);
            } else {
                const nextDisplay = calcDisplay.length > 1 ? calcDisplay.slice(0, -1) : '0';
                const nextFormula = calcFormula.length > 0 ? calcFormula.slice(0, -1) : '';
                setCalcDisplay(nextDisplay);
                setCalcFormula(nextFormula);
            }
        } else {
            const nextDisplay = calcDisplay === '0' || calcResult !== null ? btn : calcDisplay + btn;
            const nextFormula = calcResult !== null ? btn : calcFormula + btn;
            setCalcDisplay(nextDisplay);
            setCalcFormula(nextFormula);
            if (calcResult !== null) setCalcResult(null);
        }
    };

    const btnStyle = (type) => ({
        padding: '16px',
        fontSize: '1.1rem',
        fontWeight: 700,
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: type === 'num' ? '#f1f5f9' : (type === 'accent' ? '#f5f3ff' : (type === 'primary' ? '#3b82f6' : '#e2e8f0')),
        color: type === 'num' ? '#475569' : (type === 'accent' ? '#6366f1' : (type === 'primary' ? '#fff' : '#64748b')),
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    });

    const fetchRate = async () => {
        setIsFetchingRate(true);
        try {
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
            alert('Select at least 2 valid PDF files to merge.');
            return;
        }
        setIsProcessingPdf(true);
        setPdfStatus('');
        try {
            const mergedPdf = await PDFDocument.create();
            for (const file of validFiles) {
                const bytes = await file.arrayBuffer();
                const pdf = await PDFDocument.load(bytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
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

    // --- PDF Editor Logic ---
    const [editorFile, setEditorFile] = useState(null);
    const [editorDoc, setEditorDoc] = useState(null);
    const [editorPageNum, setEditorPageNum] = useState(1);
    const [editorTotalPages, setEditorTotalPages] = useState(0);
    const [annotations, setAnnotations] = useState([]);
    const [currentTool, setCurrentTool] = useState('select');
    const [customStampText, setCustomStampText] = useState('APPROVED');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [fillShape, setFillShape] = useState(false);
    const [signatureImage, setSignatureImage] = useState(null);
    const [savedSignatures, setSavedSignatures] = useState(() => {
        const saved = localStorage.getItem('celron_signatures');
        return saved ? JSON.parse(saved) : [];
    });
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [editorStatus, setEditorStatus] = useState('');
    const editorCanvasRef = useRef(null);

    const [draggingId, setDraggingId] = useState(null);
    const [resizingId, setResizingId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });

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
            setEditorStatus(`Failed to load PDF: ${err.message}`);
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
            await page.render({ canvasContext: context, viewport }).promise;
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
            if (!signatureImage) { setShowSignatureModal(true); return; }
            content = signatureImage;
        }

        const newAnn = {
            id: Math.random().toString(36).substr(2, 9),
            type: currentTool,
            x, y, content, page: editorPageNum, color: selectedColor, fill: fillShape,
            width: currentTool === 'signature' ? 150 : (currentTool === 'rect' ? 100 : (currentTool === 'circle' ? 60 : 0)),
            height: currentTool === 'signature' ? 50 : (currentTool === 'rect' ? 60 : (currentTool === 'circle' ? 60 : 0))
        };
        setAnnotations([...annotations, newAnn]);
        setCurrentTool('select');
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (draggingId) {
                const rect = editorCanvasRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                setAnnotations(prev => prev.map(ann => 
                    ann.id === draggingId ? { ...ann, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } : ann
                ));
            } else if (resizingId) {
                const dx = e.clientX - startPos.x;
                const dy = e.clientY - startPos.y;
                setAnnotations(prev => prev.map(ann => 
                    ann.id === resizingId ? { ...ann, width: Math.max(20, startSize.width + dx), height: Math.max(20, startSize.height + dy) } : ann
                ));
            }
        };
        const handleMouseUp = () => { setDraggingId(null); setResizingId(null); };
        if (draggingId || resizingId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingId, resizingId, dragOffset, startPos, startSize]);

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
                const r = parseInt(ann.color.slice(1, 3), 16) / 255;
                const g = parseInt(ann.color.slice(3, 5), 16) / 255;
                const b = parseInt(ann.color.slice(5, 7), 16) / 255;
                const pdfColor = rgb(r, g, b);

                if (ann.type === 'text' || ann.type === 'stamp') {
                    page.drawText(ann.content, { x: pdfX, y: pdfY, size: ann.type === 'stamp' ? 32 : 14, font, color: pdfColor });
                } else if (ann.type === 'rect') {
                    const pdfW = (ann.width / editorCanvasRef.current.width) * width;
                    const pdfH = (ann.height / editorCanvasRef.current.height) * height;
                    page.drawRectangle({ x: pdfX - (pdfW / 2), y: pdfY - (pdfH / 2), width: pdfW, height: pdfH, borderColor: pdfColor, color: ann.fill ? pdfColor : undefined, opacity: ann.fill ? 0.3 : 1, borderWidth: 2 });
                } else if (ann.type === 'circle') {
                    const pdfSize = (ann.width / editorCanvasRef.current.width) * width;
                    page.drawCircle({ x: pdfX, y: pdfY, size: pdfSize / 2, borderColor: pdfColor, color: ann.fill ? pdfColor : undefined, opacity: ann.fill ? 0.3 : 1, borderWidth: 2 });
                } else if (ann.type === 'signature') {
                    const imageBytes = await fetch(ann.content).then(res => res.arrayBuffer());
                    const sigImage = await pdfDoc.embedPng(imageBytes);
                    const pdfW = (ann.width / editorCanvasRef.current.width) * width;
                    const pdfH = (ann.height / editorCanvasRef.current.height) * height;
                    page.drawImage(sigImage, { x: pdfX - (pdfW / 2), y: pdfY - (pdfH / 2), width: pdfW, height: pdfH });
                }
            }
            const pdfBytes = await pdfDoc.save();
            downloadBlob(pdfBytes, `edited_${editorFile.name}`, 'application/pdf');
            setEditorStatus('Saved successfully!');
        } catch (err) {
            console.error('Save error:', err);
            setEditorStatus('Error saving PDF.');
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const rotatePdf = async (idx) => {
        const file = pdfFiles[idx];
        setIsProcessingPdf(true);
        try {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);
            pdf.getPages().forEach(p => p.setRotation(degrees(p.getRotation().angle + 90)));
            downloadBlob(await pdf.save(), `rotated_${file.name}`, 'application/pdf');
        } catch (err) { console.error(err); } finally { setIsProcessingPdf(false); }
    };

    const splitPdf = async (idx) => {
        const file = pdfFiles[idx];
        setIsProcessingPdf(true);
        try {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);
            for (let i = 0; i < pdf.getPageCount(); i++) {
                const subPdf = await PDFDocument.create();
                const [cp] = await subPdf.copyPages(pdf, [i]);
                subPdf.addPage(cp);
                downloadBlob(await subPdf.save(), `${file.name.replace('.pdf','')}_page_${i+1}.pdf`, 'application/pdf');
                await new Promise(r => setTimeout(r, 300));
            }
        } catch (err) { console.error(err); } finally { setIsProcessingPdf(false); }
    };

    const downloadBlob = (data, fileName, mimeType) => {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    };

    const TABS = [
        { id: 'calculator', label: 'Calculator', icon: Calculator },
        { id: 'currency', label: 'Currency', icon: DollarSign },
        { id: 'unit', label: 'Unit', icon: Ruler },
        { id: 'pdf', label: 'PDF Tools', icon: Scissors },
        { id: 'editor', label: 'PDF Editor', icon: Edit }
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
            <div className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Repeat className="text-blue-500" size={32} /> Universal Converter
                            </h1>
                        </div>
                        {Array.isArray(EXTERNAL_LINKS[activeTab]) ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {EXTERNAL_LINKS[activeTab].map((link, idx) => (
                                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                        <ExternalLink size={12} /> {link.label}
                                    </a>
                                ))}
                            </div>
                        ) : EXTERNAL_LINKS[activeTab] && (
                            <a href={EXTERNAL_LINKS[activeTab].url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                <ExternalLink size={14} /> {EXTERNAL_LINKS[activeTab].label}
                            </a>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
                                    border: 'none', fontWeight: 600, cursor: 'pointer',
                                    background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                                    color: activeTab === tab.id ? '#fff' : '#64748b'
                                }}>
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '32px' }}>
                    {activeTab === 'calculator' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                            <div>
                                <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'right' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{calcFormula}</div>
                                    <div style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 700 }}>{calcDisplay}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {['C', 'DEL', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+'].map(btn => (
                                        <button key={btn} onClick={() => handleCalcPress(btn)} style={btnStyle(btn === 'DEL' || btn === 'C' ? 'secondary' : 'accent')}>{btn}</button>
                                    ))}
                                    <button onClick={() => handleCalcPress('0')} style={{ ...btnStyle('num'), gridColumn: 'span 2' }}>0</button>
                                    <button onClick={() => handleCalcPress('.')} style={btnStyle('num')}>.</button>
                                    <button onClick={() => handleCalcPress('=')} style={{ ...btnStyle('primary'), background: '#3b82f6' }}>=</button>
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Percentage Master</h3>
                                <div style={{ background: '#f0f9ff', borderRadius: '16px', padding: '20px', border: '1px solid #bae6fd' }}>
                                    <select value={percType} onChange={e => setPercType(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px' }}>
                                        <option value="of">Y% of X</option>
                                        <option value="add">Add Y% to X (GST)</option>
                                        <option value="sub">Sub Y% from X</option>
                                    </select>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <input type="number" value={percX} onChange={e => setPercX(e.target.value)} placeholder="X" style={{ padding: '10px', borderRadius: '8px' }} />
                                        <input type="number" value={percY} onChange={e => setPercY(e.target.value)} placeholder="Y%" style={{ padding: '10px', borderRadius: '8px' }} />
                                    </div>
                                    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>
                                        {calculatePercentage().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'currency' && (
                        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                            <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                                <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                AI-Optimized Live Market Rates (Updated Now)
                            </div>
                            <input type="number" value={currencyAmount} onChange={e => setCurrencyAmount(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1.1rem', textAlign: 'center' }} />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                                <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600 }}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <Repeat size={20} style={{ alignSelf: 'center', color: '#94a3b8' }} />
                                <select value={toCurrency} onChange={e => setToCurrency(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600 }}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', textShadow: '0 2px 4px rgba(59, 130, 246, 0.1)' }}>
                                {isFetchingRate ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        {(currencyAmount * (exchangeRate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} {toCurrency}
                                    </>
                                )}
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                                1 {fromCurrency} = {exchangeRate?.toFixed(4)} {toCurrency}
                            </div>
                        </div>
                    )}

                    {activeTab === 'unit' && (
                        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                {Object.keys(UNIT_CATEGORIES).map(cat => (
                                    <button key={cat} onClick={() => setUnitCategory(cat)} style={{ padding: '8px 16px', borderRadius: '8px', background: unitCategory === cat ? '#eff6ff' : 'transparent' }}>{cat}</button>
                                ))}
                            </div>
                            <input type="number" value={unitValue} onChange={e => setUnitValue(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '10px' }} />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} style={{ padding: '12px', borderRadius: '10px' }}>
                                    {UNIT_CATEGORIES[unitCategory].map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                                </select>
                                <select value={toUnit} onChange={e => setToUnit(e.target.value)} style={{ padding: '12px', borderRadius: '10px' }}>
                                    {UNIT_CATEGORIES[unitCategory].map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', marginTop: '24px' }}>
                                {convertUnits().toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'pdf' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <input type="file" multiple accept=".pdf" onChange={handlePdfUpload} id="p-up" style={{ display: 'none' }} />
                            <label htmlFor="p-up" style={{ display: 'block', padding: '40px', border: '2px dashed #e2e8f0', borderRadius: '16px', textAlign: 'center', cursor: 'pointer' }}>Add PDFs to Merge/Split</label>
                            {pdfFiles.length > 0 && (
                                <div style={{ marginTop: '24px' }}>
                                    {pdfFiles.map((f, i) => <div key={i} style={{ padding: '12px', background: '#fff', marginBottom: '8px', borderRadius: '8px' }}>{f.name}</div>)}
                                    <button onClick={mergePdfs} className="btn btn-primary" style={{ width: '100%' }}>Merge Documents</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                            {!editorFile ? (
                                <input type="file" accept=".pdf" onChange={e => e.target.files[0] && loadEditorPdf(e.target.files[0])} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {['select', 'text', 'rect', 'circle', 'signature'].map(t => (
                                                <button 
                                                    key={t} 
                                                    onClick={() => setCurrentTool(t)} 
                                                    style={{ 
                                                        padding: '8px 16px', 
                                                        background: currentTool === t ? '#fff' : 'transparent', 
                                                        border: currentTool === t ? '1px solid #e2e8f0' : '1px solid transparent',
                                                        boxShadow: currentTool === t ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer', 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: 600, 
                                                        color: currentTool === t ? '#3b82f6' : '#64748b',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={saveEditedPdf} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                                            <Save size={16} style={{ marginRight: '8px' }} />
                                            Save Changes
                                        </button>
                                    </div>
                                    <div style={{ background: '#94a3b8', padding: '20px', borderRadius: '16px', minHeight: '600px', position: 'relative', overflow: 'auto' }}>
                                        <div onClick={addAnnotation} style={{ position: 'relative', background: '#fff', display: 'inline-block' }}>
                                            <canvas ref={editorCanvasRef} />
                                            {annotations.filter(a => a.page === editorPageNum).map(ann => (
                                                <div key={ann.id}
                                                    onMouseDown={e => { if(currentTool==='select'){ e.stopPropagation(); setDraggingId(ann.id); setDragOffset({x: (e.clientX - editorCanvasRef.current.getBoundingClientRect().left) - ann.x, y: (e.clientY - editorCanvasRef.current.getBoundingClientRect().top) - ann.y}); }}}
                                                    style={{ position: 'absolute', left: ann.x - (ann.width/2), top: ann.y - (ann.height/2), cursor: 'move' }}>
                                                    {ann.type === 'text' && <div style={{ color: ann.color, fontWeight: 700 }}>{ann.content}</div>}
                                                    {ann.type === 'rect' && <div style={{ width: ann.width, height: ann.height, border: `2px solid ${ann.color}` }} />}
                                                    {ann.type === 'circle' && <div style={{ width: ann.width, height: ann.height, border: `2px solid ${ann.color}`, borderRadius: '50%' }} />}
                                                    {ann.type === 'signature' && <img src={ann.content} style={{ width: ann.width, height: ann.height }} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showSignatureModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', maxWidth: '500px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h3>Signature Manager</h3>
                            <button onClick={() => setShowSignatureModal(false)}>X</button>
                        </div>
                        <canvas id="signatureCanvas" width="440" height="200" style={{ border: '1px solid #e2e8f0', cursor: 'crosshair' }}
                            onMouseDown={e => { const c = e.target; const ctx = c.getContext('2d'); ctx.beginPath(); c.isD = true; const r = c.getBoundingClientRect(); ctx.moveTo(e.clientX-r.left, e.clientY-r.top); }}
                            onMouseMove={e => { if(!e.target.isD) return; const c = e.target; const ctx = c.getContext('2d'); const r = c.getBoundingClientRect(); ctx.lineTo(e.clientX-r.left, e.clientY-r.top); ctx.stroke(); }}
                            onMouseUp={e => e.target.isD = false}
                        />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => { const c = document.getElementById('signatureCanvas'); c.getContext('2d').clearRect(0,0,c.width,c.height); }} className="btn btn-secondary">Clear</button>
                            <button onClick={() => { const c = document.getElementById('signatureCanvas'); const d = c.toDataURL(); setSignatureImage(d); setSavedSignatures([d, ...savedSignatures]); setShowSignatureModal(false); }} className="btn btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                :root {
                    --glass-bg: rgba(255, 255, 255, 0.7);
                    --glass-border: rgba(255, 255, 255, 0.5);
                    --primary-gradient: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
                    --dark-gradient: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                }

                * { font-family: 'Inter', sans-serif; }

                .glass-panel { 
                    background: var(--glass-bg); 
                    backdrop-filter: blur(20px); 
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border);
                    border-radius: 24px; 
                    box-shadow: 0 12px 40px rgba(0,0,0,0.08); 
                }

                .btn { 
                    display: inline-flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 12px 24px; 
                    border-radius: 14px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    border: none; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-primary { 
                    background: var(--primary-gradient); 
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .btn-primary:hover { 
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
                }

                .btn-secondary { 
                    background: #fff; 
                    border: 1px solid #e2e8f0; 
                    color: #475569; 
                }
                .btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                }

                .calc-btn {
                    padding: 20px;
                    font-size: 1.25rem;
                    font-weight: 700;
                    border-radius: 16px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                }
                .calc-btn:hover { transform: scale(1.02); }
                .calc-btn:active { transform: scale(0.98); }

                .nav-tab {
                    position: relative;
                    transition: all 0.3s ease;
                }
                .nav-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 24px;
                    height: 4px;
                    background: #3b82f6;
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
}

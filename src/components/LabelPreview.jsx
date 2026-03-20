import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

const LabelPreview = React.forwardRef(({ items, labelType = 'qr' }, ref) => {
    return (
        <div ref={ref} className="print-labels-container" style={{
            padding: '10mm 5mm',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)', // Force 3 columns for standard A4/Letter label sheets
            gap: '2mm',
            background: '#fff',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {items.map((item, index) => (
                <div key={item.id || index} className="label-sticker" style={{
                    width: '100%', // Flexible width within the grid column
                    height: '25.4mm', // Still 1 inch height
                    border: '1px solid #ddd', // Slightly darker for better visibility on sheet
                    padding: '2mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    fontSize: '8pt',
                    overflow: 'hidden',
                    position: 'relative',
                    pageBreakInside: 'avoid',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '1mm', fontSize: '9pt', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                    </div>

                    {labelType === 'qr' ? (
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '4mm' }}>
                            <div style={{ background: '#fff', padding: '1mm' }}>
                                <QRCodeSVG
                                    value={item.barcode || item.id}
                                    size={50}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ color: '#666', fontSize: '7pt' }}>{item.type}</div>
                                <div style={{ fontWeight: '600', color: 'var(--accent)' }}>{item.barcode || 'N/A'}</div>
                                <div style={{ fontSize: '7pt', color: '#999' }}>CEL-RON HUB</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ transform: 'scale(0.8)', transformOrigin: 'center center' }}>
                                <Barcode
                                    value={item.barcode || item.id}
                                    width={1.2}
                                    height={35}
                                    fontSize={10}
                                    background="transparent"
                                    margin={0}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 4mm', marginTop: '-2mm' }}>
                                <span style={{ color: '#666', fontSize: '6.5pt' }}>{item.type}</span>
                                <span style={{ fontSize: '6.5pt', color: '#999' }}>CEL-RON HUB</span>
                            </div>
                        </div>
                    )}

                    <style>
                        {`
                        @media print {
                            .print-labels-container {
                                padding: 5mm !important;
                                display: grid !important;
                                grid-template-columns: repeat(3, 1fr) !important;
                                gap: 2mm !important;
                                width: 210mm !important; /* Standard A4 Width */
                                height: auto !important;
                            }
                            .label-sticker {
                                border: 0.1mm solid #ccc !important;
                            }
                            body { margin: 0; padding: 0; background: white; }
                        }
                        `}
                    </style>
                </div>
            ))}
        </div>
    );
});

export default LabelPreview;

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

const ScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Delay initialization slightly to ensure modal is rendered
            const timer = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        supportedScanTypes: [0] // Camera only for mobile efficiency
                    },
                    /* verbose= */ false
                );

                scanner.render((decodedText) => {
                    scanner.clear().then(() => {
                        onScanSuccess(decodedText);
                    }).catch(error => {
                        console.error("Failed to clear scanner", error);
                        onScanSuccess(decodedText);
                    });
                }, (error) => {
                    // console.error(error); // Keep console clean from common scan failures
                });

                scannerRef.current = scanner;
            }, 300);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    try {
                        scannerRef.current.clear();
                    } catch (e) {
                        // Ignore clear errors on unmount
                    }
                }
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '24px',
                position: 'relative',
                background: '#fff',
                borderRadius: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Camera size={24} color="var(--accent)" />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Mobile Scanner</h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}></div>

                <p style={{
                    textAlign: 'center',
                    marginTop: '16px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                }}>
                    Align the QR code within the frame to auto-scan
                </p>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        onClick={onClose}
                    >
                        Close Scanner
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerModal;

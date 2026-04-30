import html2pdf from 'html2pdf.js';

export const generateSleekPDF = async (documentData, settings, action = 'download') => {
    const {
        document_type = 'Workflow',
        document_no = 'Draft',
        issue_date,
        expiry_date,
        partners,
        contacts,
        vessels,
        work_locations,
        subject,
        salesperson_name,
        currency = 'SGD',
        items = [],
        subtotal = 0,
        tax_amount = 0,
        total_amount = 0,
        notes,
        terms_conditions
    } = documentData;

    const companyLogo = settings?.logo_url || 'https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif';
    const companyName = settings?.company_name || 'CELRON ENTERPRISES PTE LTD';
    const companyAddress = settings?.address || '10, Jln Besar, #03-05, Singapore 208787';
    const companyUen = settings?.gst_uen || '201436227C';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-';
    
    // Check if we should hide prices (for DO and PKL)
    const isDeliveryDoc = document_type?.toUpperCase().includes('DELIVERY') || document_type?.toUpperCase().includes('PACKING');

    const htmlContent = `
        <div style="padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; width: 210mm; min-height: 297mm; background: #fff; position: relative; padding-bottom: 100px; box-sizing: border-box;">
            <style>
                p { margin: 0 0 4px 0; }
                b, strong { font-weight: 700; color: #1e293b; }
                ul, ol { margin: 4px 0; padding-left: 20px; }
                li { margin-bottom: 2px; }
            </style>
            
            <!-- Company Header -->
            <div style="padding: 30px 50px 10px 50px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                   <img src="${companyLogo}" crossorigin="anonymous" style="height: 70px; object-fit: contain; margin-bottom: 10px;" />
                   <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${companyName}</div>
                   <div style="font-size: 11px; color: #1e3a8a; font-weight: 600; margin-top: 2px;">CR, GST & UEN : ${companyUen}</div>
                </div>
                <div style="text-align: right; color: #475569; font-size: 11px; max-width: 250px; line-height: 1.5;">
                    <div>${companyAddress}</div>
                </div>
            </div>

            <!-- Title & Vessel Banner -->
            <div style="margin-top: 5px; display: flex; justify-content: flex-end; position: relative;">
                <div style="background: #f1f5f9; padding: 12px 40px; border-radius: 40px 0 0 40px; min-width: 300px; text-align: right;">
                    <h1 style="margin: 0; font-size: 26px; color: #1e3a8a; font-weight: 600; letter-spacing: -0.5px;">${document_type} # ${document_no}</h1>
                    ${vessels ? `<div style="margin-top: 4px; font-size: 14px; font-weight: 500; color: #1e293b;">Vessel Name : <span style="font-weight: 400;">${vessels.vessel_name}</span></div>` : ''}
                </div>
            </div>

            <!-- Customer & Metadata Grid -->
            <div style="padding: 20px 50px 10px 50px;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">${partners?.name || 'Walk-in Customer'}</div>
                    <div style="font-size: 11px; color: #475569; line-height: 1.5; max-width: 350px; white-space: pre-wrap;">${partners?.address || ''}</div>
                    ${partners?.registration_no ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">GST No.: ${partners.registration_no}</div>` : ''}
                </div>

                <!-- Horizontal Grey Context Bar -->
                <div style="background: #f8fafc; border-radius: 10px; display: flex; padding: 12px 0; border: 1px solid #f1f5f9;">
                    <div style="flex: 1; padding: 0 20px; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">${document_type} Date</div>
                        <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 3px;">${formatDate(issue_date)}</div>
                    </div>
                    <div style="flex: 1; padding: 0 20px; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Expiration</div>
                        <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 3px;">${formatDate(expiry_date)}</div>
                    </div>
                    <div style="flex: 1.5; padding: 0 20px;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Salesperson</div>
                        <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 3px;">${(salesperson_name || 'N/A').toUpperCase()}</div>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div style="padding: 10px 50px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #1e3a8a; color: #fff;">
                            <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; width: ${isDeliveryDoc ? '80%' : '55%'};">Description</th>
                            <th style="padding: 10px 15px; text-align: center; font-size: 12px; font-weight: 600;">Quantity</th>
                            ${!isDeliveryDoc ? `
                                <th style="padding: 10px 15px; text-align: right; font-size: 12px; font-weight: 600;">Unit Price</th>
                                <th style="padding: 10px 15px; text-align: right; font-size: 12px; font-weight: 600;">Amount</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length > 0 ? items.map((item) => {
        if (item.is_section) {
            return `
                                    <tr style="background: #f1f5f9;">
                                        <td colspan="${isDeliveryDoc ? '2' : '3'}" style="padding: 8px 15px; font-size: 12px; font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #cbd5e1;">${item.description}</td>
                                        ${!isDeliveryDoc ? `
                                            <td style="padding: 8px 15px; text-align: right; font-size: 12px; font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #cbd5e1;">${(item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        ` : ''}
                                    </tr>
                                `;
        }
        if (item.is_note) {
            return `
                                    <tr>
                                        <td colspan="${isDeliveryDoc ? '2' : '4'}" style="padding: 6px 15px; font-size: 11px; color: #64748b; font-style: italic; border-bottom: 1px solid #cbd5e1;">${item.description}</td>
                                    </tr>
                                `;
        }
        return `
                                <tr>
                                    <td style="padding: 12px 15px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #cbd5e1;">
                                        <div style="font-weight: 500;">${item.description}</div>
                                        ${item.details ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4;">${item.details}</div>` : ''}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: center; font-size: 12px; color: #475569; border: 1px solid #cbd5e1; border-top: none; border-bottom: 1px solid #cbd5e1;">${(item.quantity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${item.uom || 'Units'}</td>
                                    ${!isDeliveryDoc ? `
                                        <td style="padding: 12px 15px; text-align: right; font-size: 12px; color: #475569; border: 1px solid #cbd5e1; border-top: none; border-bottom: 1px solid #cbd5e1;">${(item.unit_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #cbd5e1;">${currency === 'SGD' ? 'SGD ' : (currency || '$') + ' '}${(item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    ` : ''}
                                </tr>
                            `;
    }).join('') : `
                            <tr>
                                <td colspan="${isDeliveryDoc ? '2' : '4'}" style="padding: 40px; text-align: center; color: #94a3b8; font-style: italic; border-bottom: 1px solid #cbd5e1;">No items listed in this document</td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <!-- Totals Badge -->
                ${!isDeliveryDoc ? `
                    <div style="display: flex; justify-content: flex-end; margin-top: -1px;">
                        <div style="background: #1e3a8a; color: #fff; padding: 10px 20px; border-radius: 0 0 8px 8px; min-width: 150px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700;">
                            <span>Total</span>
                            <span style="margin-left: 20px;">${currency === 'USD' ? '$' : currency === 'SGD' ? 'SGD' : currency} ${(total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Notes & Terms -->
            <div style="padding: 10px 50px;">
                <div style="font-size: 11px; color: #1e293b; font-weight: 500; line-height: 1.6;">
                    ${notes ? `<div style="margin-bottom: 10px; white-space: pre-wrap;">${notes}</div>` : ''}
                    ${terms_conditions ? `<div style="margin-top: 10px;">Payment terms: ${terms_conditions}</div>` : ''}
                </div>
            </div>

            <!-- Bottom Content: Signatures & Checkout -->
            <div style="margin-top: 40px; padding: 0 50px; display: flex; gap: 40px; align-items: flex-end;">
                 <div style="flex: 1;">
                     ${(!isDeliveryDoc && settings?.paynow_url) ? `
                         <div style="text-align: center; border: 1px solid #f1f5f9; padding: 10px; border-radius: 8px; display: inline-block;">
                             <div style="font-size: 10px; font-weight: 700; color: #1e3a8a; margin-bottom: 5px;">PAYNOW</div>
                             <img src="${settings.paynow_url}" crossorigin="anonymous" style="width: 110px; height: 110px; object-fit: contain;" />
                         </div>
                     ` : ''}
                 </div>
                 
                 <div style="flex: 1; text-align: center;">
                    ${settings?.signature_url ? `<img src="${settings.signature_url}" crossorigin="anonymous" style="height: 60px; object-fit: contain; margin-bottom: 5px;" />` : `<div style="height: 60px;"></div>`}
                    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 11px; color: #475569; font-weight: 600;">Authorized Signature</div>
                 </div>
            </div>

            <!-- Global Footer -->
            <div style="position: absolute; bottom: 20px; left: 0; width: 100%; padding: 0 50px; box-sizing: border-box;">
                <div style="border-top: 1.5px solid #1e293b; display: flex; justify-content: space-between; padding-top: 8px; font-size: 11px; color: #1e293b;">
                    <div>${settings?.email || 'sales@celron.net'}</div>
                    <div style="font-weight: 600;">Page 1 / 1</div>
                </div>
            </div>

        </div>
    `;

    const container = document.createElement('div');
    container.id = `pdf-render-container-${Date.now()}`;
    container.innerHTML = htmlContent;

    // THE "SAFE POSITION" - Fixed, top left, invisible but rendered
    // Using opacity 1 but way off-screen to ensure html2canvas captures it correctly
    Object.assign(container.style, {
        position: 'fixed',
        left: '-5000px',
        top: '0',
        width: '210mm',
        backgroundColor: '#ffffff',
        zIndex: '99999',
        opacity: '1',
        pointerEvents: 'none',
        display: 'block'
    });

    document.body.appendChild(container);

    const opt = {
        margin: [0, 0, 0, 0],
        filename: `${document_no || 'Document'}_${(document_type || 'Workflow').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            letterRendering: true,
            logging: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };

    try {
        console.log("PDF: Initializing capture for", document_no);

        if (document.fonts) {
            await document.fonts.ready;
        }

        const waitForImages = () => {
            const imgs = container.getElementsByTagName('img');
            return Promise.all(Array.from(imgs).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
        };
        await waitForImages();

        // Extra stabilization delay
        await new Promise(r => setTimeout(r, 800));

        const pdfBlob = await html2pdf()
            .set(opt)
            .from(container)
            .output('blob');

        console.log("PDF: SUCCESS. Blob Size:", pdfBlob.size);

        if (pdfBlob.size < 1000) {
            throw new Error("Generated PDF is too small, likely empty.");
        }

        if (action === 'download') {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = opt.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            return;
        } else if (action === 'blob') {
            return pdfBlob;
        } else {
            return URL.createObjectURL(pdfBlob);
        }

    } catch (err) {
        console.error("CRITICAL PDF ERROR:", err);
        throw err;
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};

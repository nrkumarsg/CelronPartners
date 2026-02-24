import html2pdf from 'html2pdf.js';

export const generateSleekPDF = async (documentData, settings) => {
    const {
        document_type,
        document_no,
        issue_date,
        expiry_date,
        partners,
        contacts,
        vessels,
        work_locations,
        subject,
        customer_ref,
        salesperson_name,
        currency,
        items,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        terms_conditions
    } = documentData;

    const companyLogo = settings?.logo_url || 'https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif';
    const companyName = settings?.company_name || 'CELRON ENTERPRISES PTE LTD';
    const companyAddress = settings?.address || '10, Jln Besar, #03-05, Singapore 208787';
    const companyUen = settings?.gst_uen || '201436227C';
    const companyPhone = settings?.phone || '+65 6777 9900';
    const companyEmail = settings?.email || 'sales@celron.net';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-';

    const htmlContent = `
        <div style="padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; width: 210mm; min-height: 297mm; background: #fff; position: relative;">
            
            <!-- Sleek Header with Accent Color -->
            <div style="padding: 40px 50px 20px 50px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                   <img src="${companyLogo}" style="height: 60px; object-fit: contain; margin-bottom: 15px;" />
                   <div style="font-size: 14px; font-weight: 700; color: #1e3a8a; letter-spacing: 0.5px;">${companyName}</div>
                   <div style="font-size: 11px; color: #64748b; margin-top: 4px;">CR, GST & UEN : ${companyUen}</div>
                </div>
                <div style="text-align: right; color: #64748b; font-size: 11px;">
                    <div>${companyAddress}</div>
                </div>
            </div>

            <!-- Title Section with Unique Shape look (Simulated) -->
            <div style="margin-top: 10px; padding: 0 50px; display: flex; justify-content: flex-end; position: relative;">
                <div style="background: #f8fafc; padding: 20px 40px; border-radius: 40px 0 0 40px; border: 1px solid #f1f5f9; border-right: none; display: flex; align-items: center; gap: 20px; box-shadow: -10px 10px 20px rgba(0,0,0,0.02);">
                    <h1 style="margin: 0; font-size: 28px; color: #1e3a8a; font-weight: 600;">${document_type} # <span style="color: #3b82f6;">${document_no}</span></h1>
                </div>
            </div>

            <!-- Recipient & Meta Section -->
            <div style="padding: 30px 50px; display: flex; gap: 40px;">
                <div style="flex: 2;">
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Customer Information</div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e3a8a; margin-bottom: 4px;">${partners?.name || 'Walk-in Customer'}</div>
                    <div style="font-size: 12px; color: #475569; line-height: 1.6; max-width: 300px; white-space: pre-wrap;">${partners?.address || ''}</div>
                    ${contacts ? `<div style="font-size: 12px; color: #475569; margin-top: 4px;">Attn : ${contacts.name}</div>` : ''}
                    ${partners?.email1 ? `<div style="font-size: 12px; color: #475569;">Email: ${partners.email1}</div>` : ''}
                </div>
                
                <div style="flex: 1.5; display: flex; flex-direction: column; gap: 15px;">
                    <div style="background: #f8fafc; border-radius: 12px; padding: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                        <div>
                            <div style="color: #94a3b8; text-transform: uppercase;">${document_type} Date</div>
                            <div style="color: #1e293b; font-weight: 600; font-size: 12px; margin-top: 4px;">${formatDate(issue_date)}</div>
                        </div>
                        <div>
                            <div style="color: #94a3b8; text-transform: uppercase;">Expiration</div>
                            <div style="color: #1e293b; font-weight: 600; font-size: 12px; margin-top: 4px;">${formatDate(expiry_date)}</div>
                        </div>
                        <div style="grid-column: 1 / -1; margin-top: 5px;">
                            <div style="color: #94a3b8; text-transform: uppercase;">Salesperson</div>
                            <div style="color: #1e293b; font-weight: 600; font-size: 12px; margin-top: 4px;">${salesperson_name || '-'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Subject / Vessel Info -->
            ${(subject || vessels || work_locations) ? `
                <div style="margin: 0 50px 20px 50px; padding: 12px 20px; background: rgba(59, 130, 246, 0.03); border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <div style="font-size: 11px; color: #3b82f6; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Subject / Project</div>
                    <div style="font-size: 13px; font-weight: 600; color: #1e3a8a;">
                        ${subject ? `<span>${subject}</span>` : ''}
                        ${vessels ? `<span style="margin-left: 10px; color: #64748b;">(Vessel: ${vessels.vessel_name})</span>` : ''}
                        ${work_locations ? `<span style="margin-left: 10px; color: #64748b;">(Location: ${work_locations.location_name})</span>` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Items Table -->
            <div style="padding: 0 50px;">
                <table style="width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 8px 8px 0 0;">
                    <thead>
                        <tr style="background: #1e3a8a; color: #fff;">
                            <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 600; border: none; width: 50%;">Description</th>
                            <th style="padding: 12px 15px; text-align: center; font-size: 12px; font-weight: 600; border: none;">Quantity</th>
                            <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; border: none;">Unit Price</th>
                            <th style="padding: 12px 15px; text-align: center; font-size: 12px; font-weight: 600; border: none;">Taxes</th>
                            <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; border: none;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, idx) => {
        if (item.is_section) {
            return `
                                    <tr style="background: #f1f5f9;">
                                        <td colspan="4" style="padding: 10px 15px; font-size: 12px; font-weight: 700; color: #1e3a8a;">${item.description}</td>
                                        <td style="padding: 10px 15px; text-align: right; font-size: 12px; font-weight: 700; color: #1e3a8a;">${currency} ${item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                `;
        }
        if (item.is_note) {
            return `
                                    <tr>
                                        <td colspan="5" style="padding: 8px 15px; font-size: 11px; color: #64748b; font-style: italic; border-bottom: 1px solid #f1f5f9;">${item.description}</td>
                                    </tr>
                                `;
        }
        return `
                                <tr>
                                    <td style="padding: 15px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9;">
                                        <div style="font-weight: 500;">${item.description}</div>
                                        ${item.details ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">${item.details}</div>` : ''}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">${item.quantity?.toLocaleString()} ${item.uom || 'Units'}</td>
                                    <td style="padding: 15px; text-align: right; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">${item.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style="padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-bottom: 1px solid #f1f5f9;">${item.tax_rate}% SR</td>
                                    <td style="padding: 15px; text-align: right; font-size: 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">${item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Totals Section -->
            <div style="padding: 20px 50px; display: flex; justify-content: flex-end;">
                <div style="width: 280px; display: flex; flex-direction: column; gap: 0; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 15px; background: #fff; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 600;">Untaxed Amount</span>
                        <span style="color: #1e293b; font-weight: 600;">${currency} ${subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 15px; background: #f8fafc; font-size: 12px; border-top: 1px solid #f1f5f9;">
                        <span style="color: #64748b; font-weight: 600;">9% GST</span>
                        <span style="color: #1e293b; font-weight: 600;">${currency} ${tax_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px; background: #1e3a8a; color: #fff; font-size: 14px; font-weight: 700;">
                        <span>Total</span>
                        <span>${currency} ${total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <!-- Notes & Terms -->
            <div style="padding: 10px 50px; margin-top: 10px;">
                ${notes ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: #475569; line-height: 1.6; white-space: pre-wrap;">${notes}</div>
                    </div>
                ` : ''}
                ${terms_conditions ? `
                    <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                        <div style="font-weight: 700; text-transform: uppercase; margin-bottom: 5px;">Terms & Conditions</div>
                        <div style="line-height: 1.5;">${terms_conditions}</div>
                    </div>
                ` : ''}
            </div>

            <!-- Signature Section (Placeholder as per Odoo style) -->
            <div style="padding: 100px 50px 40px 50px; display: flex; justify-content: space-between; align-items: flex-end; position: absolute; bottom: 0; width: calc(100% - 100px);">
                <div style="border-top: 1px solid #cbd5e1; width: 200px; padding-top: 10px; font-size: 10px; color: #64748b; text-align: center;">Authorized Signature</div>
                <div style="color: #94a3b8; font-size: 10px;">Page 1 / 1</div>
                <div style="border-top: 1px solid #cbd5e1; width: 200px; padding-top: 10px; font-size: 10px; color: #64748b; text-align: center;">Customer Acceptance</div>
            </div>

        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    const opt = {
        margin: [0, 0, 0, 0],
        filename: `${document_no}_${document_type.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(container).save();
    } catch (err) {
        console.error("PDF Fail:", err);
    } finally {
        document.body.removeChild(container);
    }
};

import html2pdf from 'html2pdf.js';

export const generateDocumentPDF = async (job, documentType) => {
    // 1. Build the HTML template dynamically
    const customer = job.enquiries?.partners;
    const items = job.enquiries?.catalog_items || [];

    // Calculate total if applicable
    // In our simplified logic, for invoicing, we could just spread the items over an empty cost if prices aren't set,
    // or we just render the items list. Let's just render the items list for now as a boilerplate.

    const dateToday = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let htmlContent = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: #fff;">
            <!-- Header section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px;">
                <div style="flex: 1;">
                    <img src="https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif" alt="Logo" style="width: 120px; object-fit: contain; margin-bottom: 12px;" />
                    <h2 style="margin: 0; font-size: 18px; color: #1e3a8a;">CELRON ENTERPRISES PTE LTD</h2>
                    <p style="margin: 4px 0; font-size: 12px; color: #64748b;">GST Reg No / UEN: 201436227C</p>
                    <p style="margin: 4px 0; font-size: 12px; color: #64748b;">10, Jln Besar, #03-05, Singapore 208787</p>
                    <p style="margin: 4px 0; font-size: 12px; color: #64748b;">Phone: +65 6123 4567 | Email: sales@celron.net</p>
                </div>
                <div style="flex: 1; text-align: right;">
                    <h1 style="margin: 0; font-size: 32px; color: #1e3a8a; text-transform: uppercase;">${documentType}</h1>
                    <p style="margin: 4px 0; font-size: 14px; font-weight: bold;">Document No: ${job.job_no}</p>
                    <p style="margin: 4px 0; font-size: 14px;">Date: ${dateToday}</p>
                    <p style="margin: 4px 0; font-size: 14px;">Reference Enquiry: ${job.enquiries?.enquiry_no || 'N/A'}</p>
                </div>
            </div>

            <!-- Addresses Section -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                <div style="flex: 1; padding-right: 20px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase;">Deliver To / Bill To:</h3>
                    <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 16px;">${customer?.name || 'Walk-in Customer'}</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; white-space: pre-wrap;">${customer?.address || 'Street Unknown, City'}</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px;">Email: ${customer?.email1 || 'N/A'}</p>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: left; width: 5%;">#</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: left; width: 55%;">Item Description / Specification</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; width: 10%;">QTY</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; width: 15%;">Unit Price</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; width: 15%;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (items.length === 0) {
        htmlContent += `
            <tr>
                <td colspan="5" style="padding: 16px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">
                    No items mapped to this job.
                </td>
            </tr>
        `;
    } else {
        items.forEach((item, index) => {
            htmlContent += `
                <tr>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: left;">${index + 1}</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: left;">
                        <div style="font-weight: bold;">${item.name}</div>
                        <div style="font-size: 12px; color: #64748b;">${item.specification || 'N/A'} - ${item.type || 'N/A'}</div>
                    </td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">-</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">-</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">-</td>
                </tr>
            `;
        });
    }

    htmlContent += `
                </tbody>
            </table>

            <!-- Declarations & Signatures -->
            <div style="margin-top: 60px; font-size: 12px; color: #64748b; line-height: 1.5;">
                <p><strong>Declaration:</strong> We declare that this document shows the actual price of the goods described and that all particulars are true and correct.</p>
                ${documentType === 'Delivery Order' ? '<p>Received the above goods in good order and condition.</p>' : ''}
                
                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="width: 250px; text-align: center;">
                        <div style="border-bottom: 1px solid #333; height: 40px; margin-bottom: 8px;"></div>
                        <p style="margin: 0; font-weight: bold;">For Cel-Ron Enterprises Pte Ltd</p>
                        <p style="margin: 0;">Authorized Signature</p>
                    </div>
                    <div style="width: 250px; text-align: center;">
                        <div style="border-bottom: 1px solid #333; height: 40px; margin-bottom: 8px;"></div>
                        <p style="margin: 0; font-weight: bold;">Customer Official Chop & Sign</p>
                        <p style="margin: 0;">Date Received</p>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8;">
                Generated electronically by Celron Hub • ${new Date().toISOString()}
            </div>
        </div>
    `;

    // 2. Create an invisible container to hold the HTML
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 3. Configure html2pdf options
    const opt = {
        margin: 0.5,
        filename: `${documentType.replace(/\s+/g, '_')}_${job.job_no}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // 4. Generate and download
    try {
        await html2pdf().set(opt).from(container).save();
    } catch (err) {
        console.error("PDF Generation error:", err);
    } finally {
        // Cleanup DOM
        document.body.removeChild(container);
    }
};

const fs = require('fs');
let code = fs.readFileSync('src/pages/workflows/WorkflowEditor.jsx', 'utf8');

const target = `    const [formData, setFormData] = useState({
        document_type: (type || 'Enquiry').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        document_no: '',
        job_id: '',
        enquiry_id: '',
        issue_date: defaultIssue.toISOString().split('T')[0],
        expiry_date: defaultExpiry.toISOString().split('T')[0],
        partner_id: '',
        contact_id: '',
        vessel_id: '',
        work_location_id: '',
        salesperson_name: profile?.full_name || 'N.R.KUMAR',
        salesperson_phone: profile?.phone || '+6597685891',
        salesperson_email: profile?.professional_email || 'kumar@celron.net',`;

const replacement = `    // Form Data
    const [formData, setFormData] = useState(() => {
        const docType = (type || 'Enquiry').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const isAnithaDoc = ['Tax Invoice', 'Purchase Order', 'Delivery Order', 'Proforma Invoice', 'Packing List'].includes(docType);
        
        return {
        document_type: docType,
        document_no: '',
        job_id: '',
        enquiry_id: '',
        issue_date: defaultIssue.toISOString().split('T')[0],
        expiry_date: defaultExpiry.toISOString().split('T')[0],
        partner_id: '',
        contact_id: '',
        vessel_id: '',
        work_location_id: '',
        salesperson_name: isAnithaDoc ? 'ANITHA' : (profile?.full_name || 'N.R.KUMAR'),
        salesperson_phone: isAnithaDoc ? '+6591090347' : (profile?.phone || '+6597685891'),
        salesperson_email: isAnithaDoc ? 'accounts@celron.net' : (profile?.professional_email || 'kumar@celron.net'),`;

const targetNorm = target.replace(/\r\n/g, '\n');
code = code.replace(/\r\n/g, '\n');
code = code.replace(targetNorm, replacement);

// We must also replace the closing bracket for useState
code = code.replace(`        attachment_urls: [],
        delivery_verification: {}
    });`, `        attachment_urls: [],
        delivery_verification: {}
    });
    });`);

fs.writeFileSync('src/pages/workflows/WorkflowEditor.jsx', code);
console.log("Done");

const fs = require('fs');
let code = fs.readFileSync('src/pages/workflows/WorkflowEditor.jsx', 'utf8');

const target = `{contacts.map(c => {
                                        const pName = partners.find(p => p.id === c.partnerId)?.name;
                                        return <option key={c.id} value={c.id}>{c.name} {pName ? \`(\${pName})\` : ''}</option>;
                                    })}`;

const replacement = `{contacts
                                        .filter(c => !formData.partner_id || c.partnerId === formData.partner_id)
                                        .map(c => {
                                        const pName = partners.find(p => p.id === c.partnerId)?.name;
                                        return <option key={c.id} value={c.id}>{c.name} {pName ? \`(\${pName})\` : ''}</option>;
                                    })}`;

// Normalize line endings for replacement to work
const targetNormalized = target.replace(/\r\n/g, '\n');
code = code.replace(/\r\n/g, '\n');

if (code.includes(targetNormalized)) {
    code = code.replace(targetNormalized, replacement);
    fs.writeFileSync('src/pages/workflows/WorkflowEditor.jsx', code);
    console.log("Replaced successfully");
} else {
    console.log("Target not found");
}

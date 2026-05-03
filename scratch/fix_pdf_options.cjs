const fs = require('fs');
const path = 'c:/GoogleGravityDemo/CelronHub/src/pages/workflows/WorkflowEditor.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to be more flexible with whitespace/newlines
const targetRegex = /const element = printRef\.current;\s+const opt = \{\s+margin: 10,\s+filename: `\$\{formData\.document_type\}_\$\{formData\.document_no \|\| 'Draft'\}\.pdf`,\s+image: \{ type: 'jpeg', quality: 0\.98 \},\s+html2canvas: \{ scale: 2, useCORS: true, logging: false \},\s+jsPDF: \{ unit: 'mm', format: 'a4', orientation: 'portrait' \}\s+\};/;

const replacement = `const element = printRef.current;
            const opt = {
                margin: [5, 5, 5, 5], // Reduced margin to avoid overflow
                filename: \`\${formData.document_type}_\${formData.document_no || 'Draft'}.pdf\`,
                image: { type: 'jpeg', quality: 0.92 }, // Balanced quality for memory efficiency
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollY: 0,
                    windowWidth: 1000 // Force a consistent width for rendering
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(path, content);
    console.log('Success');
} else {
    console.log('Target not found with regex');
}

const fs = require('fs');
const content = fs.readFileSync('src/pages/PartnerForm.jsx', 'utf8');

let stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Very naive tag finder
    const tags = line.match(/<(div|form)|<\/(div|form)/g);
    if (tags) {
        tags.forEach(tag => {
            if (tag.startsWith('</')) {
                const closing = tag.slice(2);
                if (stack.length === 0) {
                    console.log(`Line ${i + 1}: Unexpected closing tag </${closing}>`);
                } else {
                    const opening = stack.pop();
                    if (opening.tag !== closing) {
                        console.log(`Line ${i + 1}: Mismatch! Closing </${closing}> but last opened was <${opening.tag}> from line ${opening.line}`);
                    }
                }
            } else {
                const opening = tag.slice(1);
                stack.push({ tag: opening, line: i + 1 });
            }
        });
    }
}

if (stack.length > 0) {
    console.log('Unclosed tags:');
    stack.forEach(s => console.log(`<${s.tag}> from line ${s.line}`));
}

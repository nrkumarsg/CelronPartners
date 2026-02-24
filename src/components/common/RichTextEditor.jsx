import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { uploadFile } from '../../lib/store';

/**
 * A sleek Rich Text Editor that automatically resizes and uploads images to Supabase Storage.
 */
export default function RichTextEditor({ value, onChange, placeholder, height = '200px' }) {
    const quillRef = useRef(null);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);

            // Insert placeholder/loading
            quill.insertText(range.index, 'Uploading image...', 'italic', true);

            try {
                // Upload to Supabase Storage (bucket: 'other-details')
                // We use resizeImage logic implicitly inside uploadFile if we pass options
                const publicUrl = await uploadFile('other-details', 'editor-content', file, {
                    maxWidth: 1200,
                    maxHeight: 1200
                });

                // Remove loading text
                quill.deleteText(range.index, 18);

                // Insert image
                quill.insertEmbed(range.index, 'image', publicUrl);
                quill.setSelection(range.index + 1);
            } catch (error) {
                console.error('Image upload failed:', error);
                quill.deleteText(range.index, 18);
                alert('Failed to upload image. Please try again.');
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), []);

    return (
        <div className="rich-text-editor-container" style={{ marginBottom: '16px' }}>
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                modules={modules}
                style={{ height }}
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                .rich-text-editor-container .ql-container {
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                    background: #fff;
                }
                .rich-text-editor-container .ql-toolbar {
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                    background: #f8fafc;
                }
                .rich-text-editor-container {
                    margin-bottom: 50px; /* Space for the editor content */
                }
            `}} />
        </div>
    );
}

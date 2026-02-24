import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Pin, StickyNote, History, Paperclip, X, Download, FileIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getNoteById, createNote, updateNote, deleteNote } from '../lib/notesService';
import { uploadFile } from '../lib/store';

export default function NoteForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const quillRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [note, setNote] = useState({
        title: '',
        content: '',
        is_pinned: false,
        attachments: [],
        tags: []
    });

    useEffect(() => {
        if (!isNew) {
            fetchNote();
        }
    }, [id]);

    const fetchNote = async () => {
        setLoading(true);
        const { data, error } = await getNoteById(id);
        if (data) setNote(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!note.title.trim()) {
            alert('Please enter a title');
            return;
        }

        setLoading(true);
        let result;
        if (isNew) {
            result = await createNote(note);
        } else {
            result = await updateNote(id, note);
        }

        if (result.data) {
            navigate('/notes');
        } else {
            alert('Error saving note');
        }
        setLoading(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Upload to a dedicated 'notes-attachments' bucket if it exists, or 'partners' as fallback
            const url = await uploadFile('company_assets', `notes/${id || 'temp'}`, file, { maxWidth: 1200 });
            const newAttachment = {
                name: file.name,
                url,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };
            setNote(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), newAttachment]
            }));
        } catch (error) {
            console.error('Upload failed:', error);
            alert(`Failed to upload file: ${error.message || 'Unknown Error'}`);
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (index) => {
        setNote(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleDelete = async () => {
        if (window.confirm('Delete this note?')) {
            const { error } = await deleteNote(id);
            if (!error) navigate('/notes');
        }
    };

    // Custom image handler to upload to Supabase instead of base64
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                setUploading(true);
                try {
                    const url = await uploadFile('company_assets', `notes/images/${id || 'temp'}`, file, { maxWidth: 1200 });
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', url);
                } catch (error) {
                    console.error('Image upload failed:', error);
                } finally {
                    setUploading(false);
                }
            }
        };
    };

    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image', 'blockquote', 'code-block'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        clipboard: {
            matchVisual: false,
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/notes')}
                        style={{ marginBottom: '16px' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Notes
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                            <StickyNote size={24} />
                        </div>
                        <h2 className="page-title">{isNew ? 'New Note' : 'Edit Note'}</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={`btn ${note.is_pinned ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setNote({ ...note, is_pinned: !note.is_pinned })}
                        title={note.is_pinned ? 'Pinned' : 'Pin Note'}
                    >
                        <Pin size={18} fill={note.is_pinned ? "currentColor" : "none"} />
                        <span className="hide-on-mobile">{note.is_pinned ? 'Pinned' : 'Pin'}</span>
                    </button>
                    {!isNew && (
                        <button className="btn btn-danger" onClick={handleDelete}>
                            <Trash2 size={18} />
                            <span className="hide-on-mobile">Delete</span>
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading || uploading}>
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{loading ? 'Saving...' : 'Save Note'}</span>
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '1.75rem', fontWeight: 700, border: 'none', padding: '0', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-primary)' }}
                        placeholder="Note Title"
                        value={note.title}
                        onChange={(e) => setNote({ ...note, title: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ minHeight: '500px' }}>
                    <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={note.content}
                        onChange={(content) => setNote({ ...note, content })}
                        modules={modules}
                        style={{ height: '450px', marginBottom: '50px' }}
                        placeholder="Write something brilliant... Links are auto-converted, and you can now add images!"
                    />
                </div>
            </div>

            {/* Attachments Section */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Paperclip size={18} color="#6366f1" />
                        Attachments ({note.attachments?.length || 0})
                    </h3>
                    <div>
                        <input
                            type="file"
                            id="note-file-upload"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={() => document.getElementById('note-file-upload').click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                            Upload File
                        </button>
                    </div>
                </div>

                {note.attachments && note.attachments.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {note.attachments.map((file, index) => (
                            <div key={index} style={{
                                padding: '12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ color: '#6366f1' }}>
                                    {file.type?.startsWith('image/') ? <ImageIcon size={20} /> : <FileIcon size={20} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {file.name}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => window.open(file.url, '_blank')}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                        title="Download/View"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <button
                                        onClick={() => removeAttachment(index)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                        title="Remove"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', py: '20px' }}>
                        No attachments yet. Upload documents or images related to this note.
                    </p>
                )}
            </div>

            {!isNew && (
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <History size={16} />
                    <span>Last updated: {new Date(note.updated_at).toLocaleString()}</span>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Paperclip, Loader2, Download, ExternalLink, 
    Trash2, FileText, Image as ImageIcon, 
    Link2, User, Clock, CheckCircle2, X, Plus, HardDrive
} from 'lucide-react';
import { getDocuments, addDocumentLink, deleteDocument } from '../../lib/workflowService';
import { uploadFileToDrive, getDirectImageUrl } from '../../lib/driveService';
import { useAuth } from '../../contexts/AuthContext';
import UploadOverlay from './UploadOverlay';

/**
 * CommunicationWall - A WhatsApp-style chronological log for notes and files.
 * Replaces the basic DocumentManager with a more interactive experience.
 */
export default function CommunicationWall({ referenceType, referenceId, folderId, title = "Project Diary & Documents" }) {
    const { profile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (profile?.company_id && referenceId) {
            fetchMessages();
        }
    }, [profile, referenceId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data } = await getDocuments(profile.company_id, referenceType, referenceId);
            if (data) {
                // Documents table currently stores 'name' and 'url'.
                // We'll treat 'name' as potentially including the message if no separate 'notes' field exists.
                // For a true "WhatsApp" feel, we might need to expand the schema later, 
                // but for now, we'll adapt to what we have.
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        setIsUploading(true);
        try {
            let fileUrl = '';
            let fileName = selectedFile ? selectedFile.name : '';

            // 1. Handle File Upload if present
            if (selectedFile) {
                const accessToken = localStorage.getItem('google_access_token');
                if (!accessToken) {
                    alert('Please connect Google Drive in Settings to upload files.');
                    setIsUploading(false);
                    return;
                }

                if (!folderId) {
                    alert('Target folder not ready. Please wait for Drive initialization.');
                    setIsUploading(false);
                    return;
                }

                const uploadRes = await uploadFileToDrive(accessToken, selectedFile, {
                    folderId: folderId,
                    onProgress: (p) => setUploadProgress(p)
                });
                fileUrl = uploadRes.webViewLink;
                setUploadLink(fileUrl);
            }

            // 2. Save to Database
            // We use the 'documents' table. If it's just a note, URL can be empty or a special value.
            await addDocumentLink({
                company_id: profile.company_id,
                reference_type: referenceType,
                reference_id: referenceId,
                name: newMessage || fileName || 'Note',
                url: fileUrl || '#'
            });

            // 3. Reset UI
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to save communication. Check your connection.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        try {
            await deleteDocument(id);
            fetchMessages();
        } catch (error) {
            alert('Failed to delete entry');
        }
    };

    const isImage = (url) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url.toLowerCase()) || url.includes('googleusercontent.com');

    return (
        <div style={{
            background: '#fff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
            overflow: 'hidden',
            marginTop: '24px'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #22c55e, #10b981)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                    }}>
                        <HardDrive size={20} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>{title}</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Connected to Google Drive</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {folderId && (
                        <a 
                            href={`https://drive.google.com/drive/folders/${folderId}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: '0.75rem', gap: '6px' }}
                        >
                            <ExternalLink size={14} /> Open Drive
                        </a>
                    )}
                </div>
            </div>

            {/* Message Area */}
            <div 
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    background: '#fcfdff'
                }}
            >
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#94a3b8' }}>
                        <Loader2 className="animate-spin" size={32} />
                        <p style={{ fontSize: '0.9rem' }}>Loading project history...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Link2 size={32} color="#cbd5e1" />
                        </div>
                        <h4 style={{ color: '#64748b', margin: '0 0 8px 0' }}>No history yet</h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '240px', margin: '0 auto' }}>
                            Start recording notes or uploading documents to see them here.
                        </p>
                    </div>
                ) : (
                    // Group messages by date
                    messages.slice().reverse().map((msg, idx) => {
                        const isNoteOnly = msg.url === '#' || !msg.url;
                        const hasFile = !isNoteOnly;
                        
                        return (
                            <div key={msg.id} style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignSelf: 'flex-start',
                                maxWidth: '85%'
                            }}>
                                <div style={{ 
                                    background: '#fff',
                                    padding: '12px 16px',
                                    borderRadius: '16px 16px 16px 4px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                                        <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                            {msg.name}
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(msg.id)}
                                            style={{ color: '#cbd5e1', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                            onMouseOver={(e) => e.target.style.color = '#ef4444'}
                                            onMouseOut={(e) => e.target.style.color = '#cbd5e1'}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {hasFile && (
                                        <div style={{ 
                                            marginTop: '12px', 
                                            padding: '10px', 
                                            background: '#f8fafc', 
                                            borderRadius: '12px',
                                            border: '1px solid #f1f5f9'
                                        }}>
                                            {isImage(msg.url) ? (
                                                <div style={{ borderRadius: '8px', overflow: 'hidden', display: 'block', maxWidth: '300px' }}>
                                                    <img src={getDirectImageUrl(msg.url)} alt="Attachment" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                                        <FileText size={20} color="#64748b" />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            Document Attachment
                                                        </p>
                                                        <a href={msg.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none' }}>
                                                            View in Cloud
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <CheckCircle2 size={12} color="#10b981" />
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', marginLeft: '4px' }}>
                                    {new Date(msg.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div style={{
                padding: '20px 24px',
                background: '#fff',
                borderTop: '1px solid #f1f5f9'
            }}>
                {selectedFile && (
                    <div style={{ 
                        background: '#f0fdf4', 
                        padding: '8px 12px', 
                        borderRadius: '10px', 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #dcfce7'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                            <Paperclip size={16} />
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                        </div>
                        <button 
                            onClick={() => setSelectedFile(null)}
                            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Paperclip size={20} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleFileSelect}
                    />

                    <div style={{ flex: 1, position: 'relative' }}>
                        <textarea 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a daily note or commercial update..."
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                fontSize: '0.95rem',
                                resize: 'none',
                                minHeight: '44px',
                                maxHeight: '120px',
                                background: '#f8fafc',
                                transition: 'all 0.2s'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isUploading || (!newMessage.trim() && !selectedFile)}
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: (isUploading || (!newMessage.trim() && !selectedFile)) ? '#cbd5e1' : '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#fff',
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>

            <UploadOverlay 
                isVisible={uploadProgress > 0 && uploadProgress < 100} 
                progress={uploadProgress} 
                title="Uploading attachment..."
            />
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { 
    Users, Search, UserPlus, Mail, Phone, Shield, 
    MoreHorizontal, Edit2, Trash2, X, Check,
    Building2, Briefcase, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../lib/userService';

const StaffDirectory = () => {
    const { profile: currentUserProfile } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        professional_email: '',
        phone: '',
        designation: '',
        role: 'user',
        status: 'active'
    });
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        const { data } = await getAllStaff();
        if (data) setStaff(data);
        setLoading(false);
    };

    const handleAddClick = () => {
        setModalType('add');
        setEditingStaff(null);
        setFormData({
            full_name: '',
            email: '',
            professional_email: '',
            phone: '',
            designation: '',
            role: 'user',
            status: 'active'
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (person) => {
        setModalType('edit');
        setEditingStaff(person);
        setFormData({
            full_name: person.full_name || '',
            email: person.email || '',
            professional_email: person.professional_email || '',
            phone: person.phone || '',
            designation: person.designation || '',
            role: person.role || 'user',
            status: person.status || 'active'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveLoading(true);
        
        try {
            if (modalType === 'edit') {
                const { error } = await updateStaff(editingStaff.id, formData);
                if (error) throw error;
            } else {
                const payload = { 
                    ...formData
                };
                const { error } = await createStaff(payload);
                if (error) throw error;
            }          
            setIsModalOpen(false);
            fetchStaff();
        } catch (error) {
            alert(`Failed to ${modalType} staff member: ` + error.message);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this staff member from the directory?")) return;
        
        const { error } = await deleteStaff(id);
        if (error) {
            alert("Failed to delete: " + error.message);
        } else {
            fetchStaff();
        }
    };

    const filteredStaff = staff.filter(person => 
        (person.full_name || person.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAdmin = currentUserProfile?.role === 'superadmin' || currentUserProfile?.role === 'admin';

    return (
        <div className="animate-fade-in" style={{ padding: '20px' }}>
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className="page-title">Staff Directory</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Manage organization personnel, professional contact info, and signatures.
                        </p>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary" onClick={handleAddClick}>
                            <UserPlus size={18} /> Add Staff Member
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div className="search-bar" style={{ maxWidth: '400px' }}>
                        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search by name, email or designation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Designation</th>
                                <th>Contact Details</th>
                                <th>System Role</th>
                                <th>Status</th>
                                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading directory...</td></tr>
                            ) : filteredStaff.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No staff members found.</td></tr>
                            ) : (
                                filteredStaff.map(person => (
                                    <tr key={person.id} className="table-row">
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    width: '40px', height: '40px', borderRadius: '12px', 
                                                    background: 'var(--bg-secondary)', display: 'flex', 
                                                    alignItems: 'center', justifyContent: 'center',
                                                    border: '1px solid var(--border-color)',
                                                    overflow: 'hidden'
                                                }}>
                                                    {person.avatar_url ? (
                                                        <img src={person.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <UserIcon size={20} color="var(--text-secondary)" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{person.full_name || 'Incomplete Profile'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{person.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Briefcase size={14} color="var(--accent)" />
                                                <span style={{ fontWeight: 500 }}>{person.designation || 'Staff Member'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {person.professional_email && (
                                                    <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Mail size={12} color="#64748b" /> {person.professional_email}
                                                    </div>
                                                )}
                                                {person.phone && (
                                                    <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Phone size={12} color="#64748b" /> {person.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                                                background: person.role === 'superadmin' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                                color: person.role === 'superadmin' ? '#4f46e5' : '#64748b',
                                                textTransform: 'uppercase'
                                            }}>
                                                <Shield size={12} /> {person.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                                                background: person.status === 'active' ? '#dcfce7' : '#fee2e2',
                                                color: person.status === 'active' ? '#15803d' : '#ef4444'
                                            }}>
                                                {person.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" onClick={() => handleEditClick(person)} title="Edit Profile">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="btn-icon" onClick={() => handleDelete(person.id)} style={{ color: '#ef4444' }} title="Delete Staff">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Staff Modal (Add/Edit) */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)'
                }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '32px', position: 'relative', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {modalType === 'edit' ? <Edit2 size={24} color="var(--accent)" /> : <UserPlus size={24} color="var(--accent)" />}
                            {modalType === 'edit' ? 'Edit Staff Member' : 'Add New Staff Member'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                            {modalType === 'edit' ? 'Update professional details and system permissions.' : 'Create a new professional profile for your team member.'}
                        </p>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    placeholder="e.g. Ramesh Kumar"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Login Email (Account)</label>
                                <input
                                    type="email"
                                    required={modalType === 'add'}
                                    className="form-input"
                                    placeholder="user@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    disabled={modalType === 'edit'}
                                />
                                {modalType === 'add' && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>This should match their signup email.</p>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Professional Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="kumar@celron.net"
                                        value={formData.professional_email}
                                        onChange={e => setFormData({ ...formData, professional_email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="+65 9768 6891"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Director / Sales Manager"
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">System Role</label>
                                    <select 
                                        className="form-select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        {currentUserProfile?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select 
                                        className="form-select"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saveLoading}>
                                    {saveLoading ? 'Saving...' : modalType === 'edit' ? 'Update Profile' : 'Add Staff Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDirectory;

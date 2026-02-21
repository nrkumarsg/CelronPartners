import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Shield, Disc, Check, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllProfiles, updateProfile } from '../lib/userService';

const ALL_MODULES = [
    { id: 'partners', label: 'Partners' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'vessels', label: 'Vessels' },
    { id: 'work-locations', label: 'Work Locations' },
    { id: 'catalog', label: 'Catalog' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
];

const UserManagement = () => {
    const { profile: currentUserProfile } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [saveStatus, setSaveStatus] = useState({ id: null, status: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await getAllProfiles();
        if (data) {
            // If the current user is an admin (but not superadmin), only show users from their company AND hide superadmins
            let filteredUserList = data;

            if (currentUserProfile?.role === 'admin') {
                filteredUserList = data.filter(u =>
                    u.company_id === currentUserProfile.company_id &&
                    u.role !== 'superadmin'
                );
            }
            setUsers(filteredUserList);
        }
        setLoading(false);
    };

    const handleUpdate = async (userId, field, value) => {
        setSaveStatus({ id: userId, status: 'saving' });

        const updates = { [field]: value };
        const { error } = await updateProfile(userId, updates);

        if (error) {
            console.error(error);
            setSaveStatus({ id: userId, status: 'error' });
            alert("Failed to update user.");
        } else {
            setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
            setSaveStatus({ id: userId, status: 'success' });
            setTimeout(() => setSaveStatus({ id: null, status: '' }), 2000);
        }
    };

    const handleModuleToggle = async (userId, moduleId, currentModules) => {
        const modules = currentModules || [];
        const isActive = modules.includes(moduleId);

        const newModules = isActive
            ? modules.filter(m => m !== moduleId)
            : [...modules, moduleId];

        await handleUpdate(userId, 'accessible_modules', newModules);
    };

    const isAdminOrSuper = currentUserProfile?.role === 'superadmin' || currentUserProfile?.role === 'admin';

    if (!isAdminOrSuper) {
        return <div>Access Denied</div>;
    }

    const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Control & Access</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Manage roles, permissions, and module access across your organization.
                    </p>
                </div>
            </div>

            <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div className="search-bar" style={{ maxWidth: '300px' }}>
                        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search users by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Module Access</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="table-row">
                                        <td className="font-medium">
                                            {user.email}
                                            {user.company && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {user.company.name}
                                                </div>
                                            )}
                                        </td>

                                        <td>
                                            <select
                                                className="form-select"
                                                style={{ width: '140px', padding: '6px 12px' }}
                                                value={user.role}
                                                onChange={(e) => handleUpdate(user.id, 'role', e.target.value)}
                                                disabled={user.role === 'superadmin' && currentUserProfile?.id !== user.id} // Don't let others demote superadmins
                                            >
                                                <option value="user">User</option>
                                                {currentUserProfile?.role === 'superadmin' && (
                                                    <option value="admin">Admin</option>
                                                )}
                                                {user.role === 'superadmin' && (
                                                    <option value="superadmin">Superadmin</option>
                                                )}
                                            </select>
                                        </td>

                                        <td>
                                            <select
                                                className="form-select"
                                                style={{
                                                    width: '120px', padding: '6px 12px',
                                                    color: user.status === 'active' ? '#15803d' : user.status === 'blocked' ? '#b91c1c' : '#b45309',
                                                    background: user.status === 'active' ? '#dcfce7' : user.status === 'blocked' ? '#fee2e2' : '#fef3c7',
                                                    borderColor: 'transparent'
                                                }}
                                                value={user.status}
                                                onChange={(e) => handleUpdate(user.id, 'status', e.target.value)}
                                                disabled={user.role === 'superadmin' && currentUserProfile?.id !== user.id}
                                            >
                                                <option value="active">Active</option>
                                                <option value="pending">Pending</option>
                                                <option value="blocked">Blocked</option>
                                            </select>
                                        </td>

                                        <td style={{ maxWidth: '300px' }}>
                                            {user.role === 'superadmin' ? (
                                                <span className="tag" style={{ background: '#dcfce7', color: '#15803d' }}>
                                                    <ShieldCheck size={14} /> Full Access Override
                                                </span>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {ALL_MODULES.map(mod => {
                                                        const isChecked = (user.accessible_modules || []).includes(mod.id);
                                                        return (
                                                            <button
                                                                key={mod.id}
                                                                onClick={() => handleModuleToggle(user.id, mod.id, user.accessible_modules)}
                                                                className="tag"
                                                                style={{
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    background: isChecked ? 'rgba(59, 130, 246, 0.15)' : '#f1f5f9',
                                                                    color: isChecked ? '#1d4ed8' : 'var(--text-secondary)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {isChecked && <Check size={12} />} {mod.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </td>

                                        <td style={{ width: '100px', textAlign: 'center' }}>
                                            {saveStatus.id === user.id && saveStatus.status === 'saving' && (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Saving...</span>
                                            )}
                                            {saveStatus.id === user.id && saveStatus.status === 'success' && (
                                                <span style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Check size={14} /> Saved
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;

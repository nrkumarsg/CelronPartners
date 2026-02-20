import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ArrowLeft, X, Plus } from 'lucide-react';
import { getPartners, savePartner } from '../lib/store';
import { getContactsByPartner, deleteContact } from '../lib/store';

const PARTNER_TYPES = ['Customer', 'Supplier', 'Customer Related', 'Supplier Related', 'Freelancer', 'Service Company'];

export default function PartnerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        types: [],
        others: '',
        name: '',
        address: '',
        country: '',
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
        weblink: '',
        info: '',
        customerCredit: '',
        supplierCredit: ''
    });

    const [typeInput, setTypeInput] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function load() {
            if (!isNew) {
                setLoading(true);
                const partners = await getPartners();
                const existing = partners.find(p => p.id === id);
                if (existing) {
                    setFormData(existing);
                }
                setLoading(false);
            }
        }
        load();
    }, [id, isNew]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditorChange = (content) => {
        setFormData(prev => ({ ...prev, info: content }));
    };

    const handleAddType = (e) => {
        if (e.target.value && !formData.types.includes(e.target.value)) {
            setFormData(prev => ({ ...prev, types: [...prev.types, e.target.value] }));
        }
        setTypeInput('');
    };

    const removeType = (typeToRemove) => {
        setFormData(prev => ({
            ...prev,
            types: prev.types.filter(t => t !== typeToRemove)
        }));
    };

    const isRelatedSelected = formData.types.some(t => t.includes('Related'));
    const isCustomerSelected = formData.types.includes('Customer');
    const isSupplierSelected = formData.types.includes('Supplier');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('Partner Name is required');

        setLoading(true);
        try {
            await savePartner({
                ...formData,
                id: isNew ? undefined : id
            });
            navigate('/partners');
        } catch (err) {
            console.error("SUPABASE SAVE ERROR:", err);
            alert("Error saving partner. Check console.");
            setLoading(false);
        }
    };

    if (loading && !isNew) return <div style={{ padding: '40px' }}>Loading partner data...</div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px' }}
                        onClick={() => navigate('/partners')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="page-title">{isNew ? 'New Partner' : 'Edit Partner'}</h2>
                </div>
                <div>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Partner'}
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label className="form-label">Partner Type (Multiselect)</label>
                        <div className="multi-select-container">
                            {formData.types.map(t => (
                                <div key={t} className="tag">
                                    {t}
                                    <span className="tag-remove" onClick={() => removeType(t)}>×</span>
                                </div>
                            ))}
                        </div>
                        <select
                            className="form-select"
                            value={typeInput}
                            onChange={handleAddType}
                            style={{ padding: '8px', maxWidth: '300px' }}
                        >
                            <option value="">Select a type to add...</option>
                            {PARTNER_TYPES.map(t => (
                                <option key={t} value={t} disabled={formData.types.includes(t)}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {isRelatedSelected && (
                        <div className="form-group animate-fade-in" style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                            <label className="form-label text-accent">Others (Related details)</label>
                            <input
                                type="text"
                                className="form-input"
                                name="others"
                                value={formData.others || ''}
                                onChange={handleChange}
                                placeholder="Specify relationship details..."
                            />
                        </div>
                    )}

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Partner Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Country</label>
                            <select
                                className="form-select"
                                name="country"
                                value={formData.country || ''}
                                onChange={handleChange}
                            >
                                <option value="">Select Country...</option>
                                <option value="Afghanistan">Afghanistan</option>
                                <option value="Albania">Albania</option>
                                <option value="Algeria">Algeria</option>
                                <option value="Andorra">Andorra</option>
                                <option value="Angola">Angola</option>
                                <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                                <option value="Argentina">Argentina</option>
                                <option value="Armenia">Armenia</option>
                                <option value="Australia">Australia</option>
                                <option value="Austria">Austria</option>
                                <option value="Azerbaijan">Azerbaijan</option>
                                <option value="Bahamas">Bahamas</option>
                                <option value="Bahrain">Bahrain</option>
                                <option value="Bangladesh">Bangladesh</option>
                                <option value="Barbados">Barbados</option>
                                <option value="Belarus">Belarus</option>
                                <option value="Belgium">Belgium</option>
                                <option value="Belize">Belize</option>
                                <option value="Benin">Benin</option>
                                <option value="Bhutan">Bhutan</option>
                                <option value="Bolivia">Bolivia</option>
                                <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                                <option value="Botswana">Botswana</option>
                                <option value="Brazil">Brazil</option>
                                <option value="Brunei">Brunei</option>
                                <option value="Bulgaria">Bulgaria</option>
                                <option value="Burkina Faso">Burkina Faso</option>
                                <option value="Burundi">Burundi</option>
                                <option value="Cabo Verde">Cabo Verde</option>
                                <option value="Cambodia">Cambodia</option>
                                <option value="Cameroon">Cameroon</option>
                                <option value="Canada">Canada</option>
                                <option value="Central African Republic">Central African Republic</option>
                                <option value="Chad">Chad</option>
                                <option value="Chile">Chile</option>
                                <option value="China">China</option>
                                <option value="Colombia">Colombia</option>
                                <option value="Comoros">Comoros</option>
                                <option value="Congo (Brazzaville)">Congo (Brazzaville)</option>
                                <option value="Congo (Kinshasa)">Congo (Kinshasa)</option>
                                <option value="Costa Rica">Costa Rica</option>
                                <option value="Croatia">Croatia</option>
                                <option value="Cuba">Cuba</option>
                                <option value="Cyprus">Cyprus</option>
                                <option value="Czechia">Czechia</option>
                                <option value="Denmark">Denmark</option>
                                <option value="Djibouti">Djibouti</option>
                                <option value="Dominica">Dominica</option>
                                <option value="Dominican Republic">Dominican Republic</option>
                                <option value="Ecuador">Ecuador</option>
                                <option value="Egypt">Egypt</option>
                                <option value="El Salvador">El Salvador</option>
                                <option value="Equatorial Guinea">Equatorial Guinea</option>
                                <option value="Eritrea">Eritrea</option>
                                <option value="Estonia">Estonia</option>
                                <option value="Eswatini">Eswatini</option>
                                <option value="Ethiopia">Ethiopia</option>
                                <option value="Fiji">Fiji</option>
                                <option value="Finland">Finland</option>
                                <option value="France">France</option>
                                <option value="Gabon">Gabon</option>
                                <option value="Gambia">Gambia</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Germany">Germany</option>
                                <option value="Ghana">Ghana</option>
                                <option value="Greece">Greece</option>
                                <option value="Grenada">Grenada</option>
                                <option value="Guatemala">Guatemala</option>
                                <option value="Guinea">Guinea</option>
                                <option value="Guinea-Bissau">Guinea-Bissau</option>
                                <option value="Guyana">Guyana</option>
                                <option value="Haiti">Haiti</option>
                                <option value="Honduras">Honduras</option>
                                <option value="Hungary">Hungary</option>
                                <option value="Iceland">Iceland</option>
                                <option value="India">India</option>
                                <option value="Indonesia">Indonesia</option>
                                <option value="Iran">Iran</option>
                                <option value="Iraq">Iraq</option>
                                <option value="Ireland">Ireland</option>
                                <option value="Israel">Israel</option>
                                <option value="Italy">Italy</option>
                                <option value="Jamaica">Jamaica</option>
                                <option value="Japan">Japan</option>
                                <option value="Jordan">Jordan</option>
                                <option value="Kazakhstan">Kazakhstan</option>
                                <option value="Kenya">Kenya</option>
                                <option value="Kiribati">Kiribati</option>
                                <option value="Korea, North">Korea, North</option>
                                <option value="Korea, South">Korea, South</option>
                                <option value="Kosovo">Kosovo</option>
                                <option value="Kuwait">Kuwait</option>
                                <option value="Kyrgyzstan">Kyrgyzstan</option>
                                <option value="Laos">Laos</option>
                                <option value="Latvia">Latvia</option>
                                <option value="Lebanon">Lebanon</option>
                                <option value="Lesotho">Lesotho</option>
                                <option value="Liberia">Liberia</option>
                                <option value="Libya">Libya</option>
                                <option value="Liechtenstein">Liechtenstein</option>
                                <option value="Lithuania">Lithuania</option>
                                <option value="Luxembourg">Luxembourg</option>
                                <option value="Madagascar">Madagascar</option>
                                <option value="Malawi">Malawi</option>
                                <option value="Malaysia">Malaysia</option>
                                <option value="Maldives">Maldives</option>
                                <option value="Mali">Mali</option>
                                <option value="Malta">Malta</option>
                                <option value="Marshall Islands">Marshall Islands</option>
                                <option value="Mauritania">Mauritania</option>
                                <option value="Mauritius">Mauritius</option>
                                <option value="Mexico">Mexico</option>
                                <option value="Micronesia">Micronesia</option>
                                <option value="Moldova">Moldova</option>
                                <option value="Monaco">Monaco</option>
                                <option value="Mongolia">Mongolia</option>
                                <option value="Montenegro">Montenegro</option>
                                <option value="Morocco">Morocco</option>
                                <option value="Mozambique">Mozambique</option>
                                <option value="Myanmar">Myanmar</option>
                                <option value="Namibia">Namibia</option>
                                <option value="Nauru">Nauru</option>
                                <option value="Nepal">Nepal</option>
                                <option value="Netherlands">Netherlands</option>
                                <option value="New Zealand">New Zealand</option>
                                <option value="Nicaragua">Nicaragua</option>
                                <option value="Niger">Niger</option>
                                <option value="Nigeria">Nigeria</option>
                                <option value="North Macedonia">North Macedonia</option>
                                <option value="Norway">Norway</option>
                                <option value="Oman">Oman</option>
                                <option value="Pakistan">Pakistan</option>
                                <option value="Palau">Palau</option>
                                <option value="Palestine">Palestine</option>
                                <option value="Panama">Panama</option>
                                <option value="Papua New Guinea">Papua New Guinea</option>
                                <option value="Paraguay">Paraguay</option>
                                <option value="Peru">Peru</option>
                                <option value="Philippines">Philippines</option>
                                <option value="Poland">Poland</option>
                                <option value="Portugal">Portugal</option>
                                <option value="Qatar">Qatar</option>
                                <option value="Romania">Romania</option>
                                <option value="Russia">Russia</option>
                                <option value="Rwanda">Rwanda</option>
                                <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                                <option value="Saint Lucia">Saint Lucia</option>
                                <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                                <option value="Samoa">Samoa</option>
                                <option value="San Marino">San Marino</option>
                                <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                                <option value="Saudi Arabia">Saudi Arabia</option>
                                <option value="Senegal">Senegal</option>
                                <option value="Serbia">Serbia</option>
                                <option value="Seychelles">Seychelles</option>
                                <option value="Sierra Leone">Sierra Leone</option>
                                <option value="Singapore">Singapore</option>
                                <option value="Slovakia">Slovakia</option>
                                <option value="Slovenia">Slovenia</option>
                                <option value="Solomon Islands">Solomon Islands</option>
                                <option value="Somalia">Somalia</option>
                                <option value="South Africa">South Africa</option>
                                <option value="South Sudan">South Sudan</option>
                                <option value="Spain">Spain</option>
                                <option value="Sri Lanka">Sri Lanka</option>
                                <option value="Sudan">Sudan</option>
                                <option value="Suriname">Suriname</option>
                                <option value="Sweden">Sweden</option>
                                <option value="Switzerland">Switzerland</option>
                                <option value="Syria">Syria</option>
                                <option value="Taiwan">Taiwan</option>
                                <option value="Tajikistan">Tajikistan</option>
                                <option value="Tanzania">Tanzania</option>
                                <option value="Thailand">Thailand</option>
                                <option value="Timor-Leste">Timor-Leste</option>
                                <option value="Togo">Togo</option>
                                <option value="Tonga">Tonga</option>
                                <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                                <option value="Tunisia">Tunisia</option>
                                <option value="Turkey">Turkey</option>
                                <option value="Turkmenistan">Turkmenistan</option>
                                <option value="Tuvalu">Tuvalu</option>
                                <option value="Uganda">Uganda</option>
                                <option value="Ukraine">Ukraine</option>
                                <option value="United Arab Emirates">United Arab Emirates</option>
                                <option value="United Kingdom">United Kingdom</option>
                                <option value="United States">United States</option>
                                <option value="Uruguay">Uruguay</option>
                                <option value="Uzbekistan">Uzbekistan</option>
                                <option value="Vanuatu">Vanuatu</option>
                                <option value="Vatican City">Vatican City</option>
                                <option value="Venezuela">Venezuela</option>
                                <option value="Vietnam">Vietnam</option>
                                <option value="Yemen">Yemen</option>
                                <option value="Zambia">Zambia</option>
                                <option value="Zimbabwe">Zimbabwe</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-textarea"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Email 1</label>
                            <input type="email" className="form-input" name="email1" value={formData.email1 || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email 2</label>
                            <input type="email" className="form-input" name="email2" value={formData.email2 || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone 1</label>
                            <input type="tel" className="form-input" name="phone1" value={formData.phone1 || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone 2</label>
                            <input type="tel" className="form-input" name="phone2" value={formData.phone2 || ''} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weblink (URL)</label>
                        <input
                            type="url"
                            className="form-input"
                            name="weblink"
                            value={formData.weblink || ''}
                            onChange={handleChange}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="grid-2">
                        {isCustomerSelected && (
                            <div className="form-group animate-fade-in">
                                <label className="form-label">Customer Credit Period (Days)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    name="customerCredit"
                                    value={formData.customerCredit || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        )}

                        {isSupplierSelected && (
                            <div className="form-group animate-fade-in">
                                <label className="form-label">Supplier Credit Period (Days)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    name="supplierCredit"
                                    value={formData.supplierCredit || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginTop: '24px' }}>
                        <label className="form-label">Other Information</label>
                        <ReactQuill
                            theme="snow"
                            value={formData.info || ''}
                            onChange={handleEditorChange}
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ]
                            }}
                        />
                    </div>
                </form>
            </div>

            {!isNew && (
                <div style={{ marginTop: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3>Related Contacts</h3>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/contacts/new?partnerId=${id}`)}
                        >
                            <Plus size={16} /> Add Contact
                        </button>
                    </div>
                    <ContactsList partnerId={id} />
                </div>
            )}

        </div>
    );
}

// Sub-component to list contacts inline for a partner
function ContactsList({ partnerId }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadContacts();
    }, [partnerId]);

    const loadContacts = async () => {
        setLoading(true);
        setContacts(await getContactsByPartner(partnerId));
        setLoading(false);
    };

    const remove = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteContact(id);
            loadContacts();
        }
    };

    if (loading) return <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
    if (contacts.length === 0) return <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>No contacts found.</div>;

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Contact Name</th>
                        <th>Post</th>
                        <th>Email / Phone</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contacts.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontWeight: '500' }}>{c.name}</td>
                            <td>{c.post || '-'}</td>
                            <td>
                                <div>{c.email || '-'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>HP: {c.handphone || '-'}</div>
                            </td>
                            <td>
                                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.85rem', marginRight: '8px' }} onClick={() => navigate(`/contacts/${c.id}?partnerId=${partnerId}`)}>Edit</button>
                                <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.85rem' }} onClick={() => remove(c.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

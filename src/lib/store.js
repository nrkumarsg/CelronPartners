import { supabase } from './supabase';

export const getPartners = async (profile = null) => {
  let query = supabase.from('partners').select('*').order('created_at', { ascending: false });

  // If we have a profile with a company_id, enforce isolation
  if (profile?.company_id) {
    query = query.eq('company_id', profile.company_id);
  } else if (profile && profile.role !== 'superadmin') {
    // If not superadmin but missing company_id, pull nothing for safety
    query = query.eq('company_id', '00000000-0000-0000-0000-000000000000');
  }

  const { data, error } = await query;
  if (error) console.error('Error fetching partners:', error);
  return data || [];
};

export const savePartner = async (partnerData) => {
  const isExisting = !!partnerData.id;
  const payload = { ...partnerData };
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.created_at;
  delete payload.updated_at;

  // Fix empty strings for integer columns in Supabase
  if (payload.customerCredit === '') payload.customerCredit = null;
  if (payload.supplierCredit === '') payload.supplierCredit = null;

  if (isExisting) {
    const { data, error } = await supabase.from('partners').update(payload).eq('id', payload.id).select();
    if (error) {
      console.error(error);
      throw error;
    }
    return data[0];
  } else {
    delete payload.id; // Allow Supabase to auto-generate UUID
    const { data, error } = await supabase.from('partners').insert([payload]).select();
    if (error) {
      console.error(error);
      throw error;
    }
    return data[0];
  }
};

export const deletePartner = async (id) => {
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) console.error('Error deleting partner:', error);
  // Contacts cascade delete based on Supabase schema definition
};

export const getContacts = async () => {
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) console.error('Error fetching contacts:', error);
  return data || [];
};

export const getContactsByPartner = async (partnerId) => {
  const { data, error } = await supabase.from('contacts').select('*').eq('partnerId', partnerId);
  if (error) console.error('Error fetching contacts by partner:', error);
  return data || [];
};

export const saveContact = async (contactData) => {
  const isExisting = !!contactData.id;
  const payload = { ...contactData };
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.created_at;
  delete payload.updated_at;

  if (isExisting) {
    const { data, error } = await supabase.from('contacts').update(payload).eq('id', payload.id).select();
    if (error) throw error;
    return data[0];
  } else {
    delete payload.id; // Allow Supabase to auto-generate UUID
    const { data, error } = await supabase.from('contacts').insert([payload]).select();
    if (error) throw error;
    return data[0];
  }
};

export const deleteContact = async (id) => {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) console.error('Error deleting contact:', error);
};

// --- Categories ---
export const getCategories = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
};

export const saveCategory = async (payload) => {
  const isExisting = !!payload.id;
  const dataToSave = { ...payload };
  delete dataToSave.created_at;

  if (isExisting) {
    const { data, error } = await supabase.from('categories').update(dataToSave).eq('id', payload.id).select();
    if (error) throw error;
    return data[0];
  } else {
    delete dataToSave.id;
    const { data, error } = await supabase.from('categories').insert([dataToSave]).select();
    if (error) throw error;
    return data[0];
  }
};

export const deleteCategory = async (id) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) console.error('Error deleting category:', error);
};

// --- Brands ---
export const getBrands = async () => {
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) console.error('Error fetching brands:', error);
  return data || [];
};

export const saveBrand = async (payload) => {
  const isExisting = !!payload.id;
  const dataToSave = { ...payload };
  delete dataToSave.created_at;

  if (isExisting) {
    const { data, error } = await supabase.from('brands').update(dataToSave).eq('id', payload.id).select();
    if (error) throw error;
    return data[0];
  } else {
    delete dataToSave.id;
    const { data, error } = await supabase.from('brands').insert([dataToSave]).select();
    if (error) throw error;
    return data[0];
  }
};

export const deleteBrand = async (id) => {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) console.error('Error deleting brand:', error);
};

// --- Document Settings ---
export const getDocumentSettings = async () => {
  const { data, error } = await supabase.from('document_settings').select('*').limit(1).single();
  if (error && error.code !== 'PGRST116') console.error('Error fetching settings:', error);
  return data || null;
};

export const saveDocumentSettings = async (payload) => {
  const isExisting = !!payload.id;
  const dataToSave = { ...payload };
  delete dataToSave.created_at;

  if (isExisting) {
    const { data, error } = await supabase.from('document_settings').update(dataToSave).eq('id', payload.id).select();
    if (error) throw error;
    return data[0];
  } else {
    delete dataToSave.id;
    const { data, error } = await supabase.from('document_settings').insert([dataToSave]).select();
    if (error) throw error;
    return data[0];
  }
};

// --- Storage / File Uploads ---
export const uploadFile = async (bucket, folderPath, file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};


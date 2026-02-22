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

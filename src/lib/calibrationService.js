import { supabase } from './supabase';

// Instrument Library
export const getInstruments = async () => {
    const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name', { ascending: true });
    return { data, error };
};

export const createInstrument = async (instrumentData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    const { data, error } = await supabase.from('instruments').insert([{
        ...instrumentData,
        company_id: profile.company_id
    }]).select().single();
    return { data, error };
};

export const updateInstrument = async (id, updates) => {
    return await supabase
        .from('instruments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
};

export const deleteInstrument = async (id) => {
    return await supabase
        .from('instruments')
        .delete()
        .eq('id', id);
};

// Enhanced Calibration Records with Items
export const getCalibrationRecords = async () => {
    const { data, error } = await supabase
        .from('calibration_records')
        .select(`
            *,
            vessel:vessels(vessel_name),
            job:jobs(job_no),
            customer:partners(name),
            items:calibration_items(*)
        `)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const createCalibrationRecord = async (recordData, items = []) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    // 1. Create the header record
    const { data: record, error: recordError } = await supabase.from('calibration_records').insert([{
        ...recordData,
        user_id: user.id,
        company_id: profile.company_id
    }]).select().single();

    if (recordError) return { error: recordError };

    // 2. Create the associated items
    if (items.length > 0) {
        const itemsWithId = items.map(item => ({
            ...item,
            calibration_id: record.id
        }));
        const { error: itemsError } = await supabase.from('calibration_items').insert(itemsWithId);
        if (itemsError) return { record, error: itemsError };
    }

    return { data: record, error: null };
};

export const getCalibrationItems = async (calibrationId) => {
    return await supabase
        .from('calibration_items')
        .select('*')
        .eq('calibration_id', calibrationId);
};

export const getPartners = async () => {
    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .contains('types', ['Customer'])
        .order('name', { ascending: true });
    return { data, error };
};

export const updateCalibrationRecord = async (id, recordData, items = []) => {
    // 1. Update header
    const { data: record, error: recordError } = await supabase
        .from('calibration_records')
        .update(recordData)
        .eq('id', id)
        .select()
        .single();

    if (recordError) return { error: recordError };

    // 2. Update items (simplest approach: delete and re-insert)
    if (items.length > 0) {
        await supabase.from('calibration_items').delete().eq('calibration_id', id);

        const itemsWithId = items.map(item => ({
            ...item,
            calibration_id: id
        }));
        const { error: itemsError } = await supabase.from('calibration_items').insert(itemsWithId);
        if (itemsError) return { record, error: itemsError };
    }

    return { data: record, error: null };
};

export const deleteCalibrationRecord = async (id) => {
    // Items will be deleted automatically if CASCADE is set, 
    // but we'll do it explicitly if needed or rely on DB.
    // For now, let's just delete the record.
    return await supabase
        .from('calibration_records')
        .delete()
        .eq('id', id);
};

export const archiveOldRecords = async () => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data, error } = await supabase
        .from('calibration_records')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .lt('calibration_date', threeYearsAgo.toISOString().split('T')[0])
        .eq('is_archived', false)
        .select();

    return { data, error };
};
export const getInstrumentHistory = async (instrumentId) => {
    // Fetch all calibration items where this instrument was used, 
    // joining with the parent record for date and certificate context.
    const { data, error } = await supabase
        .from('calibration_items')
        .select(`
            id,
            standard_reading,
            actual_reading,
            result,
            record:calibration_records (
                id,
                calibration_date,
                due_date,
                job_no,
                vessel:vessels(vessel_name)
            )
        `)
        .eq('instrument_id', instrumentId)
        .order('id', { ascending: false }); // Roughly chronological if UUIDs are sequential or use record date

    // Sort by actual calibration date
    const sortedData = data?.sort((a, b) =>
        new Date(b.record.calibration_date) - new Date(a.record.calibration_date)
    );

    return { data: sortedData, error };
};

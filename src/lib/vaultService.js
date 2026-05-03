/**
 * vaultService.js
 * Handles Corporate Vault logic: year-wise organization, structure mirroring, and shortcuts.
 */
import { getOrCreateFolder, listFolderContent, uploadFileToDrive, deleteFile, checkFileExists } from './driveService';
import { getDocumentSettings, saveDocumentSettings } from './store';

/**
 * Initializes the Tiered Vault structure in Google Drive.
 * Hierarchy: [Configured Root] -> CELRON -> [01..99 Tiered Categorization]
 */
export const initializeVault = async (accessToken, companyId) => {
    const settings = await getDocumentSettings(companyId);
    let topRootId = settings?.google_drive_folder_id;
    if (!topRootId) {
        throw new Error('Google Drive Root Folder ID (CELRON ROOT) not configured in Settings.');
    }

    // Extract ID if a URL was provided
    if (topRootId.includes('drive.google.com')) {
        const match = topRootId.match(/\/folders\/([a-zA-Z0-9_-]+)/) || topRootId.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) topRootId = match[1];
    }

    const currentYear = new Date().getFullYear();
    const currentYearName = `YEAR${currentYear}`;
    const cacheKey = `${companyId}_${currentYear}`;

    // 0. Use in-memory cache for fast session lookup
    if (vaultCache[cacheKey] && (Date.now() - vaultCache[cacheKey].timestamp < 300000)) {
        return vaultCache[cacheKey];
    }

    // 1. Ensure "CELRON" consolidated folder exists under Settings Root
    let celronRootId = settings?.gdrive_celron_root_id;
    
    // Fetch info about topRootId to check its name
    const rootInfoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${topRootId}?fields=name`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const rootInfo = await rootInfoRes.json();
    const isAlreadyCelron = rootInfo?.name?.toUpperCase() === 'CELRON';

    if (isAlreadyCelron) {
        // If the configured root IS already CELRON, use it as the consolidated root
        celronRootId = topRootId;
    } else if (!celronRootId || !(await checkFileExists(accessToken, celronRootId))) {
        // Otherwise, create/find a CELRON folder inside the provided root
        celronRootId = await getOrCreateFolderAt(accessToken, 'CELRON', topRootId);
    }

    // 2. Ensure Tiered Top-Level Folders exist under CELRON
    const tierMap = {
        timeBasedId: '01. TIME_BASED',
        permanentId: '02. PERMANENT_RECORDS',
        shortTermId: '03. SHORT_TERM_PROJECTS',
        corpVaultId: '04. CORPORATE_VAULT',
        inventoryId: '05. INVENTORY_CATALOG',
        scansInboxId: '99. SCANS_INBOX'
    };

    const results = { celronRootId };
    
    for (const [key, folderName] of Object.entries(tierMap)) {
        const settingKey = `gdrive_${folderName.split('.')[0].trim().toLowerCase()}_id`; // e.g. gdrive_01_id
        // We'll search and create directly to ensure consistency
        results[key] = await getOrCreateFolderAt(accessToken, folderName, celronRootId);
    }

    // 3. Setup Time-Based Subfolders (Jobs & Expenses for the year)
    const timeYearId = await getOrCreateFolderAt(accessToken, currentYearName, results.timeBasedId);
    const jobsRootId = await getOrCreateFolderAt(accessToken, 'JOBS', timeYearId);
    const expensesRootId = await getOrCreateFolderAt(accessToken, 'EXPENSES', timeYearId);

    // 3.5 Setup Inventory Subfolders (Photos & Datasheets)
    const inventoryPhotosId = await getOrCreateFolderAt(accessToken, 'Photos', results.inventoryId);
    const inventoryDatasheetsId = await getOrCreateFolderAt(accessToken, 'Datasheets', results.inventoryId);

    // 4. Setup Corporate Vault details (Mirroring structure)
    // We use the 04. CORPORATE_VAULT root directly now. 
    // If the user wants year-wise corporate vault, we can put it under timeBased, 
    // but the plan says 04. CORPORATE_VAULT is for Standards/Stationery.
    
    // 5. Build/Sync Structure for Corporate Vault if empty
    const items = await listFolderContent(accessToken, results.corpVaultId);
    if (items.length === 0) {
        // Find previous year if we want to mirror something... 
        // For now, let's just ensure the basic subfolders exist
        await getOrCreateFolderAt(accessToken, '00. Standards_&_Stationery', results.corpVaultId);
        await getOrCreateFolderAt(accessToken, '01. Company_Stationery', results.corpVaultId);
    }

    // 6. Persist findings to database
    await saveDocumentSettings({
        ...settings,
        gdrive_celron_root_id: celronRootId,
        gdrive_01_id: results.timeBasedId,
        gdrive_02_id: results.permanentId,
        gdrive_03_id: results.shortTermId,
        gdrive_04_id: results.corpVaultId,
        gdrive_05_id: results.inventoryId,
        gdrive_99_id: results.scansInboxId,
        gdrive_current_jobs_id: jobsRootId,
        gdrive_current_expenses_id: expensesRootId,
        gdrive_inventory_photos_id: inventoryPhotosId,
        gdrive_inventory_datasheets_id: inventoryDatasheetsId
    });

    const finalResult = { 
        ...results, 
        jobsRootId, 
        expensesRootId,
        inventoryPhotosId,
        inventoryDatasheetsId,
        timestamp: Date.now() 
    };
    vaultCache[cacheKey] = finalResult;
    return finalResult;
};

// Simple in-memory cache to prevent multiple initializations in the same session
const vaultCache = {};

/**
 * Mirror subfolders from source to target (shallow clone of structure only)
 */
const mirrorFolderStructure = async (accessToken, sourceId, targetId) => {
    const sourceItems = await listFolderContent(accessToken, sourceId);
    const sourceFolders = sourceItems.filter(item => item.mimeType === 'application/vnd.google-apps.folder');

    const targetItems = await listFolderContent(accessToken, targetId);
    const targetFolderNames = new Set(targetItems.filter(item => item.mimeType === 'application/vnd.google-apps.folder').map(f => f.name));

    for (const folder of sourceFolders) {
        if (!targetFolderNames.has(folder.name)) {
            await getOrCreateFolderAt(accessToken, folder.name, targetId);
        }
    }
};

/**
 * Helper to get or create a folder at a specific parent
 */
const getOrCreateFolderAt = async (accessToken, name, parentId) => {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const { files } = await searchRes.json();

    if (files && files.length > 0) return files[0].id;

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            parents: [parentId],
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const folder = await createRes.json();
    return folder.id;
};

/**
 * Get Shortcuts from settings
 */
export const getVaultShortcuts = (settings) => {
    if (!settings?.vault_shortcuts) return [];
    try {
        return typeof settings.vault_shortcuts === 'string'
            ? JSON.parse(settings.vault_shortcuts)
            : settings.vault_shortcuts;
    } catch (e) {
        return [];
    }
};

/**
 * Save Shortcut to settings
 */
export const saveVaultShortcut = async (companyId, shortcut) => {
    const settings = await getDocumentSettings(companyId);
    let shortcuts = getVaultShortcuts(settings);

    // Update or Add
    const idx = shortcuts.findIndex(s => s.name === shortcut.name);
    if (idx >= 0) {
        shortcuts[idx] = shortcut;
    } else {
        shortcuts.push(shortcut);
    }

    await saveDocumentSettings({
        ...settings,
        vault_shortcuts: JSON.stringify(shortcuts)
    });
};

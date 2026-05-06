
import { initializeVault } from './src/lib/vaultService.js';
import { moveFile, listFolderContent, getOrCreateFolder } from './src/lib/driveService.js';

// Configuration
const OLD_JOBS_FOLDER_1 = '1czoUp1VS05O05MsaJ0XN6I2O2XU28QbL'; // YEAR 2026 CELRON OS JOBS (3 jobs)
const OLD_JOBS_FOLDER_2 = '1-ctdXNMU_XlEhRrh3TDz3O24O-u8GKzh'; // 06_PROJECTS_&_JOBS_2026 (10 jobs)
const COMPANY_ID = 'your_company_id'; // Need to resolve this dynamically or via environment

async function consolidateJobs(accessToken) {
    console.log("Starting Job Consolidation...");
    
    // 1. Get the new master Jobs folder ID
    const vault = await initializeVault(accessToken, COMPANY_ID);
    const targetJobsFolderId = vault.jobsRootId; // This is CELRONHUB/01. TIME_BASED/YEAR2026/JOBS
    
    console.log(`Target Master Jobs Folder: ${targetJobsFolderId}`);

    // 2. Move items from Folder 1 (The one the mobile app currently sees)
    console.log("Moving items from 'YEAR 2026 CELRON OS JOBS'...");
    const items1 = await listFolderContent(accessToken, OLD_JOBS_FOLDER_1);
    for (const item of items1) {
        console.log(`Moving ${item.name}...`);
        await moveFile(accessToken, item.id, targetJobsFolderId);
    }

    // 3. Move items from Folder 2 (The one with 10 jobs)
    console.log("Moving items from '06_PROJECTS_&_JOBS_2026'...");
    const items2 = await listFolderContent(accessToken, OLD_JOBS_FOLDER_2);
    for (const item of items2) {
        console.log(`Moving ${item.name}...`);
        await moveFile(accessToken, item.id, targetJobsFolderId);
    }

    console.log("Job Consolidation Complete! All 10+ jobs are now in the master CELRONHUB folder.");
}

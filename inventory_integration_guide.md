# CelronPriceScan: Inventory Integration Guide

To ensure your Flutter app synchronizes perfectly with the CelronHub dashboard, follow these storage and database conventions.

## 1. Google Drive Storage
All inventory-related files should now be stored in the **Tier 05** hierarchy.

- **Root**: `CELRON/05. INVENTORY_CATALOG`
- **Photos Path**: `CELRON/05. INVENTORY_CATALOG/Photos`
- **Datasheets Path**: `CELRON/05. INVENTORY_CATALOG/Datasheets`

### Folder IDs
When the Hub initializes the "Tiered Structure", it saves the target Folder IDs in the `document_settings` table:
- `gdrive_inventory_photos_id`: Use this for product photos.
- `gdrive_inventory_datasheets_id`: Use this for technical datasheets.

## 2. Supabase Database (`catalog_items`)
Ensure your Flutter app updates the following columns:

- `photos`: An array of text (Gdrive `webViewLink` strings).
- `datasheet_url`: A single text string (Gdrive `webViewLink` for the PDF/Doc).

## 3. Upload Flow Recommendation
1. **Upload** the file to the corresponding Google Drive folder using the Google Drive API.
2. **Make Public**: Call `permissions.create` with `role: 'reader', type: 'anyone'` to ensure the Hub can display thumbnails.
3. **Update Supabase**: Save the `webViewLink` returned by Drive into the `catalog_items` table.

---
**Note**: The CelronHub dashboard will automatically provision these folders if they don't exist when a user with `admin` or `manager` roles logs in.

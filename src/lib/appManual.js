export const APP_MANUAL_CONTENT = `# CelronHub: Full Operational App Manual

Welcome to the unified CelronHub operations manual. This guide covers how to use the integrated system for the entire company lifecycle—from initial enquiry to final payment and archiving.

---

## 1. Universal Finder & Sourcing
The **Universal Finder** is your starting point for any new request.

### Part Identification (AI Assistant)
- Use the **PartFinder AI** tab to describe a part or upload a photo.
- The AI will help identify the part and suggest potential suppliers.

### Supplier Search (Live Web)
- Switch to the **Supplier Search** tab to find live vendors.
- Filter by **Brand**, **Country**, or **Category**.
- Click on results to see full contact details (Email, Phone, Address).

### External Tools (Global Finder)
- If you need external databases (like Omron or Base44), use the **Global Finder** tab.
- If a site doesn't load correctly inside the app, use the **"Open in New Tab"** button at the top right.

---

## 2. The Integrated Document Lifecycle
CelronHub now automates your filing system in Google Drive.

### Step 1: Creating an Enquiry (Auto-Provisioning)
When you create a new **Customer Enquiry**:
1.  **Folder Creation**: The system automatically creates a folder in Google Drive:
    - Path: \`[Your Root]/[Year]/[Enquiry No] - [Partner Name] - [Vessel Name]\`
2.  **Sub-Folders**: 4 professional sub-folders are created automatically:
    - \`1. Customer_Request_&_Offer\`
    - \`2. Supplier_Quotes_&_PO\`
    - \`3. Operation_DO_&_Service_Reports\`
    - \`4. Finance_Invoices_&_Payments\`

### 1.3 Document Generation & Professional Emailing
- **One-Click PDF**: Generate professional Quotations, POs, and Invoices instantly.
- **Smart Email Templates**: When sending documents via email, the system automatically builds a detailed itemized summary in the message body and attaches a professional company footer (Address, Email, Phone) from your settings.
- **Auto-Filing**: Every document generated is automatically saved to the correct Google Drive folder.

---

### Step 3: Archiving to the Vault (Closure)
Once a job is finished:
1.  Go to **Storage Directory** or the **Job Details** portal.
2.  Click **Archive to Vault**.
3.  The system will move the entire project folder to the **Corporate Vault** for that year and mark the record as \`Archived\`.

---

## 3. Storage & The Corporate Vault
The system maintains a clear distinction between active work and long-term records.

### Storage Directory (Active Work)
- View current jobs and their live progress.
- Access the Google Drive folder directly.
- **Archive to Vault**: Move completed jobs to the permanent archive. Once archived, the folder is safely stored in the Vault.

### Corporate Vault (Archive & Standards)
- Access via the **Header → Google Drive Icon**.
- **Year Folders**: Contains archived projects organized by year.
- **Standards & Stationery**: Click the **Standards & Stationery** button in the Vault header to quickly access your global company templates, letterheads, logos, and calibration forms.

---

## 4. Specialized Workflows
### Service Jobs & Calibration
- **Service Reports (SR)**: For jobs of type \`Service\`, use the **Gen SR** button in Job Details to generate and auto-save the report.
- **Certificates**: Upload calibration certificates directly in the Job Details portal. They are automatically saved to the **3. Operations...** folder in Google Drive.

---

## 5. Profit Finder & Job Costing
The portal provides a real-time financial overview of every job.

### Job Costing & Supplier Bills
- In any **Job Portal**, go to the **Job Costing** section.
- Add costs by entering the Supplier Name and Amount.
- **Supplier Bills**: You can upload the supplier's bill (PDF/Image). This is automatically saved to the **2. Supplier_Quotes_&_PO** folder in Google Drive.
- **View Bill**: Click the green "View Bill" link to open the original document directly from Drive.

### The Profit Finder Dashboard
- **Order Value**: This represents your total revenue from the customer PO.
- **Net Profit**: Calculated as \`Order Value - Total Job Costing\`.
- **Reports Page**: Visit the **Reports** page to see the global **Financial Profit Finder**. This summarizes your profit margins across all active jobs.

---

## Troubleshooting & Support
- **Google Login Errors**: If you see a "403" or "expired token" error, go to **Settings → Connect Google** to refresh your session.
- **Database Indexing**: For existing jobs to use the new folder tracking, run the \`add_job_folder_column.sql\` script in your Supabase editor.

---

## 7. QR & Barcode Operations (Warehouse Management)
Efficiently manage your warehouse and catalog using mobile scanning and bulk label printing.

### 7.1 Setting Up Barcodes
- Go to the **Catalog**.
- Click **Edit** on any item.
- Enter a unique identifier in the **Barcode / SKU** field.
- **Pro Tip**: Use the camera icon in the form to scan an existing barcode directly into the field.

### 7.2 Printing Labels
- Click the **Print QR Labels** shortcut in the sidebar.
- Select the items you want to label.
- Enter the **Quantity** (e.g., if you have 10 pcs, enter 10 labels).
- Click **Print All**. The system generates 2x1 inch stickers in an optimized 3-column layout.

### 7.3 Mobile Scanning & Search
- Open CelronHub on your mobile phone browser.
- In the **Catalog** page, click the **Scan** button at the top.
- Point your camera at a QR code or Barcode.
- The system will immediately filter the list to show that specific item.

---

## 8. Manual Update Policy
CelronHub is a living platform. To ensure you and your team are always using the latest features:
- **Continuous Updates**: Every time a new feature, button, or logic update is added to the system, this manual and the **Help Center** are updated simultaneously.
- **Version Control**: Check the manual footer for the latest version date to ensure you are viewing the most recent instructions.
- **Practice Guided**: Always refer to the **"Read and Practice"** sections in the Help Center to master new tools as they are released.

---
*Manual Version: 1.4 (March 2026)*
*Last Update: Added QR & Barcode Operations Tutorial*
`;

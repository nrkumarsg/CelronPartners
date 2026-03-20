# Celron Scanner - Flutter Application Specification

## Application Overview
The **Celron Scanner** is an Android application built in Flutter designed to act as a companion to the CelronHub dashboard. It enables field workers and employees to instantly digitize physical documents and upload them directly to the company's designated Google Drive public folder (`Celron_Scans`).

**Suggested App Names**:  
1. **Celron ScanSync**
2. **Celron Lens**
3. **Celron Document Scanner**

**Logo Concepts**:  
1. *Minimalist*: A stylized camera lens with a document outline, utilizing the main Celron brand colors (Blue/Orange).
2. *Dynamic*: A piece of paper passing through a scanner beam, with a cloud sync icon overlay to represent immediate Drive uploads.

---

## Core Requirements & Features
1. **Camera Scanning**: Uses the device camera to identify documents.
2. **Crop & Flatten**: Auto-detect document edges, allow manual adjustment, crop, and flatten perspective.
3. **Quality Enhancement**: Apply automatic filters (b&w, magic color, grayscale) to ensure best readability for both image (JPG) and PDF outputs.
4. **Multipage Support**: Ability to capture multiple pages sequentially and bundle them into a single PDF.
5. **Google Drive Integration**: Direct upload to Google Drive using the `googleapis` package.
6. **Bounty Logic**: Maintain structural separation for custom business logic if a bounty/reward system is instituted per scan.

---

## Workflow Logic: Documents vs Receipts & Bills
To effectively separate General Documents from Financial Records (GST/Supplier Bills), implement a **Category & Metadata Selection** step in the app before uploading.

### 1. Pre-Upload Categorization
After cropping/adjusting the scan, present a primary dropdown for the Document Type:
- **`Celron Docs`** (General business documents, contracts, letters, etc.)
- **`Common Spend (Receipts)`** (Day-to-day out-of-pocket expenses)
- **`Supplier Bills`** (Invoices from vendors/suppliers)

### 2. GST Toggle (For Financial Documents)
If the user selects either `Common Spend (Receipts)` or `Supplier Bills`, a secondary toggle should appear:
- **[ ] Contains GST?** (Yes / No)

This creates a clear, binary distinction for your finance team without overcomplicating the scanner interface.

### 3. Dynamic Folder Routing
Upload the file to different subdirectories based on the selections to keep your Google Drive perfectly organized for accounting:
- *Celron Docs*: `Celron_Scans/[Year]/Celron_Docs/`
- *Common Spend (No GST)*: `Celron_Scans/[Year]/Finance/Common_Spend/Non_GST/`
- *Common Spend (With GST)*: `Celron_Scans/[Year]/Finance/Common_Spend/GST/`
- *Supplier Bills (No GST)*: `Celron_Scans/[Year]/Finance/Supplier_Bills/Non_GST/`
- *Supplier Bills (With GST)*: `Celron_Scans/[Year]/Finance/Supplier_Bills/GST/`

### 4. Smart Naming Convention
Prepend the document type and GST status to the file name so they are instantly recognizable in CelronHub:
- `DOC-2026-03-14-01.pdf` (Celron Docs)
- `SPEND-GST-2026-03-14-01.jpg` (Common spend with GST)
- `SPEND-NOGST-2026-03-14-01.jpg` (Common spend without GST)
- `BILL-GST-2026-03-14-01.pdf` (Supplier bill with GST)
- `BILL-NOGST-2026-03-14-01.pdf` (Supplier bill without GST)

---

## File Saving & Naming Logic
- **Target Folder**: A public folder in Google Drive (e.g., named `Celron_Scans`).
- **Year-Wise Subfolders**: Within the root scan folder, a subfolder corresponding to the current year (`2026`, etc.).
- **Naming Convention**: `YYYY-MM-DD-01.pdf` or `YYYY-MM-DD-02.jpg`. The `-XX` suffix auto-increments for multiple scans on the same day.
- **URL Attachment**: The app should return or display the direct Google Drive URL for easy attachment to workflows within the application without duplicating data.

---

## Starter Boilerplate (Main Packages)
To set up this app, create a new Flutter project and add the following dependencies to your `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  # For Google Drive / OAuth
  google_sign_in: ^6.2.1
  googleapis: ^13.0.0
  http: ^1.2.0
  # For sophisticated Document Scanning
  cunning_document_scanner: ^1.1.2 
  # OR edge_detection: ^1.1.2
```

### Core Scanning & Drive Logic Example
```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:googleapis/drive/v3.dart' as drive;
import 'package:http/http.dart' as http;

// 1. Authenticated HTTP Client needed for googleapis
class GoogleAuthClient extends http.BaseClient {
  final Map<String, String> _headers;
  final http.Client _client = http.Client();

  GoogleAuthClient(this._headers);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    return _client.send(request..headers.addAll(_headers));
  }
}

class ScannerScreen extends StatefulWidget {
  @override
  _ScannerScreenState createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  List<String> _pictures = [];
  bool _uploading = false;

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [drive.DriveApi.driveFileScope],
  );

  Future<void> _scanDocument() async {
    try {
      List<String> pictures = await CunningDocumentScanner.getPictures() ?? [];
      setState(() {
        _pictures.addAll(pictures);
      });
    } catch (e) {
      print("Error scanning: \$e");
    }
  }

  Future<void> _uploadToDrive() async {
    if (_pictures.isEmpty) return;
    setState(() => _uploading = true);

    try {
      // 1. Authenticate with Google
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) {
        throw Exception("User cancelled login");
      }
      final GoogleSignInAuthentication auth = await account.authentication;
      final authenticateClient = GoogleAuthClient({'Authorization': 'Bearer \${auth.accessToken}'});
      
      final driveApi = drive.DriveApi(authenticateClient);

      // 2. Logic to detect/create 'Celron_Scans' root and Year subfolder omitted for brevity
      // Assume we have the target folder ID: 'folder_id_here'

      for (String path in _pictures) {
        File fileToUpload = File(path);
        String fileName = "\${DateTime.now().toIso8601String().split('T')[0]}-01.jpg"; // Handle auto-increment logic here
        
        var driveFile = drive.File();
        driveFile.name = fileName;
        // driveFile.parents = ['folder_id_here']; // Un-comment to put in specific folder
        
        final result = await driveApi.files.create(
          driveFile,
          uploadMedia: drive.Media(fileToUpload.openRead(), fileToUpload.lengthSync()),
        );

        print("Uploaded file ID: \${result.id}");
        // Here you can make the file public using driveApi.permissions.create(...)
        // and return the WebContentLink or WebViewLink.
      }
      
      setState(() {
        _pictures.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload Complete!')));
      
    } catch (e) {
      print("Upload error: \$e");
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload.')));
    } finally {
      setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Celron Scanner')),
      body: _uploading
          ? Center(child: CircularProgressIndicator())
          : GridView.builder(
              padding: EdgeInsets.all(16),
              itemCount: _pictures.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10),
              itemBuilder: (context, index) => Image.file(File(_pictures[index]), fit: BoxFit.cover),
            ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            heroTag: "scanBtn",
            onPressed: _scanDocument,
            child: Icon(Icons.camera_alt),
          ),
          SizedBox(height: 16),
          if (_pictures.isNotEmpty)
            FloatingActionButton(
              heroTag: "uploadBtn",
              onPressed: _uploadToDrive,
              backgroundColor: Colors.green,
              child: Icon(Icons.cloud_upload),
            ),
        ],
      ),
    );
  }
}
```

## Next Steps for Developer
1. Create the project: `flutter create celron_scanner`
2. Update the `android/app/build.gradle` `minSdkVersion` to `21` or higher.
3. Configure **Firebase** / **Google Cloud Console** to generate the necessary OAuth client IDs to permit Google Sign-In and Google Drive API usage for this Android app package name.
4. Integrate the provided boilerplate and refine the folder structure creation loops.
5. Build the APK: `flutter build apk --release` and upload it to the designated Google Drive APK folder. Update the dummy download link in React `ScannerModule.jsx`.

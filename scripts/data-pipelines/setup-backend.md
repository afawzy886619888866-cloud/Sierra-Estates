# Setup Guide: Sierra Estates Backend Credentials

To activate the automated data pipeline and Google Sheets synchronization, you must configure the following credentials.

## 1. Firebase Admin SDK

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Project Settings > Service Accounts.
3. Click **Generate New Private Key**.
4. Save the file as `serviceAccountKey.json`.
5. Place it in: `f:\Sierra_Estates_Master\my-app\config\serviceAccountKey.json`.

## 2. Google Sheets & Drive API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Sheets API** and **Google Drive API**.
3. Go to **APIs & Services > Credentials**.
4. Create a **Service Account**.
5. Create a Key (JSON) for this service account.
6. Save the file as `service_account.json`.
7. Place it in: `f:\Sierra_Estates_Master\my-app\config\service_account.json`.
8. **Crucial**: Open your Master Google Sheet and "Share" it with the service account's email address (found in the JSON) as an **Editor**.

## 3. Google Drive App (PyDrive2)

1. In Google Cloud Console, create an **OAuth 2.0 Client ID** (Desktop App).
2. Download the JSON and rename it to `client_secrets.json`.
3. Place it in the root: `f:\Sierra_Estates_Master\my-app\client_secrets.json`.

## 4. Environment Variables

Ensure your `.env.local` includes:

```env
MASTER_SHEET_ID=your_spreadsheet_id_here
FIREBASE_SERVICE_ACCOUNT_JSON={"your": "json_content_stringified"}
```

> [!NOTE]
> The `data_pipeline.py` script will open a browser window for authentication the first time it runs to establish a `credentials.json` for Drive access.

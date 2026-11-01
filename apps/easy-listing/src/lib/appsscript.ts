export const APPS_SCRIPT_CODE = `/**
 * Sierra Estates — Easy Listing → Google Sheets + Google Drive
 * ----------------------------------------------------------------
 * 1) افتح شيت الشركة (لينك الشيت موجود في صفحة Easy Listing)
 * 2) من القائمة: Extensions ← Apps Script
 * 3) امسح أي كود قديم موجود والصق هذا الكود كله (نبدّل — مش نضيف)
 * 4) احفظ (Ctrl+S) ثم Deploy ← New deployment ← Web app
 *    - Execute as: Me  |  Who has access: Anyone
 *    (لو عندك Web App منشور قبل كده: Deploy ← Manage deployments ← ✏️ ←
 *     Version: New ← Deploy — واللينك هيفضل زي ما هو)
 * 5) وافق على الصلاحيات وانسخ الـ Web app URL والصقه في إعدادات Easy Listing
 */
var SHEET_NAME = 'Listings';
var IMAGE_FOLDER = 'Easy Listing Images';
var MAX_IMAGES = 12;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Code','Compound','Bedrooms','Bathrooms','Area (sqm)','Price','Currency',
        'Furnished','Owner Phone','WhatsApp Content','Facebook Content','Property Finder Content',
        'Map Link','Images (URLs)','Created At']);
      sheet.getRange(1, 1, 1, 15)
        .setFontWeight('bold').setBackground('#0e5c46').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      if (sheet.getMaxColumns() > 15) sheet.hideColumns(16, sheet.getMaxColumns() - 15);
    }

    // ---- images: base64 → Google Drive (permanent, shareable links) ----
    var urls = [];
    var images = (data.images || []).slice(0, MAX_IMAGES);
    if (images.length > 0) {
      var folder = getImageFolder_();
      for (var i = 0; i < images.length; i++) {
        var img = images[i] || {};
        var blob = Utilities.newBlob(
          Utilities.base64Decode(String(img.data || '')),
          String(img.mime || 'image/jpeg'),
          sanitizeName_(img.name) || (data.code + '-' + (i + 1) + '.jpg')
        );
        var file = folder.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (err) { /* domain-restricted Drive — link still saved */ }
        urls.push('https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing');
      }
    }
    // allow pre-hosted URLs to be mixed in as well
    var extra = (data.imageUrls || []).slice(0, MAX_IMAGES);
    for (var j = 0; j < extra.length; j++) {
      if (urls.length >= MAX_IMAGES) break;
      urls.push(String(extra[j]));
    }

    lock.waitLock(10000);
    sheet.appendRow([
      data.code, data.compound, data.bedrooms, data.bathrooms, data.area, data.price, data.currency,
      data.furnished ? 'Yes' : 'No', data.ownerPhone,
      data.whatsappContent, data.facebookContent, data.pfContent,
      data.mapLink, urls.join(' , '), data.createdAt
    ]);
    lock.releaseLock();

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, urls: urls }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try { lock.releaseLock(); } catch (e2) {}
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    'Sierra Estates Easy Listing: endpoint is live ✅'
  );
}

function getImageFolder_() {
  var it = DriveApp.getFoldersByName(IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMAGE_FOLDER);
}

function sanitizeName_(name) {
  var s = String(name || '').replace(/[^\\w\\- .()]/g, '_').slice(0, 80);
  return s;
}
`

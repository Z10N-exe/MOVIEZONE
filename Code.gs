// ================================================================
// MOVIEZONE — Google Apps Script
// Paste this entire file into your Google Apps Script editor
// ================================================================

var SHEET_NAME = 'Codes';

function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    if      (action === 'list')     result = listCodes();
    else if (action === 'add')      result = addCode(e.parameter.code, e.parameter.days);
    else if (action === 'validate') result = validateCode(e.parameter.code);
    else if (action === 'delete')   result = deleteCode(e.parameter.code);
    else result = { error: 'Unknown action' };
  } catch(err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet with headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1,1,1,4).setValues([['Code','Days','Expires','Created']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function listCodes() {
  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();
  var codes = [];
  var now   = Date.now();

  for (var i = 1; i < data.length; i++) {
    var row     = data[i];
    var code    = row[0];
    var days    = row[1];
    var expires = row[2];

    if (!code) continue;

    // Auto-clean expired codes
    if (expires > 0 && now > expires) {
      sheet.deleteRow(i + 1);
      i--;
      data = sheet.getDataRange().getValues();
      continue;
    }

    codes.push({ code: String(code), days: String(days), expires: String(expires) });
  }

  return { success: true, codes: codes };
}

function addCode(code, days) {
  if (!code || !days) return { error: 'Missing code or days' };

  var sheet   = getSheet();
  var expires = parseInt(days) > 0 ? Date.now() + parseInt(days) * 86400000 : 0;
  var created = Date.now();

  sheet.appendRow([code, days, expires, created]);
  return { success: true };
}

function validateCode(code) {
  if (!code) return { valid: false, error: 'No code provided' };

  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();
  var now   = Date.now();

  for (var i = 1; i < data.length; i++) {
    var row     = data[i];
    var rowCode = String(row[0]).trim().toUpperCase();
    var days    = row[1];
    var expires = row[2];

    if (rowCode === code.trim().toUpperCase()) {
      // Check expiry
      if (expires > 0 && now > expires) {
        sheet.deleteRow(i + 1);
        return { valid: false, error: 'Code has expired' };
      }

      // Valid! Calculate access expiry (30 days from now)
      var accessExpires = Date.now() + parseInt(days) * 86400000;

      // Delete code from sheet so it can't be reused
      sheet.deleteRow(i + 1);

      return { valid: true, expires: accessExpires, days: days };
    }
  }

  return { valid: false, error: 'Invalid code' };
}

function deleteCode(code) {
  if (!code) return { error: 'No code provided' };

  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === code.trim().toUpperCase()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { error: 'Code not found' };
}

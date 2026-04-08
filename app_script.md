/**
 * Load config values from "config" sheet.
 */
const CONFIG = {
  API_URL: 'https://smsgateway24.com/getdata/addsms',
  SHEET_NAME: 'Sheet1',
  CONFIG_SHEET_NAME: 'config',
  START_ROW: 2,
};
function loadConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.CONFIG_SHEET_NAME);

  if (!sheet) {
    throw new Error('Config sheet not found');
  }

  const data = sheet.getDataRange().getValues();

  const configMap = {};

  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    const value = String(data[i][1] || '').trim();

    if (key) {
      configMap[key] = value;
    }
  }

  // Validation
  if (!configMap.api_token) {
    throw new Error('api_token is missing in config sheet');
  }

  if (!configMap.device_id) {
    throw new Error('device_id is missing in config sheet');
  }

  if (!configMap.sim) {
    throw new Error('sim is missing in config sheet');
  }

  return {
    apiToken: configMap.api_token,
    deviceId: parseInt(configMap.device_id, 10),
    sim: parseInt(configMap.sim, 10)
  };
}

/**
 * Add custom menu when spreadsheet is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SMS Gateway')
    .addItem('Prepare Sheet', 'prepareSheet')
    .addItem('Send SMS', 'sendSmsBatch')
    .addToUi();
}

/**
 * Prepare headers for the sheet.
 */
function prepareSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  sheet.getRange(1, 1, 1, 9).setValues([[
    'phone',
    'name',
    'message',
    'timetosend',
    'customerid',
    'urgent',
    'status',
    'response',
    'sms_id'
  ]]);

  SpreadsheetApp.getUi().alert('Headers prepared.');
}

/**
 * Main batch sender.
 */
function sendSmsBatch() {
  const runtimeConfig = loadConfig();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const lastRow = sheet.getLastRow();

  if (lastRow < CONFIG.START_ROW) {
    SpreadsheetApp.getUi().alert('No data rows found.');
    return;
  }

  const dataRange = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, 9);
  const rows = dataRange.getValues();

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = CONFIG.START_ROW + i;

    const phone = String(rows[i][0] || '').trim();
    const name = String(rows[i][1] || '').trim();
    let message = String(rows[i][2] || '').trim();
    const timetosend = String(rows[i][3] || '').trim();
    const customerid = String(rows[i][4] || '').trim();
    const urgent = String(rows[i][5] || '').trim();
    const currentStatus = String(rows[i][6] || '').trim();

    // Skip already sent rows
    if (currentStatus === 'SENT') {
      continue;
    }

    if (!phone) {
      sheet.getRange(rowIndex, 7).setValue('ERROR');
      sheet.getRange(rowIndex, 8).setValue('Phone is empty');
      continue;
    }

    if (!message) {
      // Fallback template if message column is empty
      message = `Hello ${name || 'customer'}, this is a message from our service.`;
    }

    try {
      const result = sendSms({
        phone,
        message,
        timetosend,
        customerid,
        urgent
      }, runtimeConfig);

      if (result.success) {
        sheet.getRange(rowIndex, 7).setValue('SENT');
        sheet.getRange(rowIndex, 8).setValue(result.message || result.rawResponse);
        sheet.getRange(rowIndex, 9).setValue(result.smsId || '');
      } else {
        sheet.getRange(rowIndex, 7).setValue('FAILED');
        sheet.getRange(rowIndex, 8).setValue(result.message || result.rawResponse);
        sheet.getRange(rowIndex, 9).setValue(result.smsId || '');
      }
    } catch (error) {
      sheet.getRange(rowIndex, 7).setValue('ERROR');
      sheet.getRange(rowIndex, 8).setValue(error.message);
      sheet.getRange(rowIndex, 9).setValue('');
    }

    SpreadsheetApp.flush();
    Utilities.sleep(300); // Small pause to reduce API burst load
  }

  SpreadsheetApp.getUi().alert('Batch sending completed.');
}

/**
 * Send single SMS via smsgateway24 API.
 */
function sendSms(data, runtimeConfig) {
  const payload = {
    token: runtimeConfig.apiToken,
    sendto: normalizePhone(data.phone),
    body: data.message,
    device_id: runtimeConfig.deviceId,
    sim: runtimeConfig.sim
  };

  if (data.timetosend) {
    payload.timetosend = data.timetosend;
  }

  if (data.customerid) {
    payload.customerid = data.customerid;
  }

  if (data.urgent !== '') {
    payload.urgent = data.urgent;
  }

  const options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.API_URL, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  let parsed = null;

  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    parsed = null;
  }

  return {
    success: parsed && Number(parsed.error) === 0,
    message: parsed?.message || responseText,
    smsId: parsed?.sms_id || null,
    rawResponse: responseText
  };
}

/**
 * Normalize phone number.
 */
function normalizePhone(phone) {
  return String(phone).replace(/\s+/g, '');
}

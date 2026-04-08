/**
 * Load config values from "config" sheet.
 */
const CONFIG = {
  API_URL: 'https://smsgateway24.com/getdata/addalotofsms',
  SHEET_NAME: 'Sheet1',
  CONFIG_SHEET_NAME: 'config',
  START_ROW: 2,
  BATCH_SIZE: 50,
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
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.getActiveSheet();

  const lastRow = sheet.getLastRow();

  if (lastRow < CONFIG.START_ROW) {
    SpreadsheetApp.getUi().alert('No data rows found.');
    return;
  }

  const dataRange = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, 9);
  const rows = dataRange.getValues();

  const smsQueue = [];

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
      sheet.getRange(rowIndex, 9).setValue('');
      continue;
    }

    if (!message) {
      // Fallback template if message column is empty
      message = `Hello ${name || 'customer'}, this is a message from our service.`;
    }

    const smsItem = {
      sendto: normalizePhone(phone),
      body: message,
      sim: runtimeConfig.sim,
      device_id: runtimeConfig.deviceId
    };

    if (timetosend) {
      smsItem.timetosend = timetosend;
    }

    if (customerid) {
      smsItem.customerid = customerid;
    }

    if (urgent !== '') {
      smsItem.urgent = Number(urgent);
    }

    smsQueue.push({
      rowIndex: rowIndex,
      smsItem: smsItem
    });
  }

  if (smsQueue.length === 0) {
    SpreadsheetApp.getUi().alert('No SMS to send.');
    return;
  }

  for (let i = 0; i < smsQueue.length; i += CONFIG.BATCH_SIZE) {
    const batch = smsQueue.slice(i, i + CONFIG.BATCH_SIZE);

    try {
      const result = sendSmsBulk(batch, runtimeConfig);

      for (let j = 0; j < batch.length; j++) {
        const rowIndex = batch[j].rowIndex;

        if (result.success) {
          sheet.getRange(rowIndex, 7).setValue('SENT');
          sheet.getRange(rowIndex, 8).setValue(result.message || result.rawResponse);
          sheet.getRange(rowIndex, 9).setValue('');
        } else {
          sheet.getRange(rowIndex, 7).setValue('FAILED');
          sheet.getRange(rowIndex, 8).setValue(result.message || result.rawResponse);
          sheet.getRange(rowIndex, 9).setValue('');
        }
      }
    } catch (error) {
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = batch[j].rowIndex;
        sheet.getRange(rowIndex, 7).setValue('ERROR');
        sheet.getRange(rowIndex, 8).setValue(error.message);
        sheet.getRange(rowIndex, 9).setValue('');
      }
    }

    SpreadsheetApp.flush();
    Utilities.sleep(500); // Small pause between batches
  }

  SpreadsheetApp.getUi().alert('Batch sending completed.');
}

/**
 * Send bulk SMS via smsgateway24 API.
 */
function sendSmsBulk(batch, runtimeConfig) {
  const requestBody = {
    token: runtimeConfig.apiToken,
    smsdata: batch.map(function(item) {
      return item.smsItem;
    })
  };

  const options = {
    method: 'post',
    payload: {
      datajson: JSON.stringify(requestBody)
    },
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

  if (statusCode >= 400) {
    return {
      success: false,
      message: 'HTTP error ' + statusCode + ': ' + responseText,
      rawResponse: responseText
    };
  }

  return {
    success: parsed && Number(parsed.error) === 0,
    message: parsed && parsed.message ? parsed.message : responseText,
    rawResponse: responseText
  };
}

/**
 * Normalize phone number.
 */
function normalizePhone(phone) {
  return String(phone).replace(/\s+/g, '');
}
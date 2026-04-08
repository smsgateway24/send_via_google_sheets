# SMSGateway24 Google Sheets Script

This repository contains a Google Apps Script example for sending messages through **[smsgateway24.com](https://smsgateway24.com/)** from **Google Sheets**.

It is a simple cross-platform alternative to Excel macros and works well on **macOS**, **Windows**, and **Linux**.

## What you can do

You have two options:

### Option 1: Use the ready-made Google Sheet template
Use the prepared Google Sheet, make your own copy, fill in your settings, and start sending messages.

Recommended if you want the fastest setup.

Link to the template: [Google Sheet Template](https://docs.google.com/spreadsheets/d/19pl6DDEC1eCnRiqdfkiBjJYJ3-lU8EihUocClMUxaCM/edit?usp=drive_link)

### Option 2: Create your own Google Sheet and add the script manually
Create a blank Google Sheet, add the required sheets and columns, paste the script into Google Apps Script, and use it with your own data.

Recommended if you want full control over the file structure.

---

## What you need before you start

You need the following values from your **SMSGateway24** account:

- **token**
- **device_id**
- **sim**

### Where to get them

Log in to **smsgateway24.com** and open the **Profile** section.

From there you can get:

- your **token**
- your **device_id**

You should also decide which **sim** slot or channel you want to use:

- `0` = SIM slot 1 for SMS
- `1` = SIM slot 2 for SMS
- `2` = WhatsApp Business
- `3` = WhatsApp Personal
- `4` = RCS channel 1
- `5` = RCS channel 2

---

## Option 1: Use the ready-made Google Sheet template

1. Open the shared Google Sheet template.
2. Click **File → Make a copy**.
3. Save the copy to your Google Drive.
4. Open the copied file.
5. Go to the `config` sheet.
6. Fill in your values:
   - `api_token`
   - `device_id`
   - `sim`
7. Go back to the main sheet with contacts.
8. Add your recipients and message text.
9. Refresh the spreadsheet page.
10. Open the **SMS Gateway** menu and run the script.

### Template structure

#### Main sheet
Use the following columns in the main sheet:

| phone | name | message | timetosend | customerid | urgent | status | response | sms_id |
|------|------|---------|------------|------------|--------|--------|----------|--------|

#### Config sheet
The `config` sheet must look like this:

| key | value |
|-----|-------|
| api_token | your_token_here |
| device_id | 12345 |
| sim | 0 |

### Important
Set the **phone** column format to **Plain text** in Google Sheets so the `+` sign is preserved.

---

## Option 2: Create your own Google Sheet and add the script manually

### Step 1: Create a new Google Sheet

Create a new spreadsheet in Google Sheets.

### Step 2: Create the main sheet

Create a sheet for your contacts, for example `Sheet1`.

Add this header row:

```text
phone | name | message | timetosend | customerid | urgent | status | response | sms_id
```

### Step 3: Create the config sheet

Create another sheet named exactly:

```text
config
```

Add this content:

```text
key | value
api_token | your_token_here
device_id | 12345
sim | 0
```

### Step 4: Open Google Apps Script

In the spreadsheet, open:

```text
Extensions → Apps Script
```

### Step 5: Paste the script

Delete the default code in the editor and paste the script from this repository into the main script file, usually `Code.gs`.

Save the project.

### Step 6: Reload the spreadsheet

Refresh the spreadsheet page in your browser.

After that, you should see a custom menu called:

```text
SMS Gateway
```

### Step 7: Authorize the script

The first time you run the script, Google will ask for authorization.

1. Click the custom menu.
2. Run the sending function.
3. Accept the requested permissions.
4. Reload the spreadsheet if needed.

### Step 8: Use the sheet

Fill in the rows with your contact data and messages, then run the send function from the custom menu.

---

## Example data row

```text
+4917660188224 | John Doe | Hello John, this is a test message | 2026-04-08 18:00:00 | 1001 | 1 |  |  |
```

---

## Notes

- This script is part of the **SMSGateway24** project.
- The script sends requests to the SMSGateway24 API endpoint.
- Your `api_token`, `device_id`, and `sim` values are not hardcoded in the script. They are loaded from the `config` sheet.
- Each user should use their own copy of the spreadsheet and their own configuration values.
- Do not share your personal token publicly.

---

## Recommended usage

For production use, the recommended flow is:

1. Create your own copy of the template.
2. Set your token and device settings in the `config` sheet.
3. Use the main sheet to manage contacts and messages.
4. Run the script from the spreadsheet menu.

---

## Support

For account-related values such as **token** and **device_id**, log in to your account at **smsgateway24.com** and open the **Profile** section.


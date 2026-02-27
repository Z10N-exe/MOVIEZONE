# MOVIEZONE — Google Sheets Paywall Setup
## Takes about 10 minutes. Follow every step carefully.

---

## STEP 1 — Create your Google Sheet

1. Go to https://sheets.google.com
2. Click **+ Blank** to create a new spreadsheet
3. Name it **Moviezone Codes** (top left)
4. Leave it open — you'll need it in Step 2

---

## STEP 2 — Set up the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. A new tab opens with a code editor
3. **Delete everything** in the editor
4. Open the file **Code.gs** from this zip
5. Copy ALL the code from Code.gs and paste it into the editor
6. Click 💾 **Save** (Ctrl+S)
7. Name the project **Moviezone** when asked

---

## STEP 3 — Deploy as Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the ⚙️ gear icon next to "Type" → select **Web app**
3. Fill in:
   - Description: `Moviezone Paywall`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. You'll see a URL like:
   `https://script.google.com/macros/s/ABC123.../exec`
7. **Copy that URL** — you need it for Steps 4 and 5

---

## STEP 4 — Connect Admin Panel

1. Open **admin.html** in your browser
2. Login: username `admin` / password `moviezone123`
3. Paste your Apps Script URL in the setup box
4. Click **Save & Connect**
5. You should see your codes table load (empty for now)

---

## STEP 5 — Connect the Main App

1. Open **index.html** in a text editor (Notepad)
2. Find this line near the top:
   ```
   var SCRIPT_URL = localStorage.getItem('mz_script_url') || '';
   ```
3. Replace it with:
   ```
   var SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
   ```
   (paste your actual URL between the quotes)
4. Save the file

---

## STEP 6 — Upload to Netlify

1. Go to https://app.netlify.com/drop
2. Drag **index.html** and **admin.html** together
3. Your site is live!

---

## HOW TO USE

### Generating a code for a customer:
1. Open admin.html on your site
2. Click Generate → copy the code
3. Send the code to your customer
4. They enter it on the paywall → unlocked for 30 days
5. Code is deleted from the sheet automatically

### Changing admin password:
Open admin.html in Notepad and change:
```
var ADMIN_USER = 'admin';
var ADMIN_PASS = 'moviezone123';
```

### If you redeploy the Apps Script:
You must click **Deploy → Manage deployments → Edit → Deploy** again
and update the URL in index.html and admin.html.

---

## TROUBLESHOOTING

**"Connection error" on paywall:**
- Make sure your Apps Script URL is correct in index.html
- Make sure you set "Who has access" to **Anyone** during deployment

**"Could not connect" in admin:**
- Re-check the URL you pasted in the setup box
- Try redeploying the Apps Script

**Codes not showing in admin:**
- The Google Sheet must have a tab named exactly **Codes**
- Re-run the script once to auto-create it

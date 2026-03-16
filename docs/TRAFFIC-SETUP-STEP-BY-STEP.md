# Traffic Alerts — Step-by-step setup (beginner guide)

This guide tells you **exactly** what to do to get Traffic Alerts working. Do the steps in order. You need: (1) a Supabase project for the app, (2) your Traffic Scotland Client Id and Client Key, (3) a computer with Node.js installed (you already have this if the app runs).

---

## Part A — Create the traffic table in Supabase

Your app stores traffic data in Supabase. First we add a table for it.

### A1. Open your Supabase project

1. Go to **https://supabase.com** in your browser and sign in.
2. Click your **project** (the one you use for PHD Matrix / DriverHubApp).
3. You should see the project dashboard (Database, Auth, Storage, etc. in the left sidebar).

### A2. Open the SQL Editor

1. In the **left sidebar**, click **“SQL Editor”** (it has a small code/terminal icon).
2. Click **“New query”** (top right) so you have a blank box where you can type.

### A3. Paste and run the SQL

1. Open the file **`traffic-schema.sql`** that lives in your project folder here:
   - `DriverHubApp` → **`docs`** → **`traffic-schema.sql`**
2. **Select all** the text in that file (Ctrl+A) and **copy** it (Ctrl+C).
3. Back in the Supabase SQL Editor, **paste** that text into the big empty box (Ctrl+V).
4. Click the green **“Run”** button (or press Ctrl+Enter).

### A4. Check it worked

- If it worked, you’ll see a message like “Success. No rows returned” (that’s normal).
- If you see red error text, read it. Often it means the table already exists, which is also fine.
- Optional check: in the left sidebar click **“Table Editor”**, then look for a table named **`traffic_situations`**. If you see it, you’re done with Part A.

---

## Part B — Get the four values you need

You need four values. Keep them secret; don’t put them in chat or in git.

### B1. Traffic Scotland — Client Id and Client Key

1. Go to **https://developer.trafficscotland.org** and log in.
2. Open the **“API Credentials”** tab (or similar).
3. You’ll see:
   - **Client Id** — copy this and save it somewhere safe (e.g. Notepad) and label it “Traffic Scotland Client Id”.
   - **Client Key** — copy this and save it and label it “Traffic Scotland Client Key”.

### B2. Supabase — Project URL and service role key

1. Go back to **https://supabase.com** and open your **same project**.
2. In the left sidebar, click the **gear icon** (**“Project Settings”**).
3. In the left of the settings screen, click **“API”**.
4. On the API page you’ll see:
   - **Project URL** — copy it (e.g. `https://abcdefgh.supabase.co`). Save it and label it “Supabase URL”.
   - **Project API keys** — find the key labeled **“service_role”** (it’s long and starts with `eyJ...`). Click “Reveal” if needed, then copy it. Save it and label it “Supabase service role key”.
   - **Important:** The **service_role** key is secret. Never share it or commit it to GitHub. Only use it on your own machine or on a secure server.

You should now have four values written down:

1. Traffic Scotland Client Id  
2. Traffic Scotland Client Key  
3. Supabase URL  
4. Supabase service role key  

---

## Part C — Create the .env file for the receiver

The receiver script reads these four values from a file named **`.env`** so you don’t have to type them every time.

### C1. Go to the receiver folder

On your computer, open this folder:

- Your project folder: **`DriverHubApp`**
- Then: **`scripts`**
- Then: **`traffic-receiver`**

So the full path is something like:  
`C:\Users\eddie\Documents\DriverHubApp\scripts\traffic-receiver`

### C2. Create a new file named exactly `.env`

**Option 1 — Using Cursor or VS Code**

1. In the left file list, right‑click inside the **`traffic-receiver`** folder.
2. Click **“New File”**.
3. Type the name: **`.env`** (dot, then the word env, nothing else).
4. Press Enter.

**Option 2 — Using Notepad (Windows)**

1. Open **Notepad**.
2. Don’t type anything yet.
3. Click **File** → **Save As**.
4. In “Save as type” choose **“All Files (*.*)”**.
5. In “File name” type: **`.env`**.
6. In the folder list at the top, go to:  
   `C:\Users\eddie\Documents\DriverHubApp\scripts\traffic-receiver`
7. Click **Save**.

You should now have a file:  
`DriverHubApp\scripts\traffic-receiver\.env`

### C3. Put your four values in the file

Open the **`.env`** file in Cursor/Notepad. Put these four lines in it, **replacing** the example values with your real ones. Use **no quotes** and **no spaces** around the `=`.

```env
TRAFFIC_SCOTLAND_CLIENT_ID=paste_your_client_id_here
TRAFFIC_SCOTLAND_CLIENT_KEY=paste_your_client_key_here
SUPABASE_URL=paste_your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
```

Example (fake values):

```env
TRAFFIC_SCOTLAND_CLIENT_ID=abc123xyz
TRAFFIC_SCOTLAND_CLIENT_KEY=secretkey456
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **One line per value.** Don’t add extra blank lines between them if you can avoid it.
- **No spaces** before or after the `=`.
- **Save the file** (Ctrl+S) and close it.

---

## Part D — Run the receiver script

This script downloads traffic data from Traffic Scotland and saves it into your Supabase table.

### D1. Open a terminal/command line

**In Cursor (or VS Code):**

1. Menu **Terminal** → **New Terminal** (or press Ctrl+`).
2. A panel opens at the bottom with a command line.

**Or on Windows:**

1. Press the Windows key, type **cmd**, press Enter.
2. A black Command Prompt window opens.

### D2. Go to the receiver folder

In the terminal, type this and press Enter (use your real path if different):

```bash
cd C:\Users\eddie\Documents\DriverHubApp\scripts\traffic-receiver
```

If you opened the terminal **already inside** your project folder, you can type:

```bash
cd scripts\traffic-receiver
```

After you press Enter, the next line should show that you’re “in” that folder (the path at the start of the line often shows `...\traffic-receiver`).

### D3. Install dependencies (first time only)

Type this and press Enter:

```bash
npm install
```

- It may take one or two minutes. You’ll see a lot of text; that’s normal.
- When it finishes, you’ll get your command prompt back (no error message). You only need to do this once (or again if someone adds new dependencies).

### D4. Run the script

Type this and press Enter:

```bash
node index.js
```

**What you should see:**

- Lines like: `Fetching publications/UnplannedEvents/Content.xml...` then `X situation(s)`.
- Then: `Upserting X rows to Supabase...`
- Then: `Done.`

That means it worked. The traffic table in Supabase now has data.

**If you see an error instead:**

- **“Missing env: TRAFFIC_SCOTLAND_CLIENT_ID”** (or another name)  
  → The `.env` file is in the wrong place (it must be inside `scripts\traffic-receiver`) or a line is misspelled. Check the four line names match exactly:  
  `TRAFFIC_SCOTLAND_CLIENT_ID`, `TRAFFIC_SCOTLAND_CLIENT_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- **“HTTP 401”** or “Unauthorized”  
  → Your Traffic Scotland Client Id or Client Key is wrong. Copy them again from the developer portal.

- **“Failed to fetch”** or **“ECONNREFUSED”**  
  → Your internet might be down, or a firewall is blocking the script. Try again later or from a different network.

- **Supabase error** (e.g. “relation traffic_situations does not exist”)  
  → Part A didn’t run correctly. Go back to Part A and run the SQL in Supabase again.

---

## Part E — See the alerts in the app

1. Open a terminal and go to the **mobile** folder:
   ```bash
   cd C:\Users\eddie\Documents\DriverHubApp\mobile
   ```
2. Start the app:
   ```bash
   npx expo start
   ```
3. Open the app on your phone (Expo Go) or simulator as you usually do.
4. Log in if needed, then from the **Home** screen tap **“Traffic Alerts”**.
5. You should see a list of traffic alerts (or a message like “No traffic alerts right now” if the feed was empty when you ran the script).
6. You can **pull down** on the list to refresh and load the latest data from Supabase.

---

## Running the receiver again later

Traffic Scotland updates their data regularly. To refresh what’s in your app:

1. Open a terminal.
2. Run:
   ```bash
   cd C:\Users\eddie\Documents\DriverHubApp\scripts\traffic-receiver
   node index.js
   ```
3. When you see “Done.”, open the app and go to Traffic Alerts; pull to refresh.

You don’t need to run `npm install` again unless someone tells you the script dependencies changed.

---

## Part F — Automatic updates (so the app always has fresh data)

Right now the receiver only runs when you run it on your PC. To have it run **automatically** (e.g. every 15 minutes) so your app users always see up‑to‑date traffic data, you can use **GitHub Actions**.

### F1. Push your code to GitHub

Your project must be in a GitHub repo (you may already have this). Push the latest code including the `.github/workflows/traffic-receiver.yml` file. **Do not push your `.env` file** — it must stay only on your computer.

### F2. Add secrets in GitHub

1. Open your **GitHub repo** in the browser.
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and add these four secrets (one at a time). Use the **same values** as in your `.env` file:

   - Name: `TRAFFIC_SCOTLAND_CLIENT_ID`   → Value: your Client Id  
   - Name: `TRAFFIC_SCOTLAND_CLIENT_KEY`  → Value: your Client Key  
   - Name: `SUPABASE_URL`                 → Value: your Supabase URL  
   - Name: `SUPABASE_SERVICE_ROLE_KEY`   → Value: your service_role key  

4. Save each one. They will be used by the workflow when it runs.

### F3. What happens next

- The workflow **runs every 15 minutes** and calls the same receiver script (fetch from Traffic Scotland → update Supabase).
- You can also run it **manually**: go to the **Actions** tab → **Traffic receiver** → **Run workflow**.
- App users just **pull to refresh** on the Traffic Alerts tab to see the latest data; they don’t need to do anything else.

Once the secrets are set, you don’t need to run the script on your own computer for updates — the automation does it.

---

## Quick checklist

- [ ] Part A: Ran `traffic-schema.sql` in Supabase SQL Editor.
- [ ] Part B: Have Traffic Scotland Client Id and Client Key; have Supabase URL and service_role key.
- [ ] Part C: Created `.env` in `scripts/traffic-receiver` with those four values (no quotes, no spaces around `=`).
- [ ] Part D: In `scripts/traffic-receiver`, ran `npm install` then `node index.js` and saw “Done.”
- [ ] Part E: Opened the app, went to Traffic Alerts, and saw the list (or “No traffic alerts right now”).
- [ ] (Optional) Part F: Set up automatic updates with GitHub Actions and added the four secrets.

If you get stuck, note **which part** (A, B, C, D, E, or F) and the **exact message** you see (or a short description), and someone can help you with that step.

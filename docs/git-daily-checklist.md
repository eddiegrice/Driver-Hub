## Git + GitHub — daily checklist (PHD Matrix)

Use this when you sit down to work and when you finish. All commands run in **Command Prompt** from:

```cmd
cd c:\Users\eddie\Documents\DriverHubApp
```

---

### 1. Before you start work

1. Open Command Prompt and go to the project:
   ```cmd
   cd c:\Users\eddie\Documents\DriverHubApp
   ```
2. Make sure everything is clean (no half-finished changes):
   ```cmd
   git status
   ```
   - If it says **“nothing to commit, working tree clean”**, you’re good.
   - If it shows changes you don’t want to keep (today’s experiment went wrong), you can throw them away and go back to last good version:
     ```cmd
     git restore .
     ```
     (Only do this if you’re happy to **lose** those uncommitted changes.)
3. Make sure you have the latest from GitHub (if you ever work on more than one machine):
   ```cmd
   git pull
   ```

Now edit code, run Expo, etc.

---

### 2. While you’re working

- Test changes in Expo Go.
- **Only commit when the app is in a good, working state.**  
  If it’s broken, fix it before committing, or don’t commit it yet.

You can always see what changed with:
```cmd
git status
```

---

### 3. When you finish a piece of work (or are happy with today’s changes)

1. Go to the project (if you’re not already there):
   ```cmd
   cd c:\Users\eddie\Documents\DriverHubApp
   ```
2. Check what changed:
   ```cmd
   git status
   ```
3. Save the changes (stage them):
   ```cmd
   git add .
   ```
4. Make a snapshot (commit) with a short message:
   ```cmd
   git commit -m "Describe what you did, e.g. add Supabase email code login"
   ```
5. Send it to GitHub (so it’s backed up and becomes the latest version):
   ```cmd
   git push
   ```

That’s how you “save a day’s work as the latest version of the app.”

---

### 4. If today’s work breaks things and you want to undo it

#### A. You have **NOT** committed yet (only “modified” files)

1. Check status:
   ```cmd
   git status
   ```
2. If you decide to throw away today’s changes and go back to the last good commit:
   ```cmd
   git restore .
   ```
   This resets all files to the last commit (you lose uncommitted work, but your last good version is back).

#### B. You **already committed** something that breaks things

1. See recent commits:
   ```cmd
   git log --oneline
   ```
2. To undo the **last commit** by creating a new “undo” commit:
   ```cmd
   git revert HEAD
   git push
   ```
   - This keeps history clean and is safer than hard reset.

If you ever feel unsure, you can stop after `git status` or `git log` and ask for help with what you see.

---

### 5. Short version to remember

- **Start of work:**  
  `cd c:\Users\eddie\Documents\DriverHubApp` → `git status` → `git pull`
- **End of work (when app works):**  
  `git add .` → `git commit -m "what I did"` → `git push`
- **Throw away bad uncommitted changes:**  
  `git restore .`
- **Undo last bad commit:**  
  `git revert HEAD` → `git push`


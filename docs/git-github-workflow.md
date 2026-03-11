# Git + GitHub — DriverHub workflow

**Use GitHub as the main place for your code.** Everything you want to keep lives in the repo; you push to GitHub after each logical change so you can roll back or continue from another machine.

---

## One-time setup (if you haven’t already)

1. **Install Git for Windows**  
   https://git-scm.com/download/win — use default options (Git from the command line).

2. **Configure your name and email** (in Command Prompt):
   ```cmd
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
   ```

3. **Create the repo in this folder** (project root = `DriverHubApp`):
   ```cmd
   cd c:\Users\eddie\Documents\DriverHubApp
   git init
   ```

4. **Create a GitHub repo**  
   - Go to https://github.com/new  
   - Repository name, e.g. `driverhub-app`  
   - Do **not** tick “Add a README” or “Add .gitignore”  
   - Create repository  

5. **Connect and push** (replace `YOUR_USERNAME` with your GitHub username):
   ```cmd
   git remote add origin https://github.com/YOUR_USERNAME/driverhub-app.git
   git branch -M main
   git add .
   git commit -m "Initial commit: DriverHub app + Supabase auth + docs"
   git push -u origin main
   ```

---

## Day-to-day workflow (GitHub as main)

Do this from the **project root** (`c:\Users\eddie\Documents\DriverHubApp`).

### After you (or the AI) make changes

1. **See what changed**
   ```cmd
   cd c:\Users\eddie\Documents\DriverHubApp
   git status
   ```

2. **Save a snapshot (commit)**  
   When the app is in a good state (e.g. a feature works or a bug is fixed):
   ```cmd
   git add .
   git commit -m "Short description of what changed"
   ```

3. **Back it up on GitHub**
   ```cmd
   git push
   ```

Rule of thumb: **commit + push after each logical chunk of work** so GitHub always has your latest.

### If you need to roll back

- **Undo last commit but keep your file changes:**  
  `git reset --soft HEAD~1`

- **See history:**  
  `git log --oneline`

- **Restore the project to an older commit:**  
  `git log --oneline` → copy the commit hash → `git checkout <hash>` (this puts you in “detached HEAD”; ask before doing this if unsure).

---

## Branching (optional, for experiments)

- **main** = stable; what’s on GitHub and what you run in Expo Go day to day.
- For a risky or experimental change, you can create a branch, try it, then merge or discard:
  ```cmd
  git checkout -b try-new-feature
  ```
  Work as usual; commit and push the branch. When happy, merge into `main`; when not, switch back to `main` and delete the branch. You can add this later; starting with just `main` is fine.

---

## What is ignored (never committed)

The repo’s `.gitignore` (at project root) keeps these out of Git:

- `mobile/node_modules/`
- `mobile/.expo/`
- `mobile/.env` (Supabase URL and keys — **never** commit this)
- OS/editor junk (e.g. `.DS_Store`)

So `git add .` and `git commit` only snapshot code and docs, not secrets or build artifacts.

---

**Summary:** Work in `DriverHubApp` → commit with a clear message → push to GitHub. That’s the main workflow.

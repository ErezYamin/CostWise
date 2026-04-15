# Contributing to CostWise

## Branch workflow

### 1. Start new work — create your feature branch
```bash
git checkout develop          # make sure you're on develop
git pull origin develop       # get the latest changes from teammates
git checkout -b feature/<your-name>/<what-you're-building>
# example: git checkout -b feature/erez/dynamodb-tables
```

### 2. Do your work, then commit
```bash
git add <file>                # stage the files you changed
git commit -m "feat: short description of what you added"
```

### 3. Push your branch to GitHub
```bash
git push origin feature/<your-name>/<what-you're-building>
```

### 4. Open a Pull Request into `develop`
- Go to the repo on GitHub
- Click **"Compare & pull request"**
- Set base branch to `develop` (not `main`)
- Ask at least one teammate to review

### 5. After your PR is merged — clean up
```bash
git checkout develop
git pull origin develop       # sync your local develop with the merge
```

---

## Commit message format
```
feat: short description of what you added
fix: short description of what you fixed
```

## Before opening a PR
- Make sure your code runs locally
- Resolve any merge conflicts with develop yourself

---

## Branch structure reminder
- `main` → always demo-ready. Never push directly. Only updated via PR from develop.
- `develop` → integration branch. All features merge here first.
- `feature/<your-name>/<short-description>` → your working branch

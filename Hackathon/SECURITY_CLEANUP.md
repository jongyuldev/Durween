# Security Cleanup Guide

## ⚠️ IMMEDIATE ACTIONS REQUIRED

Your Google API key was exposed in the git repository. Follow these steps immediately:

### 1. Revoke the Exposed API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find the key: `AIzaSyCFpimihgusXxQFgSuRIr1bLK5OujNj9pw`
4. Click on it and select **Delete** or **Regenerate**

### 2. Generate a New API Key

1. In Google Cloud Console, create a new API key
2. Add appropriate restrictions (HTTP referrers, IP addresses, or API restrictions)
3. Copy the new key

### 3. Update Your Local Environment

1. Open the `.env` file
2. Replace `your_new_api_key_here` with your new API key
3. Save the file

### 4. Clean Git History

The exposed key exists in your git history. You need to remove it:

```bash
# Option 1: Using BFG Repo-Cleaner (recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: Using git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch test-gemini.js list-models.js" \
  --prune-empty --tag-name-filter cat -- --all
```

### 5. Force Push (if already pushed to remote)

⚠️ **Warning**: This rewrites history. Coordinate with team members.

```bash
git push origin --force --all
git push origin --force --tags
```

### 6. Verify the Cleanup

```bash
# Search for the old key in git history
git log -S "AIzaSyCFpimihgusXxQFgSuRIr1bLK5OujNj9pw" --all
```

## What Was Fixed

✅ Removed hardcoded API key from `test-gemini.js`
✅ Removed hardcoded API key from `list-models.js`
✅ Updated both files to use environment variables
✅ Created `.env.example` template
✅ Cleared the exposed key from `.env`

## Prevention

- Never commit API keys or secrets to git
- Always use environment variables
- Keep `.env` in `.gitignore` (already configured)
- Use `.env.example` as a template for team members
- Consider using a secrets manager for production

## Additional Security Measures

1. Enable API key restrictions in Google Cloud Console
2. Set up billing alerts
3. Monitor API usage regularly
4. Rotate keys periodically
5. Use different keys for development and production

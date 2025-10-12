# File Upload Feature Guide

## Overview
The Sunday School Question Bank now includes a **built-in file upload feature** that allows you to upload PDFs and images directly to your GitHub repository from the website - no need to use git commands!

## Features
✅ **Direct Upload to GitHub** - Files are automatically committed to your repository  
✅ **Drag & Drop Support** - Simply drag files into the upload zone  
✅ **Multiple File Upload** - Upload multiple files at once  
✅ **File Validation** - Automatic checking of file types and sizes  
✅ **Progress Tracking** - Real-time upload progress indicator  
✅ **Authentication** - Secure access using GitHub Personal Access Token  
✅ **Auto-Refresh** - Materials list refreshes automatically after upload  

## How to Use

### Step 1: Get a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name: `Sunday School Upload`
4. Set expiration: Choose your preferred duration
5. Select scopes:
   - For **public repositories**: Check `public_repo`
   - For **private repositories**: Check `repo`
6. Click **"Generate token"**
7. **Copy the token** (you won't see it again!)

### Step 2: Upload Files

1. **Open the website** and click the **"Upload"** button in the header
2. **Authenticate**:
   - Paste your GitHub Personal Access Token
   - Click "Authenticate"
   - The token is stored in your browser for future use
3. **Select Upload Details**:
   - Choose the **Class** (e.g., Class 1, Class 2, etc.)
   - Enter the **Year** (defaults to current year)
4. **Add Files**:
   - **Drag & drop** files into the upload zone, OR
   - Click the upload zone to browse and select files
5. **Review Files**:
   - See the list of selected files
   - Remove any unwanted files by clicking the ❌ icon
6. **Upload**:
   - Click the **"Upload Files"** button
   - Watch the progress bar
   - Wait for the success message

### Step 3: Done!
Your files are now in your GitHub repository and will appear on the website automatically!

## File Requirements

### Supported File Types
- **PDF**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

### File Size Limit
- Maximum: **25MB per file**
- GitHub has a 100MB repository file limit

### File Organization
Files are automatically organized in this structure:
```
question_paper/
├── class_1/
│   └── 2025/
│       └── your_file.pdf
├── class_2/
│   └── 2025/
│       └── your_image.jpg
```

## Security Notes

### Token Storage
- Your token is stored in **browser localStorage**
- It's only visible on your device
- Clear it by: Opening browser console and running `localStorage.removeItem('githubToken')`

### Token Permissions
- The token only has access to repositories you specify
- You can revoke the token anytime at [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)

### Best Practices
- ⚠️ **Don't share your token** with anyone
- ⚠️ **Don't commit the token** to any repository
- ✅ Use a **dedicated token** for uploads (not your main GitHub token)
- ✅ Set an **expiration date** on the token
- ✅ **Revoke old tokens** when no longer needed

## Troubleshooting

### "Invalid token" error
- Verify the token has the correct permissions (`repo` or `public_repo`)
- Check if the token hasn't expired
- Try generating a new token

### "Upload failed" error
- Check your internet connection
- Verify the file size is under 25MB
- Make sure the file type is supported
- Check GitHub service status

### File already exists
- You'll be prompted to overwrite
- Click OK to replace, or Cancel to skip

### Files not appearing after upload
- Click the **"Refresh"** button in the filters section
- Check your GitHub repository to verify the files were uploaded
- Clear your browser cache

## Tips

### Bulk Upload
- Select multiple files at once (Ctrl+Click or Shift+Click)
- Drag multiple files from your file explorer
- Maximum recommended: 10 files at once

### File Naming
- Use descriptive names: `class1_2025_midterm.pdf`
- Avoid special characters: `@ # $ % & * ( )`
- Spaces are OK but underscores are better

### Organization
- Upload files to the correct class immediately
- Use consistent year formatting
- Keep file names clear and searchable

## Advanced: GitHub API Rate Limits

### With Token (Authenticated)
- **5,000 requests per hour**
- Sufficient for most use cases

### Without Token (Unauthenticated)
- **60 requests per hour**
- Only affects viewing, not uploading (upload requires token)

## Mobile Upload

The upload feature is **fully mobile-friendly**:
- Touch-optimized buttons
- Mobile file picker support
- Responsive layout
- Works on iOS and Android

## FAQ

**Q: Can I upload from my phone?**  
A: Yes! The upload feature works on all devices.

**Q: Will this use my GitHub Actions minutes?**  
A: No, this uses the GitHub Contents API, not Actions.

**Q: Can multiple people upload?**  
A: Yes, if they have a valid GitHub token with write access to the repository.

**Q: What happens if I upload a duplicate file?**  
A: You'll be asked if you want to overwrite the existing file.

**Q: Can I delete files through the website?**  
A: Not yet. You'll need to delete files directly from GitHub.

**Q: Is there a daily upload limit?**  
A: GitHub doesn't have a file upload limit, but stay within the 5,000 API requests per hour.

## Need Help?

If you encounter any issues:
1. Check this guide first
2. Review browser console for errors (F12)
3. Verify your GitHub token permissions
4. Check the GitHub repository to see if files uploaded
5. Create an issue on the project repository

---

**Happy Uploading! 🎉**


# Sunday School Question Bank

A modern, static website that uses GitHub as a backend to store and serve question bank materials (PDFs and images) organized by class and year.

## Features

- 📚 Class and year-wise organization of materials
- 🔍 Real-time search functionality
- 🎨 Modern, responsive design
- 📱 Mobile-friendly interface
- 📄 Built-in PDF viewer
- 🖼️ Image gallery with modal viewer
- 🔄 Automatic content updates from GitHub
- 🚀 Zero backend - completely static
- ⚡ Fast and lightweight

## Setup Instructions

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository (e.g., `sunday-school-questions`)
2. You can make it public or private
3. Clone the repository to your local machine

### 2. Organize Your Files

Create a folder structure in your repository like this:

```
sunday-school-questions/
├── Class_1/
│   ├── 2024/
│   │   ├── question1.pdf
│   │   ├── question2.jpg
│   │   └── ...
│   └── 2023/
│       └── ...
├── Class_2/
│   ├── 2024/
│   │   └── ...
│   └── 2023/
│       └── ...
└── ...
```

**Folder naming conventions:**
- Class folders: `Class_1`, `Class_2`, `Class1`, `Grade_1`, etc.
- Year folders: `2024`, `2023`, etc. (4-digit years)
- Files: Any PDF, JPG, PNG, GIF, or WEBP files

### 3. Configure the Website

1. Open `config.js` in the website files
2. Update the following values:

```javascript
const CONFIG = {
    githubUsername: 'your-github-username',
    repositoryName: 'sunday-school-questions',
    branch: 'main',  // or 'master'
    questionsPath: '',  // if files are in a subfolder, specify here
    githubToken: '',  // optional, see below
};
```

### 4. GitHub Personal Access Token (Optional but Recommended)

GitHub has rate limits for unauthenticated API requests (60 requests per hour). To increase this limit:

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Sunday School Website")
4. Select scopes:
   - For public repos: `public_repo`
   - For private repos: `repo`
5. Generate and copy the token
6. Add it to `config.js`:

```javascript
githubToken: 'ghp_your_token_here',
```

⚠️ **Security Note**: If you're hosting this publicly, consider using environment variables or a backend proxy to hide your token.

### 5. Deploy the Website

You have several options:

#### Option A: GitHub Pages (Recommended)

1. Create a new repository for the website (e.g., `sunday-school-website`)
2. Push all the website files to this repository
3. Go to repository Settings > Pages
4. Select the branch (usually `main`) and root folder
5. Save and wait a few minutes
6. Your site will be available at `https://your-username.github.io/sunday-school-website/`

#### Option B: Netlify

1. Go to [Netlify](https://www.netlify.com/)
2. Drag and drop your website folder
3. Your site will be deployed instantly

#### Option C: Vercel

1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Deploy with one click

#### Option D: Any Static Hosting

You can host these files on any static hosting service like:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- Cloudflare Pages

## Usage

### Adding New Materials

1. Add your PDF or image files to the appropriate class and year folders in your GitHub repository
2. Commit and push the changes
3. The website will automatically fetch the new files (you may need to click the Refresh button)

### Updating Materials

1. Replace or update files in your GitHub repository
2. Commit and push the changes
3. Refresh the website to see updates

### Deleting Materials

1. Remove files from your GitHub repository
2. Commit and push the changes
3. Refresh the website

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Troubleshooting

### "Repository not found" error
- Check that your `githubUsername` and `repositoryName` in `config.js` are correct
- Make sure the repository is public or you've added a GitHub token with proper permissions

### "Rate limit exceeded" error
- Add a GitHub Personal Access Token in `config.js`
- This increases your rate limit from 60 to 5,000 requests per hour

### Files not showing up
- Verify your folder structure matches the expected format
- Check that file extensions are supported (PDF, JPG, PNG, GIF, WEBP)
- Ensure files are pushed to the correct branch

### PDF not displaying
- Some browsers may block PDF display from external sources
- Ensure your browser allows PDF viewing
- Try a different browser

## Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #4a90e2;
    --secondary-color: #357abd;
    /* ... other colors ... */
}
```

### Changing the Title

Edit `index.html`:

```html
<h1><i class="fas fa-book-open"></i> Your Custom Title</h1>
```

### Adding More File Types

Edit `app.js` and add extensions to the supported list:

```javascript
if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'docx'].includes(fileExt)) {
    // ...
}
```

## License

This project is open source and available for personal and educational use.

## Support

For issues or questions, please create an issue on the GitHub repository.



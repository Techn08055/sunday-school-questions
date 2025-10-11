// GitHub Repository Configuration
// Replace these values with your actual GitHub repository details

const CONFIG = {
    // Your GitHub username
    githubUsername: 'Techn08055',
    
    // Your repository name
    repositoryName: 'sunday-school-questions',
    
    // Branch name (usually 'main' or 'master')
    branch: 'main',
    
    // Path to the questions folder in your repository (leave empty if in root)
    // Example: 'questions' or 'materials/questions'
    questionsPath:'question_paper',
    
    // GitHub Personal Access Token (optional, but recommended for higher API rate limits)
    // Generate at: https://github.com/settings/tokens
    // Required scopes: public_repo (for public repos) or repo (for private repos)
    githubToken: '',
    
    // Folder structure in your repository
    // Expected structure: Class_1/2024/file.pdf or Class1/2024/image.jpg
    // The app will automatically detect classes and years from folder names
};

// DO NOT EDIT BELOW THIS LINE
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';



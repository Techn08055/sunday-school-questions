// Application State
let allMaterials = [];
let classes = new Set();
let years = new Set();
let uploadToken = '';
let selectedFiles = [];

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorTextEl = document.getElementById('errorText');
const contentEl = document.getElementById('content');
const emptyStateEl = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const classFilter = document.getElementById('classFilter');
const yearFilter = document.getElementById('yearFilter');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadMaterials();
    setupEventListeners();
    setupUploadListeners();
});

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', filterMaterials);
    classFilter.addEventListener('change', filterMaterials);
    yearFilter.addEventListener('change', filterMaterials);
    refreshBtn.addEventListener('click', () => {
        allMaterials = [];
        classes.clear();
        years.clear();
        loadMaterials();
    });
}

// Load materials from GitHub
async function loadMaterials() {
    showLoading();
    hideError();

    try {
        // Validate configuration
        if (!CONFIG.githubUsername || !CONFIG.repositoryName) {
            throw new Error('Please configure your GitHub repository details in config.js');
        }

        const materials = await fetchGitHubContents();
        allMaterials = materials;
        populateFilters();
        renderMaterials(allMaterials);
        hideLoading();
    } catch (error) {
        console.error('Error loading materials:', error);
        showError(error.message);
        hideLoading();
    }
}

// Fetch contents from GitHub repository
async function fetchGitHubContents(path = '') {
    const basePath = CONFIG.questionsPath ? `${CONFIG.questionsPath}/${path}` : path;
    const url = `${GITHUB_API_BASE}/repos/${CONFIG.githubUsername}/${CONFIG.repositoryName}/contents/${basePath}`;
    
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };

    if (CONFIG.githubToken) {
        headers['Authorization'] = `token ${CONFIG.githubToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Repository not found. Please check your configuration in config.js');
        } else if (response.status === 403) {
            throw new Error('Rate limit exceeded. Please add a GitHub token in config.js');
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const contents = await response.json();
    const materials = [];

    for (const item of contents) {
        if (item.type === 'dir') {
            // Recursively fetch contents of subdirectories
            const subMaterials = await fetchGitHubContents(path ? `${path}/${item.name}` : item.name);
            materials.push(...subMaterials);
        } else if (item.type === 'file') {
            const fileExt = item.name.split('.').pop().toLowerCase();
            if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                const pathParts = item.path.split('/');
                const material = {
                    name: item.name,
                    path: item.path,
                    downloadUrl: item.download_url,
                    type: fileExt === 'pdf' ? 'pdf' : 'image',
                    class: extractClass(pathParts),
                    year: extractYear(pathParts)
                };
                materials.push(material);
                
                // Add to sets for filtering
                if (material.class) classes.add(material.class);
                if (material.year) years.add(material.year);
            }
        }
    }

    return materials;
}

// Extract class from path
function extractClass(pathParts) {
    // Look for patterns like "Class_1", "Class1", "Grade_1", "Grade1"
    for (const part of pathParts) {
        const match = part.match(/(?:class|grade)[\s_-]*(\d+)/i);
        if (match) {
            return `Class ${match[1]}`;
        }
    }
    return pathParts[0] || 'Unknown';
}

// Extract year from path
function extractYear(pathParts) {
    // Look for 4-digit year patterns
    for (const part of pathParts) {
        const match = part.match(/\b(20\d{2})\b/);
        if (match) {
            return match[1];
        }
    }
    return 'Unknown';
}

// Populate filter dropdowns
function populateFilters() {
    // Clear existing options
    classFilter.innerHTML = '<option value="">All Classes</option>';
    yearFilter.innerHTML = '<option value="">All Years</option>';

    // Add class options
    Array.from(classes).sort().forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        classFilter.appendChild(option);
    });

    // Add year options
    Array.from(years).sort((a, b) => b.localeCompare(a)).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

// Filter materials based on search and filters
function filterMaterials() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedClass = classFilter.value;
    const selectedYear = yearFilter.value;

    const filtered = allMaterials.filter(material => {
        const matchesSearch = material.name.toLowerCase().includes(searchTerm);
        const matchesClass = !selectedClass || material.class === selectedClass;
        const matchesYear = !selectedYear || material.year === selectedYear;
        return matchesSearch && matchesClass && matchesYear;
    });

    renderMaterials(filtered);
}

// Render materials to the page
function renderMaterials(materials) {
    contentEl.innerHTML = '';

    if (materials.length === 0) {
        emptyStateEl.style.display = 'block';
        contentEl.style.display = 'none';
        return;
    }

    emptyStateEl.style.display = 'none';
    contentEl.style.display = 'grid';

    materials.forEach(material => {
        const card = createMaterialCard(material);
        contentEl.appendChild(card);
    });
}

// Create a material card element
function createMaterialCard(material) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openMaterial(material);

    const icon = material.type === 'pdf' ? 'fa-file-pdf' : 'fa-image';
    const iconClass = material.type === 'pdf' ? 'pdf' : 'image';

    card.innerHTML = `
        <div class="card-icon ${iconClass}">
            <i class="fas ${icon}"></i>
        </div>
        <div class="card-title">${material.name}</div>
        <div class="card-meta">
            <span class="badge badge-class">${material.class}</span>
            <span class="badge badge-year">${material.year}</span>
        </div>
    `;

    return card;
}

// Open material in modal
function openMaterial(material) {
    if (material.type === 'pdf') {
        openPdfModal(material);
    } else {
        openImageModal(material);
    }
}

// PDF Modal functions
function openPdfModal(material) {
    const modal = document.getElementById('pdfModal');
    const title = document.getElementById('pdfTitle');
    const viewer = document.getElementById('pdfViewer');

    title.textContent = material.name;
    viewer.src = material.downloadUrl;
    modal.classList.add('active');
}

function closePdfModal() {
    const modal = document.getElementById('pdfModal');
    const viewer = document.getElementById('pdfViewer');
    
    modal.classList.remove('active');
    viewer.src = '';
}

// Image Modal functions
function openImageModal(material) {
    const modal = document.getElementById('imageModal');
    const title = document.getElementById('imageTitle');
    const viewer = document.getElementById('imageViewer');

    title.textContent = material.name;
    viewer.src = material.downloadUrl;
    viewer.alt = material.name;
    modal.classList.add('active');
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    const viewer = document.getElementById('imageViewer');
    
    modal.classList.remove('active');
    viewer.src = '';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const pdfModal = document.getElementById('pdfModal');
    const imageModal = document.getElementById('imageModal');
    
    if (event.target === pdfModal) {
        closePdfModal();
    } else if (event.target === imageModal) {
        closeImageModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePdfModal();
        closeImageModal();
    }
});

// UI Helper functions
function showLoading() {
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
}

function hideLoading() {
    loadingEl.style.display = 'none';
}

function showError(message) {
    errorEl.style.display = 'flex';
    errorTextEl.textContent = message;
}

function hideError() {
    errorEl.style.display = 'none';
}

// ============================================
// UPLOAD FUNCTIONALITY
// ============================================

// Setup upload event listeners
function setupUploadListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const authBtn = document.getElementById('authBtn');
    const fileInput = document.getElementById('fileInput');
    const fileDropZone = document.getElementById('fileDropZone');
    const clearFilesBtn = document.getElementById('clearFilesBtn');
    const uploadFilesBtn = document.getElementById('uploadFilesBtn');

    uploadBtn.addEventListener('click', openUploadModal);
    authBtn.addEventListener('click', authenticateUser);
    fileInput.addEventListener('change', handleFileSelect);
    clearFilesBtn.addEventListener('click', clearSelectedFiles);
    uploadFilesBtn.addEventListener('click', uploadFiles);

    // Drag and drop events
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        addFilesToSelection(files);
    });
}

// Open upload modal
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.add('active');
    
    // Check if token is already stored
    const storedToken = localStorage.getItem('githubToken');
    if (storedToken) {
        uploadToken = storedToken;
        showUploadSection();
    }
}

// Close upload modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('active');
    clearSelectedFiles();
}

// Authenticate user with GitHub token
async function authenticateUser() {
    const tokenInput = document.getElementById('adminToken');
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('Please enter a GitHub Personal Access Token');
        return;
    }

    // Test the token by making a simple API call
    try {
        const response = await fetch(`${GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            uploadToken = token;
            localStorage.setItem('githubToken', token);
            showUploadSection();
            alert('Authentication successful!');
        } else {
            alert('Invalid token. Please check your GitHub Personal Access Token.');
        }
    } catch (error) {
        alert('Authentication failed. Please try again.');
        console.error('Auth error:', error);
    }
}

// Show upload section after authentication
function showUploadSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    
    // Set default year to current year
    const currentYear = new Date().getFullYear();
    document.getElementById('uploadYear').value = currentYear;
}

// Handle file selection from input
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToSelection(files);
}

// Add files to selection
function addFilesToSelection(files) {
    const validFiles = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
        const maxSize = 25 * 1024 * 1024; // 25MB
        
        if (!validExtensions.includes(ext)) {
            alert(`File "${file.name}" has an invalid type. Only PDF and image files are allowed.`);
            return false;
        }
        
        if (file.size > maxSize) {
            alert(`File "${file.name}" is too large. Maximum size is 25MB.`);
            return false;
        }
        
        return true;
    });

    selectedFiles = [...selectedFiles, ...validFiles];
    renderFileList();
    updateUploadButton();
}

// Render file list
function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
        return;
    }

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const ext = file.name.split('.').pop().toLowerCase();
        const icon = ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);

        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas ${icon}"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${sizeInMB} MB</div>
                </div>
            </div>
            <button class="remove-file-btn" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;

        fileList.appendChild(fileItem);
    });
}

// Remove file from selection
function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    updateUploadButton();
}

// Clear all selected files
function clearSelectedFiles() {
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    renderFileList();
    updateUploadButton();
}

// Update upload button state
function updateUploadButton() {
    const uploadBtn = document.getElementById('uploadFilesBtn');
    const classSelect = document.getElementById('uploadClass');
    const yearInput = document.getElementById('uploadYear');
    
    const hasFiles = selectedFiles.length > 0;
    const hasClass = classSelect.value !== '';
    const hasYear = yearInput.value !== '';
    
    uploadBtn.disabled = !(hasFiles && hasClass && hasYear);
}

// Upload files to GitHub
async function uploadFiles() {
    const classSelect = document.getElementById('uploadClass');
    const yearInput = document.getElementById('uploadYear');
    
    const className = classSelect.value;
    const year = yearInput.value;
    
    if (!className || !year || selectedFiles.length === 0) {
        alert('Please fill all fields and select at least one file');
        return;
    }

    // Show progress
    const progressSection = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('uploadFilesBtn');
    
    progressSection.style.display = 'block';
    uploadBtn.disabled = true;

    try {
        let uploaded = 0;
        const total = selectedFiles.length;

        for (const file of selectedFiles) {
            // Create folder structure: class_name/year/filename
            const folderName = className.toLowerCase().replace(/\s+/g, '_');
            const path = `${CONFIG.questionsPath}/${folderName}/${year}/${file.name}`;
            
            progressText.textContent = `Uploading ${file.name}... (${uploaded + 1}/${total})`;
            
            // Read file as base64
            const base64Content = await fileToBase64(file);
            
            // Upload to GitHub
            await uploadToGitHub(path, base64Content, file.name);
            
            uploaded++;
            const progress = (uploaded / total) * 100;
            progressFill.style.width = `${progress}%`;
            progressFill.textContent = `${Math.round(progress)}%`;
        }

        progressText.textContent = 'Upload complete!';
        alert(`Successfully uploaded ${total} file(s)!`);
        
        // Clear and close
        setTimeout(() => {
            closeUploadModal();
            progressSection.style.display = 'none';
            progressFill.style.width = '0%';
            
            // Refresh materials
            allMaterials = [];
            classes.clear();
            years.clear();
            loadMaterials();
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
        progressSection.style.display = 'none';
        uploadBtn.disabled = false;
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Upload file to GitHub repository
async function uploadToGitHub(path, content, filename) {
    const url = `${GITHUB_API_BASE}/repos/${CONFIG.githubUsername}/${CONFIG.repositoryName}/contents/${path}`;
    
    // Check if file already exists
    let sha = null;
    try {
        const checkResponse = await fetch(url, {
            headers: {
                'Authorization': `token ${uploadToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (checkResponse.ok) {
            const existingFile = await checkResponse.json();
            sha = existingFile.sha;
            
            const overwrite = confirm(`File "${filename}" already exists. Overwrite?`);
            if (!overwrite) {
                throw new Error('Upload cancelled by user');
            }
        }
    } catch (error) {
        // File doesn't exist, continue with upload
    }

    // Create or update file
    const payload = {
        message: `Upload ${filename} via web interface`,
        content: content,
        branch: CONFIG.branch
    };

    if (sha) {
        payload.sha = sha;
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${uploadToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
    }

    return await response.json();
}

// Add event listeners for form changes
document.addEventListener('DOMContentLoaded', () => {
    const classSelect = document.getElementById('uploadClass');
    const yearInput = document.getElementById('uploadYear');
    
    if (classSelect) {
        classSelect.addEventListener('change', updateUploadButton);
    }
    
    if (yearInput) {
        yearInput.addEventListener('input', updateUploadButton);
    }
});



// Application State
let allMaterials = [];
let classes = new Set();
let years = new Set();

// PDF State
let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;

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
    setupPdfControls();
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

// Setup PDF controls
function setupPdfControls() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInput = document.getElementById('pageInput');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (pdfDoc && currentPage > 1) {
                renderPage(--currentPage);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (pdfDoc && currentPage < pdfDoc.numPages) {
                renderPage(++currentPage);
            }
        });
    }

    if (pageInput) {
        pageInput.addEventListener('change', () => {
            const pageNum = parseInt(pageInput.value);
            if (pdfDoc && pageNum >= 1 && pageNum <= pdfDoc.numPages) {
                renderPage(pageNum);
            } else {
                pageInput.value = currentPage;
            }
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            scale += 0.2;
            if (pdfDoc) renderPage(currentPage);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (scale > 0.5) {
                scale -= 0.2;
                if (pdfDoc) renderPage(currentPage);
            }
        });
    }
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

// PDF Modal functions - with PDF.js support
async function openPdfModal(material) {
    const modal = document.getElementById('pdfModal');
    const title = document.getElementById('pdfTitle');
    const downloadBtn = document.getElementById('pdfDownloadBtn');

    title.textContent = material.name;
    downloadBtn.href = material.downloadUrl;
    downloadBtn.download = material.name;

    modal.classList.add('active');

    try {
        // Load PDF using PDF.js
        const pdf = await pdfjsLib.getDocument(material.downloadUrl).promise;
        pdfDoc = pdf;
        currentPage = 1;
        scale = 1.5;
        
        // Update page count
        document.getElementById('pageCount').textContent = ` / ${pdf.numPages}`;
        document.getElementById('pageInput').max = pdf.numPages;
        
        // Render first page
        renderPage(currentPage);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. It may not be accessible from this URL.\n\nTip: You can still download it using the download button.');
    }
}

function closePdfModal() {
    const modal = document.getElementById('pdfModal');
    const canvas = document.getElementById('pdfCanvas');
    
    modal.classList.remove('active');
    pdfDoc = null;
    currentPage = 1;
    scale = 1.5;
    if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
    }
}

async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Update page input
        document.getElementById('pageInput').value = pageNum;
        currentPage = pageNum;
    } catch (error) {
        console.error('Error rendering page:', error);
    }
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

// Application State
let allMaterials = [];
let classes = new Set();
let years = new Set();

// PDF State
let pdfDoc = null;
let scale = 1.2;
let allPagesRendered = false;

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
const pdfViewerContainer = document.getElementById('pdfViewerContainer');
const pdfPagesContainer = document.getElementById('pdfPagesContainer');
const mainContent = document.querySelector('main');
const header = document.querySelector('header');
const footer = document.querySelector('footer');
const emptyStateTitle = document.getElementById('emptyStateTitle');
const emptyStateMessage = document.getElementById('emptyStateMessage');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadMaterials();
    setupEventListeners();
    setupPdfControls();
});

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', filterMaterials);
    classFilter.addEventListener('change', () => {
        filterMaterials();
        // When class is selected, show only that class's materials
        if (classFilter.value) {
            filterMaterials();
        }
    });
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
    const backBtn = document.getElementById('pdfBackBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const wheelZoomHandler = (e) => {
        if (!pdfDoc || pdfViewerContainer.style.display !== 'flex') return;
        // Only zoom on Ctrl/Command + wheel to not block normal scrolling
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            const step = 0.1;
            if (delta < 0) {
                scale += step;
            } else {
                scale = Math.max(0.3, scale - step);
            }
            renderAllPages();
        }
    };

    if (backBtn) {
        backBtn.addEventListener('click', closePdfViewer);
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            scale += 0.2;
            if (pdfDoc && allPagesRendered) {
                renderAllPages();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (scale > 0.3) {
                scale -= 0.2;
                if (pdfDoc && allPagesRendered) {
                    renderAllPages();
                }
            }
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            scale = 1.2;
            if (pdfDoc && allPagesRendered) {
                renderAllPages();
            }
        });
    }

    // Wheel zoom (Ctrl/Cmd + scroll) on the full-screen viewer
    if (pdfViewerContainer) {
        // Use non-passive to allow preventDefault when zooming
        pdfViewerContainer.addEventListener('wheel', wheelZoomHandler, { passive: false });
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
        // Show empty state initially prompting to select a class
        contentEl.innerHTML = '';
        emptyStateEl.style.display = 'block';
        contentEl.style.display = 'none';
        emptyStateTitle.textContent = 'Select a Class';
        emptyStateMessage.textContent = 'Please select a class from the dropdown to view question papers';
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

// Filter materials based on search and filters - show only selected class
function filterMaterials() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedClass = classFilter.value;
    const selectedYear = yearFilter.value;

    // If no class is selected, show empty (as per user requirement)
    if (!selectedClass) {
        contentEl.innerHTML = '';
        emptyStateEl.style.display = 'block';
        contentEl.style.display = 'none';
        emptyStateTitle.textContent = 'Select a Class';
        emptyStateMessage.textContent = 'Please select a class from the dropdown to view question papers';
        return;
    }

    const filtered = allMaterials.filter(material => {
        const matchesSearch = material.name.toLowerCase().includes(searchTerm);
        const matchesClass = material.class === selectedClass; // Only selected class
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
        emptyStateTitle.textContent = 'No materials found';
        emptyStateMessage.textContent = 'Try adjusting your filters or search criteria';
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

// Open material
function openMaterial(material) {
    if (material.type === 'pdf') {
        openPdfViewer(material);
    } else {
        openImageModal(material);
    }
}

// PDF Viewer functions - Full screen with all pages
async function openPdfViewer(material) {
    const title = document.getElementById('pdfTitle');
    const downloadBtn = document.getElementById('pdfDownloadBtn');
    const pageCountInfo = document.getElementById('pageCountInfo');

    title.textContent = material.name;
    downloadBtn.href = material.downloadUrl;
    downloadBtn.download = material.name;
    
    // Hide main content, header, footer and show PDF viewer
    mainContent.style.display = 'none';
    header.style.display = 'none';
    footer.style.display = 'none';
    pdfViewerContainer.style.display = 'flex';
    pdfPagesContainer.innerHTML = '';
    pageCountInfo.textContent = 'Loading...';
    allPagesRendered = false;

    try {
        // Load PDF using PDF.js
        const pdf = await pdfjsLib.getDocument(material.downloadUrl).promise;
        pdfDoc = pdf;
        scale = 1.2;
        
        // Update page count
        pageCountInfo.textContent = `${pdf.numPages} pages`;
        
        // Render all pages
        await renderAllPages();
    } catch (error) {
        console.error('Error loading PDF:', error);
        pageCountInfo.textContent = 'Error loading PDF';
        pdfPagesContainer.innerHTML = `
            <div class="pdf-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading PDF. <a href="${material.downloadUrl}" download="${material.name}" class="download-link">Click here to download</a></p>
            </div>
        `;
    }
}

function closePdfViewer() {
    pdfViewerContainer.style.display = 'none';
    mainContent.style.display = 'block';
    header.style.display = 'block';
    footer.style.display = 'block';
    pdfDoc = null;
    allPagesRendered = false;
    pdfPagesContainer.innerHTML = '';
    scale = 1.2;
}

async function renderAllPages() {
    if (!pdfDoc) return;
    
    pdfPagesContainer.innerHTML = '';
    allPagesRendered = false;

    try {
        // Render all pages at once
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale });
            
            // Create canvas for each page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = 'pdf-page-canvas';
            
            // Create container for each page
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.appendChild(canvas);
            pdfPagesContainer.appendChild(pageContainer);
            
            // Render page
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        }
        
        allPagesRendered = true;
    } catch (error) {
        console.error('Error rendering pages:', error);
        pdfPagesContainer.innerHTML = `
            <div class="pdf-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error rendering PDF pages</p>
            </div>
        `;
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

// Close image modal when clicking outside
window.onclick = function(event) {
    const imageModal = document.getElementById('imageModal');
    if (event.target === imageModal) {
        closeImageModal();
    }
}

// Close viewer with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (pdfViewerContainer.style.display === 'flex') {
            closePdfViewer();
        }
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

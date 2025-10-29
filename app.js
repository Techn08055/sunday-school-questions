// Application State
let allMaterials = [];
let classes = new Set();
let years = new Set();

// PDF State
let pdfDoc = null;
let scale = 1.2;
let allPagesRendered = false;
let renderedPages = new Set();
let pageRenderQueue = [];
let intersectionObserver = null;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
            if (pdfDoc) {
                renderAllPages();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (scale > 0.3) {
                scale -= 0.2;
                if (pdfDoc) {
                    renderAllPages();
                }
            }
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            scale = isMobile ? 0.8 : 1.2;
            if (pdfDoc) {
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
    renderedPages.clear();
    pageRenderQueue = [];
    
    // Cleanup previous observer
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
    }

    try {
        // Load PDF using PDF.js with optimized settings for mobile
        const loadingTask = pdfjsLib.getDocument({
            url: material.downloadUrl,
            disableAutoFetch: false,
            disableStream: false,
            verbosity: 0 // Reduce console output for better performance
        });
        
        const pdf = await loadingTask.promise;
        pdfDoc = pdf;
        
        // Use lower scale on mobile for better performance
        scale = isMobile ? 0.8 : 1.2;
        
        // Update page count
        pageCountInfo.textContent = `${pdf.numPages} pages`;
        
        // Initialize pages with lazy loading (this is fast now!)
        await initializePagesWithLazyLoading();
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
    renderedPages.clear();
    pageRenderQueue = [];
    pdfPagesContainer.innerHTML = '';
    scale = isMobile ? 0.8 : 1.2;
    
    // Cleanup observer
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
    }
}

// Initialize pages with lazy loading for mobile performance
async function initializePagesWithLazyLoading() {
    if (!pdfDoc) return;
    
    pdfPagesContainer.innerHTML = '';
    renderedPages.clear();
    
    // Create page containers first (visible immediately)
    const pagesToPreload = isMobile ? 2 : 5; // Preload fewer pages on mobile
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container pdf-page-placeholder';
        pageContainer.dataset.pageNum = pageNum;
        
        // Create loading placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'pdf-page-loading';
        placeholder.innerHTML = '<div class="loading-spinner"></div><p>Loading page ' + pageNum + '...</p>';
        pageContainer.appendChild(placeholder);
        
        // Create canvas element (hidden initially)
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        canvas.style.display = 'none';
        pageContainer.appendChild(canvas);
        
        pdfPagesContainer.appendChild(pageContainer);
    }
    
    // Preload first few pages immediately
    for (let i = 1; i <= Math.min(pagesToPreload, pdfDoc.numPages); i++) {
        await renderPage(i);
    }
    
    // Setup Intersection Observer for lazy loading remaining pages
    setupIntersectionObserver();
}

// Setup Intersection Observer for lazy loading
function setupIntersectionObserver() {
    if (!pdfDoc || !window.IntersectionObserver) {
        // Fallback: render all pages if IntersectionObserver not supported
        renderRemainingPages();
        return;
    }
    
    const options = {
        root: pdfPagesContainer.closest('.pdf-viewer-body'),
        rootMargin: '200px', // Start loading 200px before page is visible
        threshold: 0.1
    };
    
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageNum = parseInt(entry.target.dataset.pageNum);
                if (!renderedPages.has(pageNum)) {
                    renderPage(pageNum);
                }
                // Unobserve after rendering to avoid re-rendering
                intersectionObserver.unobserve(entry.target);
            }
        });
    }, options);
    
    // Observe all page containers
    const pageContainers = pdfPagesContainer.querySelectorAll('.pdf-page-container');
    pageContainers.forEach(container => {
        intersectionObserver.observe(container);
    });
}

// Render a single page
async function renderPage(pageNum) {
    if (!pdfDoc || renderedPages.has(pageNum)) return;
    
    renderedPages.add(pageNum);
    const pageContainer = pdfPagesContainer.querySelector(`[data-page-num="${pageNum}"]`);
    if (!pageContainer) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = pageContainer.querySelector('.pdf-page-canvas');
        const context = canvas.getContext('2d');
        
        // Optimize canvas size for mobile
        if (isMobile) {
            // Reduce DPR on mobile for better performance
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = viewport.width * dpr;
            canvas.height = viewport.height * dpr;
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            context.scale(dpr, dpr);
        } else {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
        }
        
        // Hide placeholder, show canvas
        const placeholder = pageContainer.querySelector('.pdf-page-loading');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        canvas.style.display = 'block';
        
        // Render page
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Remove placeholder class
        pageContainer.classList.remove('pdf-page-placeholder');
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
        const placeholder = pageContainer.querySelector('.pdf-page-loading');
        if (placeholder) {
            placeholder.innerHTML = '<p>Error loading page ' + pageNum + '</p>';
        }
    }
}

// Render all remaining pages (fallback or on demand)
async function renderRemainingPages() {
    if (!pdfDoc) return;
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (!renderedPages.has(pageNum)) {
            await renderPage(pageNum);
        }
    }
    
    allPagesRendered = true;
}

// Legacy function for zoom controls - now triggers re-render with lazy loading
async function renderAllPages() {
    if (!pdfDoc) return;
    
    // Clear existing renders
    renderedPages.clear();
    
    // Remove existing canvases but keep containers
    const canvases = pdfPagesContainer.querySelectorAll('.pdf-page-canvas');
    canvases.forEach(canvas => {
        canvas.style.display = 'none';
        canvas.width = 0;
        canvas.height = 0;
    });
    
    // Show placeholders again
    const placeholders = pdfPagesContainer.querySelectorAll('.pdf-page-loading');
    placeholders.forEach(placeholder => {
        placeholder.style.display = 'block';
    });
    
    // Re-render all pages with new scale
    await renderRemainingPages();
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

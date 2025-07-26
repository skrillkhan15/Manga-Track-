// Data Models and Storage System
class MangaTracker {
    constructor() {
        this.storageKey = 'mangaTrackerData';
        this.data = this.loadData();
        this.initializeDefaultData();
    }

    // Initialize default data structure
    initializeDefaultData() {
        if (!this.data.manga) this.data.manga = [];
        if (!this.data.readingSessions) this.data.readingSessions = [];
        if (!this.data.settings) this.data.settings = {
            dailyGoal: 5,
            theme: 'light',
            notifications: true
        };
        if (!this.data.tags) this.data.tags = ['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi'];
        if (!this.data.bookmarks) this.data.bookmarks = [];
        if (!this.data.history) this.data.history = [];
        this.saveData();
    }

    // Load data from localStorage
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    // Save data to localStorage
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Manga CRUD operations
    addManga(mangaData) {
        const manga = {
            id: this.generateId(),
            title: mangaData.title,
            type: mangaData.type || 'manga', // manga, manhwa, manhua
            status: mangaData.status || 'reading', // reading, completed, on-hold, dropped, plan-to-read
            currentChapter: mangaData.currentChapter || 0,
            totalChapters: mangaData.totalChapters || null,
            rating: mangaData.rating || null,
            tags: mangaData.tags || [],
            notes: mangaData.notes || '',
            coverImage: mangaData.coverImage || null,
            author: mangaData.author || '',
            startDate: mangaData.startDate || new Date().toISOString(),
            endDate: mangaData.endDate || null,
            lastRead: mangaData.lastRead || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.data.manga.push(manga);
        this.saveData();
        return manga;
    }

    updateManga(id, updates) {
        const index = this.data.manga.findIndex(m => m.id === id);
        if (index !== -1) {
            this.data.manga[index] = {
                ...this.data.manga[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveData();
            return this.data.manga[index];
        }
        return null;
    }

    deleteManga(id) {
        const index = this.data.manga.findIndex(m => m.id === id);
        if (index !== -1) {
            const deleted = this.data.manga.splice(index, 1)[0];
            this.saveData();
            return deleted;
        }
        return null;
    }

    getManga(id) {
        return this.data.manga.find(m => m.id === id);
    }

    getAllManga() {
        return this.data.manga;
    }

    // Reading session operations
    startReadingSession(mangaId) {
        const session = {
            id: this.generateId(),
            mangaId: mangaId,
            startTime: new Date().toISOString(),
            endTime: null,
            chaptersRead: 0,
            active: true
        };
        
        this.data.readingSessions.push(session);
        this.saveData();
        return session;
    }

    endReadingSession(sessionId, chaptersRead = 0) {
        const session = this.data.readingSessions.find(s => s.id === sessionId);
        if (session) {
            session.endTime = new Date().toISOString();
            session.chaptersRead = chaptersRead;
            session.active = false;
            this.saveData();
            
            // Update manga progress
            if (session.mangaId && chaptersRead > 0) {
                const manga = this.getManga(session.mangaId);
                if (manga) {
                    this.updateManga(manga.id, {
                        currentChapter: manga.currentChapter + chaptersRead,
                        lastRead: new Date().toISOString()
                    });
                }
            }
            
            return session;
        }
        return null;
    }

    getActiveSession() {
        return this.data.readingSessions.find(s => s.active);
    }

    // Statistics and analytics
    getStatistics() {
        const manga = this.data.manga;
        const sessions = this.data.readingSessions.filter(s => !s.active);
        
        const stats = {
            totalManga: manga.length,
            currentlyReading: manga.filter(m => m.status === 'reading').length,
            completed: manga.filter(m => m.status === 'completed').length,
            onHold: manga.filter(m => m.status === 'on-hold').length,
            dropped: manga.filter(m => m.status === 'dropped').length,
            planToRead: manga.filter(m => m.status === 'plan-to-read').length,
            totalChaptersRead: manga.reduce((sum, m) => sum + m.currentChapter, 0),
            totalReadingSessions: sessions.length,
            averageSessionTime: this.calculateAverageSessionTime(sessions),
            dailyProgress: this.getDailyProgress(),
            weeklyProgress: this.getWeeklyProgress(),
            monthlyProgress: this.getMonthlyProgress()
        };
        
        return stats;
    }

    calculateAverageSessionTime(sessions) {
        if (sessions.length === 0) return 0;
        
        const totalTime = sessions.reduce((sum, session) => {
            if (session.startTime && session.endTime) {
                const start = new Date(session.startTime);
                const end = new Date(session.endTime);
                return sum + (end - start);
            }
            return sum;
        }, 0);
        
        return Math.round(totalTime / sessions.length / 1000 / 60); // Average in minutes
    }

    getDailyProgress() {
        const today = new Date().toDateString();
        const todaySessions = this.data.readingSessions.filter(s => 
            !s.active && s.endTime && new Date(s.endTime).toDateString() === today
        );
        
        return todaySessions.reduce((sum, s) => sum + s.chaptersRead, 0);
    }

    getWeeklyProgress() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weekSessions = this.data.readingSessions.filter(s => 
            !s.active && s.endTime && new Date(s.endTime) >= oneWeekAgo
        );
        
        return weekSessions.reduce((sum, s) => sum + s.chaptersRead, 0);
    }

    getMonthlyProgress() {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const monthSessions = this.data.readingSessions.filter(s => 
            !s.active && s.endTime && new Date(s.endTime) >= oneMonthAgo
        );
        
        return monthSessions.reduce((sum, s) => sum + s.chaptersRead, 0);
    }

    // Search and filter operations
    searchManga(query, filters = {}) {
        let results = this.data.manga;
        
        // Text search
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(manga => 
                manga.title.toLowerCase().includes(searchTerm) ||
                manga.author.toLowerCase().includes(searchTerm) ||
                manga.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply filters
        if (filters.status) {
            results = results.filter(manga => manga.status === filters.status);
        }
        
        if (filters.type) {
            results = results.filter(manga => manga.type === filters.type);
        }
        
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(manga => 
                filters.tags.some(tag => manga.tags.includes(tag))
            );
        }
        
        return results;
    }

    // Bookmark operations
    addBookmark(mangaId, chapterNumber, note = '') {
        const bookmark = {
            id: this.generateId(),
            mangaId: mangaId,
            chapterNumber: chapterNumber,
            note: note,
            createdAt: new Date().toISOString()
        };
        
        this.data.bookmarks.push(bookmark);
        this.saveData();
        return bookmark;
    }

    removeBookmark(id) {
        const index = this.data.bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            const deleted = this.data.bookmarks.splice(index, 1)[0];
            this.saveData();
            return deleted;
        }
        return null;
    }

    // History operations
    addToHistory(mangaId, action, details = {}) {
        const historyEntry = {
            id: this.generateId(),
            mangaId: mangaId,
            action: action, // 'read', 'added', 'completed', 'updated'
            details: details,
            timestamp: new Date().toISOString()
        };
        
        this.data.history.unshift(historyEntry); // Add to beginning
        
        // Keep only last 100 entries
        if (this.data.history.length > 100) {
            this.data.history = this.data.history.slice(0, 100);
        }
        
        this.saveData();
        return historyEntry;
    }

    getRecentActivity(limit = 10) {
        return this.data.history.slice(0, limit);
    }
}

// Initialize the manga tracker
const mangaTracker = new MangaTracker();

// UI Controller
class UIController {
    constructor(tracker) {
        this.tracker = tracker;
        this.currentView = 'dashboard';
        this.activeTimer = null;
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupTimerButton();
        this.setupMobileMenu();
        this.setupAddMangaModal();
        this.loadDashboard();
    }

    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('show');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });

        // Close sidebar when clicking nav links on mobile
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('show');
                }
            });
        });
    }

    setupAddMangaModal() {
        const form = document.getElementById('add-manga-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddManga();
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const hash = link.getAttribute('href').substring(1);
                this.navigateTo(hash);
            });
        });

        // Handle initial load
        const initialHash = window.location.hash.substring(1) || 'dashboard';
        this.navigateTo(initialHash);

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'dashboard';
            this.navigateTo(hash);
        });
    }

    navigateTo(view) {
        // Update active navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav-link[href="#${view}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update URL
        window.location.hash = view;
        
        // Load content
        this.currentView = view;
        this.loadContent(view);
    }

    loadContent(view) {
        const mainContent = document.getElementById('main-content');
        
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'my-manga':
                this.loadMyManga();
                break;
            case 'library':
                this.loadLibrary();
                break;
            case 'discover':
                this.loadDiscover();
                break;
            case 'bookmarks':
                this.loadBookmarks();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'tags':
                this.loadTags();
                break;
            case 'settings':
                this.loadSettings();
                break;
            default:
                this.loadDashboard();
        }
    }

    loadDashboard() {
        const stats = this.tracker.getStatistics();
        const recentActivity = this.tracker.getRecentActivity(5);
        
        const content = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Dashboard</h1>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow card">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-700">Total Manga</h2>
                            <p class="text-3xl font-bold text-blue-600">${stats.totalManga}</p>
                        </div>
                        <div class="text-blue-500 text-2xl">📚</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow card">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-700">Currently Reading</h2>
                            <p class="text-3xl font-bold text-green-600">${stats.currentlyReading}</p>
                        </div>
                        <div class="text-green-500 text-2xl">📖</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow card">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-700">Completed</h2>
                            <p class="text-3xl font-bold text-purple-600">${stats.completed}</p>
                        </div>
                        <div class="text-purple-500 text-2xl">✅</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow card">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-700">Chapters Read</h2>
                            <p class="text-3xl font-bold text-orange-600">${stats.totalChaptersRead}</p>
                        </div>
                        <div class="text-orange-500 text-2xl">📄</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
                    <div class="space-y-4">
                        ${recentActivity.length > 0 ? recentActivity.map(activity => {
                            const manga = this.tracker.getManga(activity.mangaId);
                            const mangaTitle = manga ? manga.title : 'Unknown Manga';
                            return `
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-900 font-medium">${mangaTitle}</p>
                                        <p class="text-gray-500 text-sm">${this.formatDate(activity.timestamp)}</p>
                                    </div>
                                    <span class="text-green-600 font-bold">${activity.action}</span>
                                </div>
                            `;
                        }).join('') : '<p class="text-gray-500">No recent activity</p>'}
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Reading Goals</h2>
                    <div class="space-y-4">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <p class="text-gray-900 font-medium">Daily Goal</p>
                                <span class="text-blue-600 font-bold">${stats.dailyProgress}/${this.tracker.data.settings.dailyGoal}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((stats.dailyProgress / this.tracker.data.settings.dailyGoal) * 100, 100)}%"></div>
                            </div>
                            <p class="text-gray-500 text-sm mt-2">${this.tracker.data.settings.dailyGoal} chapters</p>
                        </div>
                        
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <p class="text-gray-900 font-medium">Weekly Progress</p>
                                <span class="text-green-600 font-bold">${stats.weeklyProgress}</span>
                            </div>
                        </div>
                        
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <p class="text-gray-900 font-medium">Monthly Progress</p>
                                <span class="text-purple-600 font-bold">${stats.monthlyProgress}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
    }

    loadMyManga() {
        const manga = this.tracker.getAllManga();
        
        const content = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">My Manga</h1>
                <button onclick="uiController.showAddMangaModal()" class="btn-primary">Add Manga</button>
            </header>

            <div class="mb-6 space-y-4">
                <div class="flex flex-col md:flex-row gap-4">
                    <input type="text" id="manga-search" placeholder="Search manga..." class="search-input flex-1" onkeyup="uiController.filterManga()">
                    <select id="status-filter" class="form-input md:w-48" onchange="uiController.filterManga()">
                        <option value="">All Status</option>
                        <option value="reading">Reading</option>
                        <option value="completed">Completed</option>
                        <option value="on-hold">On Hold</option>
                        <option value="dropped">Dropped</option>
                        <option value="plan-to-read">Plan to Read</option>
                    </select>
                    <select id="type-filter" class="form-input md:w-48" onchange="uiController.filterManga()">
                        <option value="">All Types</option>
                        <option value="manga">Manga</option>
                        <option value="manhwa">Manhwa</option>
                        <option value="manhua">Manhua</option>
                    </select>
                    <select id="sort-by" class="form-input md:w-48" onchange="uiController.filterManga()">
                        <option value="title">Sort by Title</option>
                        <option value="lastRead">Last Read</option>
                        <option value="progress">Progress</option>
                        <option value="rating">Rating</option>
                        <option value="createdAt">Date Added</option>
                    </select>
                </div>
                
                <div class="flex flex-wrap gap-2">
                    <span class="text-sm text-gray-600">Filter by tags:</span>
                    ${this.tracker.data.tags.map(tag => `
                        <button class="tag" onclick="uiController.toggleTagFilter('${tag}')" data-tag="${tag}">${tag}</button>
                    `).join('')}
                </div>
            </div>

            <div id="manga-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${this.renderMangaCards(manga)}
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
        this.selectedTags = [];
    }

    renderMangaCards(mangaList) {
        if (mangaList.length === 0) {
            return `
                <div class="col-span-full empty-state">
                    <svg class="mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No manga found</h3>
                    <p class="text-gray-500 mb-4">Start building your collection by adding your first manga!</p>
                    <button onclick="uiController.showAddMangaModal()" class="btn-primary">Add Your First Manga</button>
                </div>
            `;
        }

        return mangaList.map(manga => {
            const progressPercent = manga.totalChapters ? 
                Math.round((manga.currentChapter / manga.totalChapters) * 100) : 0;
            
            return `
                <div class="manga-card">
                    <div class="manga-card-image bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <span class="text-4xl">📚</span>
                    </div>
                    <div class="manga-card-content">
                        <h3 class="manga-card-title">${manga.title}</h3>
                        <div class="manga-card-meta">
                            <span class="status-badge ${this.getStatusBadgeClass(manga.status)}">${manga.status}</span>
                            <span class="type-badge ${this.getTypeBadgeClass(manga.type)}">${manga.type}</span>
                        </div>
                        <div class="manga-card-meta">
                            ${manga.author ? `<p>by ${manga.author}</p>` : ''}
                            <p>Chapter ${manga.currentChapter}${manga.totalChapters ? ` / ${manga.totalChapters}` : ''}</p>
                            ${manga.totalChapters ? `<div class="progress-bar mt-2"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>` : ''}
                        </div>
                        ${manga.tags.length > 0 ? `
                            <div class="mt-2">
                                ${manga.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="manga-card-actions mt-4">
                            <button onclick="uiController.quickUpdateProgress('${manga.id}')" class="btn-edit">Update Progress</button>
                            <button onclick="uiController.editManga('${manga.id}')" class="btn-edit">Edit</button>
                            <button onclick="uiController.deleteManga('${manga.id}')" class="btn-delete">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterManga() {
        const searchTerm = document.getElementById('manga-search').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        
        let filteredManga = this.tracker.searchManga(searchTerm, {
            status: statusFilter,
            type: typeFilter,
            tags: this.selectedTags || []
        });
        
        // Sort manga
        filteredManga = this.sortManga(filteredManga, sortBy);
        
        // Update the grid
        document.getElementById('manga-grid').innerHTML = this.renderMangaCards(filteredManga);
    }

    sortManga(mangaList, sortBy) {
        return mangaList.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'lastRead':
                    const aDate = a.lastRead ? new Date(a.lastRead) : new Date(0);
                    const bDate = b.lastRead ? new Date(b.lastRead) : new Date(0);
                    return bDate - aDate;
                case 'progress':
                    const aProgress = a.totalChapters ? a.currentChapter / a.totalChapters : 0;
                    const bProgress = b.totalChapters ? b.currentChapter / b.totalChapters : 0;
                    return bProgress - aProgress;
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'createdAt':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });
    }

    toggleTagFilter(tag) {
        if (!this.selectedTags) this.selectedTags = [];
        
        const tagButton = document.querySelector(`[data-tag="${tag}"]`);
        const index = this.selectedTags.indexOf(tag);
        
        if (index > -1) {
            this.selectedTags.splice(index, 1);
            tagButton.classList.remove('active');
        } else {
            this.selectedTags.push(tag);
            tagButton.classList.add('active');
        }
        
        this.filterManga();
    }

    quickUpdateProgress(mangaId) {
        const manga = this.tracker.getManga(mangaId);
        if (!manga) return;
        
        const newChapter = prompt(`Update progress for "${manga.title}"\nCurrent: Chapter ${manga.currentChapter}\nNew chapter:`, manga.currentChapter + 1);
        
        if (newChapter !== null) {
            const chapterNum = parseInt(newChapter);
            if (!isNaN(chapterNum) && chapterNum >= 0) {
                this.updateProgress(mangaId, chapterNum);
                this.filterManga(); // Refresh the current view
            }
        }
    }

    loadLibrary() {
        const allManga = this.tracker.getAllManga();
        const stats = this.tracker.getStatistics();
        
        const content = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Library</h1>
                <div class="flex gap-2">
                    <button onclick="uiController.showAddMangaModal()" class="btn-primary">Add Manga</button>
                    <button onclick="uiController.exportLibrary()" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Export</button>
                </div>
            </header>

            <!-- Library Stats -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-blue-600">${stats.totalManga}</div>
                    <div class="text-sm text-gray-600">Total</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.currentlyReading}</div>
                    <div class="text-sm text-gray-600">Reading</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-purple-600">${stats.completed}</div>
                    <div class="text-sm text-gray-600">Completed</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-yellow-600">${stats.onHold}</div>
                    <div class="text-sm text-gray-600">On Hold</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.dropped}</div>
                    <div class="text-sm text-gray-600">Dropped</div>
                </div>
            </div>

            <!-- Advanced Search -->
            <div class="bg-white p-6 rounded-lg shadow mb-6">
                <h2 class="text-xl font-semibold mb-4">Advanced Search</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="form-label">Search</label>
                        <input type="text" id="library-search" placeholder="Title, author, or tags..." class="form-input" onkeyup="uiController.searchLibrary()">
                    </div>
                    <div>
                        <label class="form-label">Status</label>
                        <select id="library-status-filter" class="form-input" onchange="uiController.searchLibrary()">
                            <option value="">All Status</option>
                            <option value="reading">Reading</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                            <option value="dropped">Dropped</option>
                            <option value="plan-to-read">Plan to Read</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Type</label>
                        <select id="library-type-filter" class="form-input" onchange="uiController.searchLibrary()">
                            <option value="">All Types</option>
                            <option value="manga">Manga</option>
                            <option value="manhwa">Manhwa</option>
                            <option value="manhua">Manhua</option>
                        </select>
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="form-label">Sort by</label>
                    <div class="flex gap-4">
                        <select id="library-sort" class="form-input" onchange="uiController.searchLibrary()">
                            <option value="title">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                            <option value="lastRead">Recently Read</option>
                            <option value="progress">Progress</option>
                            <option value="rating">Rating</option>
                            <option value="createdAt">Date Added</option>
                        </select>
                        <button onclick="uiController.clearLibraryFilters()" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Clear Filters</button>
                    </div>
                </div>
            </div>

            <!-- Results -->
            <div id="library-results">
                ${this.renderLibraryResults(allManga)}
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
    }

    renderLibraryResults(mangaList) {
        if (mangaList.length === 0) {
            return `
                <div class="empty-state">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No manga found</h3>
                    <p class="text-gray-500">Try adjusting your search criteria or add some manga to your library.</p>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-medium">Found ${mangaList.length} manga</h3>
                </div>
                <div class="divide-y divide-gray-200">
                    ${mangaList.map(manga => {
                        const progressPercent = manga.totalChapters ? 
                            Math.round((manga.currentChapter / manga.totalChapters) * 100) : 0;
                        
                        return `
                            <div class="px-6 py-4 hover:bg-gray-50">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-3">
                                            <div class="flex-shrink-0">
                                                <div class="w-12 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center">
                                                    <span class="text-lg">📚</span>
                                                </div>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <h4 class="text-lg font-medium text-gray-900 truncate">${manga.title}</h4>
                                                ${manga.author ? `<p class="text-sm text-gray-500">${manga.author}</p>` : ''}
                                                <div class="flex items-center space-x-2 mt-1">
                                                    <span class="status-badge ${this.getStatusBadgeClass(manga.status)}">${manga.status}</span>
                                                    <span class="type-badge ${this.getTypeBadgeClass(manga.type)}">${manga.type}</span>
                                                    ${manga.rating ? `<span class="text-yellow-500">★ ${manga.rating}/10</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-4">
                                        <div class="text-right">
                                            <div class="text-sm font-medium text-gray-900">
                                                Chapter ${manga.currentChapter}${manga.totalChapters ? ` / ${manga.totalChapters}` : ''}
                                            </div>
                                            ${manga.totalChapters ? `
                                                <div class="w-24 progress-bar mt-1">
                                                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                                                </div>
                                                <div class="text-xs text-gray-500">${progressPercent}% complete</div>
                                            ` : ''}
                                        </div>
                                        <div class="flex space-x-2">
                                            <button onclick="uiController.quickUpdateProgress('${manga.id}')" class="text-blue-600 hover:text-blue-800 text-sm">Update</button>
                                            <button onclick="uiController.editManga('${manga.id}')" class="text-green-600 hover:text-green-800 text-sm">Edit</button>
                                        </div>
                                    </div>
                                </div>
                                ${manga.tags.length > 0 ? `
                                    <div class="mt-2 flex flex-wrap gap-1">
                                        ${manga.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    searchLibrary() {
        const searchTerm = document.getElementById('library-search').value.toLowerCase();
        const statusFilter = document.getElementById('library-status-filter').value;
        const typeFilter = document.getElementById('library-type-filter').value;
        const sortBy = document.getElementById('library-sort').value;
        
        let filteredManga = this.tracker.searchManga(searchTerm, {
            status: statusFilter,
            type: typeFilter
        });
        
        // Sort manga
        filteredManga = this.sortManga(filteredManga, sortBy);
        
        // Update results
        document.getElementById('library-results').innerHTML = this.renderLibraryResults(filteredManga);
    }

    clearLibraryFilters() {
        document.getElementById('library-search').value = '';
        document.getElementById('library-status-filter').value = '';
        document.getElementById('library-type-filter').value = '';
        document.getElementById('library-sort').value = 'title';
        this.searchLibrary();
    }

    exportLibrary() {
        const allManga = this.tracker.getAllManga();
        const exportData = {
            exportDate: new Date().toISOString(),
            manga: allManga,
            stats: this.tracker.getStatistics()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `manga-library-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Library exported successfully!', 'success');
    }

    loadDiscover() {
        document.querySelector('main').innerHTML = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Discover</h1>
            </header>
            <p class="text-gray-600">Discover view coming soon...</p>
        `;
    }

    loadBookmarks() {
        document.querySelector('main').innerHTML = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Bookmarks</h1>
            </header>
            <p class="text-gray-600">Bookmarks view coming soon...</p>
        `;
    }

    loadHistory() {
        document.querySelector('main').innerHTML = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">History</h1>
            </header>
            <p class="text-gray-600">History view coming soon...</p>
        `;
    }

    loadAnalytics() {
        const stats = this.tracker.getStatistics();
        const allManga = this.tracker.getAllManga();
        const sessions = this.tracker.data.readingSessions.filter(s => !s.active);
        
        const content = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Analytics</h1>
                <div class="flex gap-2">
                    <select id="analytics-period" class="form-input" onchange="uiController.updateAnalyticsPeriod()">
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="quarter">Last 3 Months</option>
                        <option value="year">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </header>

            <!-- Key Metrics -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
                    <div class="text-3xl font-bold">${stats.totalManga}</div>
                    <div class="text-blue-100">Total Manga</div>
                </div>
                <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
                    <div class="text-3xl font-bold">${stats.totalChaptersRead}</div>
                    <div class="text-green-100">Chapters Read</div>
                </div>
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
                    <div class="text-3xl font-bold">${stats.totalReadingSessions}</div>
                    <div class="text-purple-100">Reading Sessions</div>
                </div>
                <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow">
                    <div class="text-3xl font-bold">${stats.averageSessionTime}</div>
                    <div class="text-orange-100">Avg Session (min)</div>
                </div>
            </div>

            <!-- Charts Row 1 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Reading Status Distribution -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Reading Status Distribution</h3>
                    <div class="chart-container">
                        <canvas id="status-chart" width="400" height="300"></canvas>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div class="flex items-center"><div class="w-3 h-3 bg-blue-500 rounded mr-2"></div>Reading (${stats.currentlyReading})</div>
                        <div class="flex items-center"><div class="w-3 h-3 bg-green-500 rounded mr-2"></div>Completed (${stats.completed})</div>
                        <div class="flex items-center"><div class="w-3 h-3 bg-yellow-500 rounded mr-2"></div>On Hold (${stats.onHold})</div>
                        <div class="flex items-center"><div class="w-3 h-3 bg-red-500 rounded mr-2"></div>Dropped (${stats.dropped})</div>
                    </div>
                </div>

                <!-- Type Distribution -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Type Distribution</h3>
                    <div class="chart-container">
                        <canvas id="type-chart" width="400" height="300"></canvas>
                    </div>
                    <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
                        ${this.getTypeDistribution(allManga).map(item => `
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded mr-2" style="background-color: ${item.color}"></div>
                                ${item.type} (${item.count})
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Charts Row 2 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Reading Progress Over Time -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Reading Progress (Last 30 Days)</h3>
                    <div class="chart-container">
                        <canvas id="progress-chart" width="400" height="300"></canvas>
                    </div>
                </div>

                <!-- Top Manga by Chapters Read -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Most Read Manga</h3>
                    <div class="space-y-3">
                        ${this.getTopMangaByChapters(allManga, 5).map((manga, index) => `
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        ${index + 1}
                                    </div>
                                    <div>
                                        <div class="font-medium text-gray-900">${manga.title}</div>
                                        <div class="text-sm text-gray-500">${manga.type}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-gray-900">${manga.currentChapter}</div>
                                    <div class="text-sm text-gray-500">chapters</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Detailed Statistics -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <!-- Reading Habits -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Reading Habits</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Daily Average</span>
                            <span class="font-medium">${(stats.totalChaptersRead / Math.max(this.getDaysSinceFirstManga(allManga), 1)).toFixed(1)} chapters</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Weekly Average</span>
                            <span class="font-medium">${stats.weeklyProgress} chapters</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Monthly Average</span>
                            <span class="font-medium">${stats.monthlyProgress} chapters</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Completion Rate</span>
                            <span class="font-medium">${stats.totalManga > 0 ? Math.round((stats.completed / stats.totalManga) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                <!-- Goals Progress -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Goals Progress</h3>
                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between mb-2">
                                <span class="text-gray-600">Daily Goal</span>
                                <span class="font-medium">${stats.dailyProgress}/${this.tracker.data.settings.dailyGoal}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((stats.dailyProgress / this.tracker.data.settings.dailyGoal) * 100, 100)}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-2">
                                <span class="text-gray-600">Weekly Goal</span>
                                <span class="font-medium">${stats.weeklyProgress}/${this.tracker.data.settings.dailyGoal * 7}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((stats.weeklyProgress / (this.tracker.data.settings.dailyGoal * 7)) * 100, 100)}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-2">
                                <span class="text-gray-600">Monthly Goal</span>
                                <span class="font-medium">${stats.monthlyProgress}/${this.tracker.data.settings.dailyGoal * 30}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((stats.monthlyProgress / (this.tracker.data.settings.dailyGoal * 30)) * 100, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity Summary -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div class="space-y-3">
                        ${this.tracker.getRecentActivity(5).map(activity => {
                            const manga = this.tracker.getManga(activity.mangaId);
                            const mangaTitle = manga ? manga.title : 'Unknown';
                            return `
                                <div class="flex items-center space-x-3">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div class="flex-1">
                                        <div class="text-sm font-medium text-gray-900">${activity.action}</div>
                                        <div class="text-xs text-gray-500">${mangaTitle}</div>
                                    </div>
                                    <div class="text-xs text-gray-400">${this.formatDate(activity.timestamp)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <!-- Tag Cloud -->
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold mb-4">Popular Tags</h3>
                <div class="flex flex-wrap gap-2">
                    ${this.getTagFrequency(allManga).map(tag => `
                        <span class="tag" style="font-size: ${Math.max(0.75, Math.min(1.5, tag.frequency / 2))}rem; opacity: ${Math.max(0.5, tag.frequency / 10)}">
                            ${tag.name} (${tag.count})
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
        
        // Draw charts after content is loaded
        setTimeout(() => {
            this.drawStatusChart(stats);
            this.drawTypeChart(allManga);
            this.drawProgressChart();
        }, 100);
    }

    getTypeDistribution(mangaList) {
        const distribution = {};
        const colors = { manga: '#3b82f6', manhwa: '#10b981', manhua: '#ef4444' };
        
        mangaList.forEach(manga => {
            distribution[manga.type] = (distribution[manga.type] || 0) + 1;
        });
        
        return Object.entries(distribution).map(([type, count]) => ({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            count,
            color: colors[type] || '#6b7280'
        }));
    }

    getTopMangaByChapters(mangaList, limit = 5) {
        return mangaList
            .sort((a, b) => b.currentChapter - a.currentChapter)
            .slice(0, limit);
    }

    getDaysSinceFirstManga(mangaList) {
        if (mangaList.length === 0) return 1;
        
        const firstManga = mangaList.reduce((earliest, manga) => {
            const mangaDate = new Date(manga.createdAt);
            const earliestDate = new Date(earliest.createdAt);
            return mangaDate < earliestDate ? manga : earliest;
        });
        
        const daysDiff = Math.ceil((new Date() - new Date(firstManga.createdAt)) / (1000 * 60 * 60 * 24));
        return Math.max(daysDiff, 1);
    }

    getTagFrequency(mangaList) {
        const tagCount = {};
        
        mangaList.forEach(manga => {
            manga.tags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });
        
        return Object.entries(tagCount)
            .map(([name, count]) => ({
                name,
                count,
                frequency: count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    }

    drawStatusChart(stats) {
        const canvas = document.getElementById('status-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const data = [
            { label: 'Reading', value: stats.currentlyReading, color: '#3b82f6' },
            { label: 'Completed', value: stats.completed, color: '#10b981' },
            { label: 'On Hold', value: stats.onHold, color: '#f59e0b' },
            { label: 'Dropped', value: stats.dropped, color: '#ef4444' },
            { label: 'Plan to Read', value: stats.planToRead, color: '#8b5cf6' }
        ].filter(item => item.value > 0);
        
        if (data.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        this.drawPieChart(ctx, data, canvas.width, canvas.height);
    }

    drawTypeChart(mangaList) {
        const canvas = document.getElementById('type-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const typeDistribution = this.getTypeDistribution(mangaList);
        
        if (typeDistribution.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const data = typeDistribution.map(item => ({
            label: item.type,
            value: item.count,
            color: item.color
        }));
        
        this.drawPieChart(ctx, data, canvas.width, canvas.height);
    }

    drawProgressChart() {
        const canvas = document.getElementById('progress-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const progressData = this.getProgressData();
        
        if (progressData.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No reading data available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        this.drawLineChart(ctx, progressData, canvas.width, canvas.height);
    }

    getProgressData() {
        const sessions = this.tracker.data.readingSessions.filter(s => !s.active && s.endTime);
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const dailyProgress = {};
        
        // Initialize all days with 0
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyProgress[dateStr] = 0;
        }
        
        // Add actual progress
        sessions.forEach(session => {
            const sessionDate = new Date(session.endTime);
            if (sessionDate >= last30Days) {
                const dateStr = sessionDate.toISOString().split('T')[0];
                if (dailyProgress[dateStr] !== undefined) {
                    dailyProgress[dateStr] += session.chaptersRead || 0;
                }
            }
        });
        
        return Object.entries(dailyProgress)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, chapters]) => ({
                date: new Date(date),
                value: chapters
            }));
    }

    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        
        data.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
    }

    drawLineChart(ctx, data, width, height) {
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        if (data.length === 0) return;
        
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const minDate = data[0].date;
        const maxDate = data[data.length - 1].date;
        const dateRange = maxDate - minDate;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw axes
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw data line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (chartWidth * (point.date - minDate)) / dateRange;
            const y = height - padding - (chartHeight * point.value) / maxValue;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#3b82f6';
        data.forEach(point => {
            const x = padding + (chartWidth * (point.date - minDate)) / dateRange;
            const y = height - padding - (chartHeight * point.value) / maxValue;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    updateAnalyticsPeriod() {
        // This would filter data based on selected period
        // For now, just reload the analytics
        this.loadAnalytics();
    }

    loadTags() {
        document.querySelector('main').innerHTML = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Tags</h1>
            </header>
            <p class="text-gray-600">Tags view coming soon...</p>
        `;
    }

    loadSettings() {
        document.querySelector('main').innerHTML = `
            <header class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-semibold text-gray-800">Settings</h1>
            </header>
            <p class="text-gray-600">Settings view coming soon...</p>
        `;
    }

    setupTimerButton() {
        const timerButton = document.getElementById('timer-button');
        timerButton.addEventListener('click', () => {
            this.toggleTimer();
        });
        
        // Check for active session on load
        const activeSession = this.tracker.getActiveSession();
        if (activeSession) {
            this.activeTimer = activeSession;
            this.updateTimerButton();
            this.startTimerDisplay();
        }
    }

    toggleTimer() {
        if (this.activeTimer) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        // Show manga selection modal if user has manga
        const allManga = this.tracker.getAllManga();
        let selectedMangaId = null;
        
        if (allManga.length > 0) {
            const mangaOptions = allManga.map(m => `${m.title} (Ch. ${m.currentChapter})`);
            const selectedIndex = this.showMangaSelectionModal(mangaOptions);
            if (selectedIndex !== null && selectedIndex >= 0) {
                selectedMangaId = allManga[selectedIndex].id;
            }
        }
        
        this.activeTimer = this.tracker.startReadingSession(selectedMangaId);
        this.updateTimerButton();
        this.startTimerDisplay();
        this.showNotification('Reading session started!', 'success');
    }

    stopTimer() {
        if (this.activeTimer) {
            const chaptersRead = prompt('How many chapters did you read?', '1');
            const chapters = parseInt(chaptersRead) || 0;
            
            this.tracker.endReadingSession(this.activeTimer.id, chapters);
            
            // Add to history
            if (this.activeTimer.mangaId) {
                const manga = this.tracker.getManga(this.activeTimer.mangaId);
                if (manga) {
                    this.tracker.addToHistory(this.activeTimer.mangaId, 'read', {
                        title: manga.title,
                        chaptersRead: chapters,
                        sessionDuration: this.getSessionDuration()
                    });
                }
            }
            
            this.activeTimer = null;
            this.updateTimerButton();
            this.stopTimerDisplay();
            
            this.showNotification(`Reading session completed! ${chapters} chapters read.`, 'success');
            
            // Refresh dashboard if we're on it
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        }
    }

    updateTimerButton() {
        const button = document.getElementById('timer-button');
        if (this.activeTimer) {
            button.innerHTML = '<span class="mr-2">⏹️</span><span>Stop Reading Session</span>';
            button.classList.remove('bg-purple-600', 'hover:bg-purple-700');
            button.classList.add('bg-red-600', 'hover:bg-red-700', 'timer-active');
        } else {
            button.innerHTML = '<span class="mr-2">⏱️</span><span>Start Reading Session Timer</span>';
            button.classList.remove('bg-red-600', 'hover:bg-red-700', 'timer-active');
            button.classList.add('bg-purple-600', 'hover:bg-purple-700');
        }
    }

    startTimerDisplay() {
        // Create timer display if it doesn't exist
        if (!document.getElementById('timer-display')) {
            this.createTimerDisplay();
        }
        
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimerDisplay() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove timer display
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.remove();
        }
    }

    createTimerDisplay() {
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'timer-display';
        timerDisplay.className = 'timer-display fixed top-4 right-4 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg';
        
        // Insert after the main content
        const mainContent = document.getElementById('main-content');
        mainContent.parentNode.insertBefore(timerDisplay, mainContent.nextSibling);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay && this.activeTimer) {
            const duration = this.getSessionDuration();
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;
            
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const manga = this.activeTimer.mangaId ? this.tracker.getManga(this.activeTimer.mangaId) : null;
            const mangaTitle = manga ? manga.title : 'General Reading';
            
            timerDisplay.innerHTML = `
                <div class="text-center">
                    <div class="text-sm opacity-90">${mangaTitle}</div>
                    <div class="text-lg font-mono font-bold">${timeString}</div>
                </div>
            `;
        }
    }

    getSessionDuration() {
        if (!this.activeTimer) return 0;
        const startTime = new Date(this.activeTimer.startTime);
        const now = new Date();
        return Math.floor((now - startTime) / 1000);
    }

    showMangaSelectionModal(options) {
        // Simple implementation using prompt for now
        // In a full implementation, this would be a proper modal
        const optionsText = options.map((option, index) => `${index + 1}. ${option}`).join('\n');
        const selection = prompt(`Select manga for reading session:\n\n${optionsText}\n\nEnter number (or cancel for general session):`);
        
        if (selection === null) return null; // User cancelled
        const index = parseInt(selection) - 1;
        return (index >= 0 && index < options.length) ? index : null;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    // Modal methods (to be implemented)
    showAddMangaModal() {
        // TODO: Implement add manga modal
        alert('Add manga modal coming soon!');
    }

    editManga(id) {
        // TODO: Implement edit manga functionality
        alert(`Edit manga ${id} coming soon!`);
    }

    deleteManga(id) {
        if (confirm('Are you sure you want to delete this manga?')) {
            this.tracker.deleteManga(id);
            this.loadMyManga(); // Refresh the view
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController(mangaTracker);
});



    // Modal methods
    showAddMangaModal() {
        const modal = document.getElementById('add-manga-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeAddMangaModal() {
        const modal = document.getElementById('add-manga-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Reset form
        document.getElementById('add-manga-form').reset();
    }

    handleAddManga() {
        const formData = {
            title: document.getElementById('manga-title').value,
            type: document.getElementById('manga-type').value,
            status: document.getElementById('manga-status').value,
            author: document.getElementById('manga-author').value,
            currentChapter: parseInt(document.getElementById('manga-current-chapter').value) || 0,
            totalChapters: parseInt(document.getElementById('manga-total-chapters').value) || null,
            tags: document.getElementById('manga-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            notes: document.getElementById('manga-notes').value
        };

        try {
            const manga = this.tracker.addManga(formData);
            this.tracker.addToHistory(manga.id, 'added', { title: manga.title });
            this.showNotification('Manga added successfully!', 'success');
            this.closeAddMangaModal();
            
            // Refresh current view if it's my-manga
            if (this.currentView === 'my-manga') {
                this.loadMyManga();
            } else if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            this.showNotification('Error adding manga: ' + error.message, 'error');
        }
    }

    editManga(id) {
        const manga = this.tracker.getManga(id);
        if (!manga) {
            this.showNotification('Manga not found', 'error');
            return;
        }

        // Pre-fill the form with existing data
        document.getElementById('manga-title').value = manga.title;
        document.getElementById('manga-type').value = manga.type;
        document.getElementById('manga-status').value = manga.status;
        document.getElementById('manga-author').value = manga.author;
        document.getElementById('manga-current-chapter').value = manga.currentChapter;
        document.getElementById('manga-total-chapters').value = manga.totalChapters || '';
        document.getElementById('manga-tags').value = manga.tags.join(', ');
        document.getElementById('manga-notes').value = manga.notes;

        // Change form behavior to edit mode
        const form = document.getElementById('add-manga-form');
        form.dataset.editId = id;
        
        // Update modal title and button text
        document.querySelector('#add-manga-modal h2').textContent = 'Edit Manga';
        document.querySelector('#add-manga-form button[type="submit"]').textContent = 'Update Manga';
        
        this.showAddMangaModal();
    }

    deleteManga(id) {
        if (confirm('Are you sure you want to delete this manga?')) {
            const manga = this.tracker.getManga(id);
            if (manga) {
                this.tracker.deleteManga(id);
                this.tracker.addToHistory(id, 'deleted', { title: manga.title });
                this.showNotification('Manga deleted successfully!', 'success');
                
                // Refresh current view
                if (this.currentView === 'my-manga') {
                    this.loadMyManga();
                } else if (this.currentView === 'dashboard') {
                    this.loadDashboard();
                }
            }
        }
    }

    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Utility methods
    getStatusBadgeClass(status) {
        const statusClasses = {
            'reading': 'status-reading',
            'completed': 'status-completed',
            'on-hold': 'status-on-hold',
            'dropped': 'status-dropped',
            'plan-to-read': 'status-plan-to-read'
        };
        return statusClasses[status] || 'status-reading';
    }

    getTypeBadgeClass(type) {
        const typeClasses = {
            'manga': 'type-manga',
            'manhwa': 'type-manhwa',
            'manhua': 'type-manhua'
        };
        return typeClasses[type] || 'type-manga';
    }

    updateProgress(mangaId, newChapter) {
        const manga = this.tracker.getManga(mangaId);
        if (manga) {
            this.tracker.updateManga(mangaId, { 
                currentChapter: newChapter,
                lastRead: new Date().toISOString()
            });
            this.tracker.addToHistory(mangaId, 'read', { 
                title: manga.title, 
                chapter: newChapter 
            });
            this.showNotification(`Updated ${manga.title} to chapter ${newChapter}`, 'success');
            
            // Refresh current view
            if (this.currentView === 'my-manga') {
                this.loadMyManga();
            } else if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        }
    }
}



    // Missing utility methods
    getStatusBadgeClass(status) {
        const statusClasses = {
            'reading': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'on-hold': 'bg-yellow-100 text-yellow-800',
            'dropped': 'bg-red-100 text-red-800',
            'plan-to-read': 'bg-purple-100 text-purple-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    getTypeBadgeClass(type) {
        const typeClasses = {
            'manga': 'bg-blue-100 text-blue-800',
            'manhwa': 'bg-green-100 text-green-800',
            'manhua': 'bg-red-100 text-red-800'
        };
        return typeClasses[type] || 'bg-gray-100 text-gray-800';
    }

    updateProgress(mangaId, newChapter) {
        const manga = this.tracker.getManga(mangaId);
        if (!manga) return;

        const oldChapter = manga.currentChapter;
        manga.currentChapter = newChapter;
        manga.lastRead = new Date().toISOString();

        // Update status if completed
        if (manga.totalChapters && newChapter >= manga.totalChapters) {
            manga.status = 'completed';
        }

        this.tracker.updateManga(mangaId, manga);
        
        // Add to history
        this.tracker.addToHistory(mangaId, 'progress_update', {
            title: manga.title,
            oldChapter,
            newChapter,
            chaptersRead: newChapter - oldChapter
        });

        this.showNotification(`Updated "${manga.title}" to chapter ${newChapter}`, 'success');
    }

    editManga(mangaId) {
        const manga = this.tracker.getManga(mangaId);
        if (!manga) return;

        // Pre-fill the form with existing data
        document.getElementById('manga-title').value = manga.title;
        document.getElementById('manga-type').value = manga.type;
        document.getElementById('manga-status').value = manga.status;
        document.getElementById('manga-author').value = manga.author || '';
        document.getElementById('manga-current-chapter').value = manga.currentChapter;
        document.getElementById('manga-total-chapters').value = manga.totalChapters || '';
        document.getElementById('manga-tags').value = manga.tags.join(', ');
        document.getElementById('manga-notes').value = manga.notes || '';

        // Change modal title and button
        document.querySelector('#add-manga-modal h2').textContent = 'Edit Manga';
        document.querySelector('#add-manga-modal .btn-primary').textContent = 'Update Manga';
        
        // Store the ID for updating
        this.editingMangaId = mangaId;
        
        this.showModal('add-manga-modal');
    }

    deleteManga(mangaId) {
        const manga = this.tracker.getManga(mangaId);
        if (!manga) return;

        if (confirm(`Are you sure you want to delete "${manga.title}"? This action cannot be undone.`)) {
            this.tracker.deleteManga(mangaId);
            this.showNotification(`"${manga.title}" has been deleted`, 'success');
            
            // Refresh current view
            if (this.currentView === 'my-manga') {
                this.loadMyManga();
            } else if (this.currentView === 'library') {
                this.loadLibrary();
            } else if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Handle URL parameters for shortcuts
    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'add') {
            setTimeout(() => this.showAddMangaModal(), 500);
        } else if (action === 'timer') {
            setTimeout(() => this.toggleTimer(), 500);
        }
    }

    // Initialize offline detection
    initializeOfflineDetection() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            const statusIndicator = document.getElementById('online-status');
            
            if (!statusIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'online-status';
                indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium';
                document.body.appendChild(indicator);
            }
            
            const indicator = document.getElementById('online-status');
            
            if (isOnline) {
                indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
                indicator.textContent = 'Online';
                setTimeout(() => indicator.style.display = 'none', 3000);
            } else {
                indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
                indicator.textContent = 'Offline';
                indicator.style.display = 'block';
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Initial check
        updateOnlineStatus();
    }

    // Service Worker message handling
    initializeServiceWorkerMessaging() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'SYNC_DATA') {
                    console.log('Received sync request from service worker');
                    // Trigger data sync if needed
                    this.tracker.saveData();
                }
            });
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new MangaTracker();
    window.uiController = new UIController(window.tracker);
    
    // Handle URL parameters
    window.uiController.handleURLParams();
    
    // Initialize offline detection
    window.uiController.initializeOfflineDetection();
    
    // Initialize service worker messaging
    window.uiController.initializeServiceWorkerMessaging();
    
    console.log('Manga Tracker PWA initialized successfully');
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            if (confirm('A new version of the app is available. Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Handle install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or banner
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    installButton.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
            installButton.remove();
        });
    };
    
    document.body.appendChild(installButton);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (installButton.parentNode) {
            installButton.remove();
        }
    }, 10000);
});


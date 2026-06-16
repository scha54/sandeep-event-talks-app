document.addEventListener('DOMContentLoaded', () => {
    // State
    let allReleases = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;
    
    // DOM Elements
    const timelineContainer = document.getElementById('timeline-container');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const retryBtn = document.getElementById('retry-btn');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    
    // Search & Filter DOM
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    
    // Modal DOM
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const progressCircle = document.getElementById('progress-circle');
    const tagChips = document.querySelectorAll('.tag-chip');
    
    // Progress Ring Constants
    const RING_RADIUS = 14;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
        progressCircle.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }

    // Initialize API Fetch
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    // Filter Pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.getAttribute('data-type');
            renderTimeline();
        });
    });

    // Real-time Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderTimeline();
    });

    // Clear Search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    // Modal Close Events
    closeModalBtn.addEventListener('click', closeComposer);
    cancelTweetBtn.addEventListener('click', closeComposer);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeComposer();
    });

    // Character Counter & Validation
    tweetTextarea.addEventListener('input', updateCharCount);

    // Hashtag Chips Toggles
    tagChips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            updateTweetTextWithTags();
        });
    });

    // Publish Tweet
    publishTweetBtn.addEventListener('click', publishTweet);

    // Functions
    async function fetchReleases() {
        // UI loading state
        setLoading(true);
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.status === 'success') {
                allReleases = data.releases;
                renderTimeline();
                
                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                statusText.textContent = `Updated at ${timeString}`;
                statusIndicator.classList.remove('loading');
            } else {
                throw new Error(data.message || 'Unknown backend error');
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showError(error.message);
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
            statusIndicator.classList.add('loading');
            statusText.textContent = 'Syncing...';
            loadingState.style.display = 'flex';
            timelineContainer.style.display = 'none';
            errorState.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
            loadingState.style.display = 'none';
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg || 'Failed to fetch the BigQuery release feed.';
        errorState.style.display = 'flex';
        timelineContainer.style.display = 'none';
        emptyState.style.display = 'none';
        statusText.textContent = 'Sync failed';
        statusIndicator.classList.remove('loading');
    }

    function renderTimeline() {
        timelineContainer.innerHTML = '';
        let hasContent = false;

        // Filter and search notes
        const filteredGroups = allReleases.map(group => {
            const matchedUpdates = group.updates.filter(update => {
                // Filter Match
                let matchesFilter = false;
                const typeLower = update.type.toLowerCase();
                
                if (activeFilter === 'all') {
                    matchesFilter = true;
                } else if (activeFilter === 'other') {
                    matchesFilter = !['feature', 'issue', 'deprecation'].includes(typeLower);
                } else {
                    matchesFilter = typeLower === activeFilter;
                }

                // Search Match
                let matchesSearch = true;
                if (searchQuery) {
                    matchesSearch = update.text.toLowerCase().includes(searchQuery) || 
                                    update.type.toLowerCase().includes(searchQuery) ||
                                    group.date.toLowerCase().includes(searchQuery);
                }

                return matchesFilter && matchesSearch;
            });

            return {
                ...group,
                updates: matchedUpdates
            };
        }).filter(group => group.updates.length > 0);

        if (filteredGroups.length > 0) {
            errorState.style.display = 'none';
            emptyState.style.display = 'none';
            timelineContainer.style.display = 'block';
            
            filteredGroups.forEach((group, groupIndex) => {
                const groupElement = document.createElement('div');
                groupElement.className = 'timeline-group animate-in';
                groupElement.style.animationDelay = `${groupIndex * 0.05}s`;

                groupElement.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-date">
                        <span>${group.date}</span>
                        <a href="${group.link}" target="_blank" title="View official release notes for this day">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                    <div class="updates-list"></div>
                `;

                const listContainer = groupElement.querySelector('.updates-list');

                group.updates.forEach((update) => {
                    const typeClass = update.type.toLowerCase();
                    const pillClass = ['feature', 'issue', 'deprecation'].includes(typeClass) ? typeClass : 'other';
                    
                    const card = document.createElement('div');
                    card.className = 'update-card glass-card';
                    
                    card.innerHTML = `
                        <div class="update-header">
                            <span class="type-pill ${pillClass}">${update.type}</span>
                            <div class="card-actions">
                                <button class="action-btn tweet-btn" title="Prepare tweet for this update">
                                    <i class="fa-brands fa-x-twitter"></i>
                                </button>
                            </div>
                        </div>
                        <div class="update-body">
                            ${update.html}
                        </div>
                    `;

                    // Card Click selection interaction
                    card.addEventListener('click', (e) => {
                        // Prevent click action triggering if clicking links inside the body
                        if (e.target.tagName === 'A') return;
                        
                        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        selectedUpdate = {
                            date: group.date,
                            link: group.link,
                            ...update
                        };
                    });

                    // Direct Tweet button click handler
                    card.querySelector('.tweet-btn').addEventListener('click', (e) => {
                        e.stopPropagation(); // Stop selecting card automatically on simple click
                        openComposer({
                            date: group.date,
                            link: group.link,
                            ...update
                        });
                    });

                    listContainer.appendChild(card);
                });

                timelineContainer.appendChild(groupElement);
            });
        } else {
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'flex';
        }
    }

    // Modal / Composer Operations
    function openComposer(update) {
        selectedUpdate = update;
        
        // Format initial tweet draft
        const cleanDate = update.date.replace(/,\s*\d{4}/, ''); // simplify e.g., "June 15, 2026" to "June 15"
        
        // Extract plain description text and truncate if necessary
        let textPreview = update.text;
        
        // Calculate remaining chars for text (total 280)
        // Reserve space for tags + link + templates: "BigQuery (Jun 15) [Feature]: [Text] #BigQuery #GoogleCloud #GCP URL"
        // Let's create the active tags list
        const activeTags = getActiveTagsString();
        const infoPrefix = `BQ (${cleanDate}) [${update.type}]: `;
        const linkStr = `\n\nRelease: ${update.link}`;
        
        const reservedLength = infoPrefix.length + linkStr.length + activeTags.length + 10;
        const maxTextLen = 280 - reservedLength;
        
        if (textPreview.length > maxTextLen) {
            textPreview = textPreview.substring(0, maxTextLen - 3) + '...';
        }

        // Build composite string
        tweetTextarea.value = `${infoPrefix}${textPreview}${linkStr}\n${activeTags}`;
        
        updateCharCount();
        
        tweetModal.classList.add('active');
        tweetTextarea.focus();
        // Place cursor at the end of the text (or before link)
        tweetTextarea.setSelectionRange(0, infoPrefix.length + textPreview.length);
    }

    function closeComposer() {
        tweetModal.classList.remove('active');
    }

    function getActiveTagsString() {
        const activeChips = [];
        tagChips.forEach(chip => {
            if (chip.classList.contains('active')) {
                activeChips.push(chip.getAttribute('data-tag'));
            }
        });
        return activeChips.join(' ');
    }

    function updateTweetTextWithTags() {
        if (!selectedUpdate) return;
        
        // Read textarea content, extract tags and link, keep custom modifications, and adjust tags at the end.
        let currentVal = tweetTextarea.value;
        
        // Simple heuristic: remove old hashtags matching suggestions from the text
        const suggestions = Array.from(tagChips).map(c => c.getAttribute('data-tag'));
        
        // We will strip existing suggestions tags from the bottom
        let lines = currentVal.split('\n');
        let textLines = [];
        
        for (let line of lines) {
            let cleanLine = line;
            suggestions.forEach(tag => {
                // Remove the tag from the line if it appears
                cleanLine = cleanLine.replace(new RegExp(tag, 'g'), '');
            });
            cleanLine = cleanLine.trim();
            if (cleanLine) {
                textLines.push(cleanLine);
            }
        }
        
        // Re-append active tags at the bottom line
        const activeTags = getActiveTagsString();
        if (activeTags) {
            textLines.push(activeTags);
        }
        
        tweetTextarea.value = textLines.join('\n');
        updateCharCount();
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const remaining = 280 - text.length;
        
        charCounter.textContent = remaining;
        
        // Colors & Alert Thresholds
        charCounter.className = 'char-counter';
        if (remaining <= 20 && remaining > 0) {
            charCounter.classList.add('warning');
        } else if (remaining <= 0) {
            charCounter.classList.add('danger');
        }

        // Update Progress Circle SVG
        if (progressCircle) {
            const percent = Math.max(0, Math.min(100, (text.length / 280) * 100));
            const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
            progressCircle.style.strokeDashoffset = offset;
            
            // Adjust circle color dynamically
            if (remaining <= 0) {
                progressCircle.style.stroke = '#ef4444';
            } else if (remaining <= 20) {
                progressCircle.style.stroke = '#f59e0b';
            } else {
                progressCircle.style.stroke = '#1d9bf0';
            }
        }

        // Disable button if over limit or empty
        publishTweetBtn.disabled = (remaining < 0 || text.trim().length === 0);
    }

    function publishTweet() {
        const text = tweetTextarea.value;
        if (text.length > 280 || text.trim().length === 0) return;
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeComposer();
    }
});

const CONFIG = {
  localStoreUrl: './stories.json',
  remoteStoreUrl: 'https://raw.githubusercontent.com/USERNAME/REPO/main/stories.json',
  storeOptions: [
    { id: 'local', name: 'Local store (bundled)', url: './stories.json' },
    { id: 'github', name: 'Remote GitHub store', url: 'https://raw.githubusercontent.com/USERNAME/REPO/main/stories.json' },
    { id: 'jsonbin', name: 'JSONBin store', url: 'https://api.jsonbin.io/b/YOUR_BIN_ID/latest' }
  ],
  ageCategories: [
    { id: '0-3months', label: '0–3 months' },
    { id: '3-6months', label: '3–6 months' },
    { id: '6-9months', label: '6–9 months' },
    { id: '9-12months', label: '9–12 months' }
  ],
  timeOptions: [
    { id: 'all', label: 'All' },
    { id: 'Morning', label: 'Morning' },
    { id: 'Evening', label: 'Evening' }
  ]
};

const STORAGE = {
  theme: 'hakeem_theme',
  store: 'hakeem_store',
  age: 'hakeem_age',
  time: 'hakeem_time',
  read: 'hakeem_read',
  drafts: 'hakeem_draft_stories'
};

let appState = {
  stories: [],
  drafts: [],
  readStories: new Set(),
  selectedStore: 'local',
  selectedAge: '0-3months',
  selectedTime: 'all',
  currentRoute: 'age'
};

const elements = {
  storeSelect: document.getElementById('store-select'),
  ageFilter: document.getElementById('age-filter'),
  timeToggle: document.getElementById('time-toggle'),
  showAddPage: document.getElementById('show-add-page'),
  storyPage: document.getElementById('story-page'),
  storyList: document.getElementById('story-list'),
  addPage: document.getElementById('add-page'),
  readerOverlay: document.getElementById('reader-overlay'),
  readerBody: document.getElementById('reader-body'),
  closeReader: document.getElementById('close-reader'),
  readerBadge: document.getElementById('reader-badge'),
  pageTitle: document.getElementById('page-title'),
  pageSub: document.getElementById('page-sub'),
  statusBanner: document.getElementById('status-banner'),
  readCount: document.getElementById('read-count'),
  storeNote: document.getElementById('store-note'),
  themeToggle: document.getElementById('theme-toggle')
};

function getSaved(key, fallback) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value;
}

function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

function saveReadStories() {
  localStorage.setItem(STORAGE.read, JSON.stringify([...appState.readStories]));
}

function loadReadStories() {
  const raw = localStorage.getItem(STORAGE.read);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch (error) {
    return new Set();
  }
}

function saveDrafts() {
  localStorage.setItem(STORAGE.drafts, JSON.stringify(appState.drafts));
}

function loadDrafts() {
  const raw = localStorage.getItem(STORAGE.drafts);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  appState.theme = theme;
  saveSetting(STORAGE.theme, theme);
  elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function buildStoreOptions() {
  elements.storeSelect.innerHTML = CONFIG.storeOptions
    .map(option => `<option value="${option.id}">${option.name}</option>`)
    .join('');
  elements.storeSelect.value = appState.selectedStore;
}

function buildAgeFilters() {
  elements.ageFilter.innerHTML = CONFIG.ageCategories
    .map(category => {
      const active = category.id === appState.selectedAge ? 'active' : '';
      return `<button class="filter-button ${active}" data-age="${category.id}">${category.label}</button>`;
    })
    .join('');
}

function buildTimeToggle() {
  elements.timeToggle.innerHTML = CONFIG.timeOptions
    .map(option => {
      const active = option.id === appState.selectedTime ? 'active' : '';
      return `<button class="filter-button ${active}" data-time="${option.id}">${option.label}</button>`;
    })
    .join('');
}

function updateReadCount() {
  const count = appState.readStories.size;
  elements.readCount.textContent = `${count} ${count === 1 ? 'story' : 'stories'} read`;
}

function showStatus(message) {
  elements.statusBanner.textContent = message;
  elements.statusBanner.classList.remove('hidden');
}

function hideStatus() {
  elements.statusBanner.classList.add('hidden');
}

function parseHash() {
  const rawHash = window.location.hash.slice(2);
  if (!rawHash) return { path: 'age', param: appState.selectedAge, query: '' };
  const [pathPart, queryString] = rawHash.split('?');
  return { path: pathPart, query: new URLSearchParams(queryString || '') };
}

function syncRoute() {
  const { path, query } = parseHash();
  if (path === 'add') {
    appState.currentRoute = 'add';
    const age = query.get('age');
    const time = query.get('time');
    if (age && CONFIG.ageCategories.some(item => item.id === age)) {
      appState.selectedAge = age;
    }
    if (time && CONFIG.timeOptions.some(item => item.id === time)) {
      appState.selectedTime = time;
    }
    renderPage();
    return;
  }

  if (path.startsWith('age/')) {
    appState.currentRoute = 'age';
    const ageValue = path.slice(4);
    if (CONFIG.ageCategories.some(item => item.id === ageValue)) {
      appState.selectedAge = ageValue;
      saveSetting(STORAGE.age, ageValue);
    }
  }
  renderPage();
}

function getActiveStories() {
  const all = [...appState.stories, ...appState.drafts];
  return all.filter(story => {
    const ageMatches = story.age === appState.selectedAge;
    const timeMatches = appState.selectedTime === 'all' || story.timeOfDay === appState.selectedTime;
    return ageMatches && timeMatches;
  });
}

function renderStoryList() {
  elements.storyPage.classList.remove('hidden');
  elements.addPage.classList.add('hidden');

  const stories = getActiveStories();
  if (!stories.length) {
    elements.storyList.innerHTML = '<div class="empty-state">No stories found for this combination yet. Try another age category or time of day.</div>';
    return;
  }

  elements.storyList.innerHTML = stories
    .map((story, index) => {
      const readLabel = appState.readStories.has(story.id) ? '<span class="read-badge">Read</span>' : '';
      const tags = story.tags
        .map(tag => `
          <span class="tag tag-${tag === 'Ghanaian' ? 'gh' : tag === 'Islamic' ? 'is' : tag === 'STEM' ? 'stem' : 'uk'}">${tag}</span>`)
        .join('');
      return `
        <article class="story-card" data-index="${index}">
          <div class="card-top">
            <div class="card-icon">${story.icon}</div>
            <div class="card-meta">
              <div class="card-title">${story.title}</div>
              <div class="card-tags">${tags}</div>
            </div>
          </div>
          <div class="card-preview">${story.preview}</div>
          <div class="card-footer">
            ${readLabel}
            <div>${story.timeOfDay} · ${story.age}</div>
          </div>
        </article>`;
    })
    .join('');

  elements.storyList.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = Number(card.dataset.index);
      openStory(index);
    });
  });
}

function renderPage() {
  buildAgeFilters();
  buildTimeToggle();
  updateReadCount();
  elements.storeSelect.value = appState.selectedStore;
  const ageLabel = CONFIG.ageCategories.find(category => category.id === appState.selectedAge).label;
  const timeLabel = appState.selectedTime === 'all' ? 'Morning and evening' : appState.selectedTime;
  elements.pageTitle.textContent = `${timeLabel} stories for ${ageLabel}`;
  elements.pageSub.textContent = `Loaded from ${CONFIG.storeOptions.find(store => store.id === appState.selectedStore).name}.`;

  if (appState.currentRoute === 'add') {
    renderAddPage();
  } else {
    renderStoryList();
  }
}

function trackReadStory(id) {
  if (!appState.readStories.has(id)) {
    appState.readStories.add(id);
    saveReadStories();
    updateReadCount();
  }
}

function openStory(index) {
  const stories = getActiveStories();
  const story = stories[index];
  if (!story) return;

  appState.currentStory = story;
  trackReadStory(story.id);
  elements.readerBadge.textContent = story.timeOfDay === 'Morning' ? '🌅 Morning story' : '🌙 Evening story';

  const tags = story.tags
    .map(tag => `<span class="tag tag-${tag === 'Ghanaian' ? 'gh' : tag === 'Islamic' ? 'is' : tag === 'STEM' ? 'stem' : 'uk'}">${tag}</span>`)
    .join('');

  elements.readerBody.innerHTML = `
    <div class="reader-icon">${story.icon}</div>
    <div class="reader-title">${story.title}</div>
    <div class="reader-tags">${tags}</div>
    <div class="divider">✦ ✦ ✦</div>
    <div class="story-text">
      ${story.content.map(paragraph => `<p>${paragraph}</p>`).join('')}
    </div>
    <div class="lesson-box">
      <div class="lesson-label">Lesson</div>
      <div class="lesson-text">${story.lesson}</div>
    </div>
    <div class="dua-box">
      <div class="dua-arabic">${story.dua.arabic}</div>
      <div class="dua-transliteration">${story.dua.transliteration || story.dua.transitilation || ''}</div>
      <div class="dua-translation">${story.dua.translation}</div>
    </div>
    <div class="nav-btns">
      <button class="nav-btn" id="previous-story">← Previous</button>
      <button class="nav-btn" id="next-story">Next →</button>
    </div>
    <div class="progress-dots">
      ${stories
        .map((item, dotIndex) => `<div class="dot ${dotIndex === index ? 'active' : ''}" data-index="${dotIndex}"></div>`)
        .join('')}
    </div>`;

  elements.readerOverlay.classList.add('open');
  elements.readerOverlay.scrollTo(0, 0);

  document.getElementById('previous-story').onclick = () => {
    if (index > 0) openStory(index - 1);
  };
  document.getElementById('next-story').onclick = () => {
    if (index < stories.length - 1) openStory(index + 1);
  };
  elements.readerBody.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => openStory(Number(dot.dataset.index)));
  });
}

function closeReader() {
  elements.readerOverlay.classList.remove('open');
}

function buildAddForm() {
  const selectedAge = appState.selectedAge;
  const selectedTime = appState.selectedTime;
  elements.storyPage.classList.add('hidden');
  elements.addPage.classList.remove('hidden');
  elements.addPage.innerHTML = `
    <div class="page-title">Add a new story</div>
    <div class="page-sub">Create a story entry and preview the JSON for manual upload.</div>
    <form id="add-story-form" class="add-form">
      <div class="field-group">
        <label for="story-id">Story ID</label>
        <input id="story-id" name="story-id" placeholder="month-3-morning" required>
      </div>
      <div class="field-group">
        <label for="story-title">Title</label>
        <input id="story-title" name="story-title" placeholder="A gentle morning story" required>
      </div>
      <div class="field-group">
        <label for="story-age">Age category</label>
        <select id="story-age" name="story-age">
          ${CONFIG.ageCategories
            .map(category => `<option value="${category.id}" ${category.id === selectedAge ? 'selected' : ''}>${category.label}</option>`)
            .join('')}
        </select>
      </div>
      <div class="field-group">
        <label for="story-time">Time of day</label>
        <select id="story-time" name="story-time">
          <option value="Morning" ${selectedTime === 'Morning' ? 'selected' : ''}>Morning</option>
          <option value="Evening" ${selectedTime === 'Evening' ? 'selected' : ''}>Evening</option>
        </select>
      </div>
      <div class="field-group">
        <label for="story-icon">Icon</label>
        <input id="story-icon" name="story-icon" placeholder="🕊️" required>
      </div>
      <div class="field-group">
        <label for="story-tags">Tags (comma separated)</label>
        <input id="story-tags" name="story-tags" placeholder="Curiosity, Kindness, Islamic Value, STEM">
      </div>
      <div class="field-group">
        <label for="story-preview">Preview</label>
        <textarea id="story-preview" name="story-preview" placeholder="A short preview line" required></textarea>
      </div>
      <div class="field-group">
        <label for="story-cover">Cover image URL</label>
        <input id="story-cover" name="story-cover" placeholder="https://images.unsplash.com/..." required>
      </div>
      <div class="field-group">
        <label for="story-content">Content paragraphs (one per line)</label>
        <textarea id="story-content" name="story-content" placeholder="Paragraph one\nParagraph two\nParagraph three" required></textarea>
      </div>
      <div class="field-group">
        <label for="story-lesson">Lesson text</label>
        <textarea id="story-lesson" name="story-lesson" placeholder="Lesson summary" required></textarea>
      </div>
      <div class="field-group">
        <label for="story-dua-arabic">Dua (Arabic)</label>
        <textarea id="story-dua-arabic" name="story-dua-arabic" placeholder="اللَّهُمَّ..." required></textarea>
      </div>
      <div class="field-group">
        <label for="story-dua-translation">Dua translation</label>
        <textarea id="story-dua-translation" name="story-dua-translation" placeholder="Translation in English" required></textarea>
      </div>
      <button type="submit" class="action-button">Create story JSON</button>
    </form>
    <div class="add-box">
      <div class="lesson-label">Story JSON output</div>
      <div id="story-json-output" class="add-preview">Fill the form to generate the JSON for copy/paste.</div>
    </div>
  `;

  const form = document.getElementById('add-story-form');
  const output = document.getElementById('story-json-output');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      id: document.getElementById('story-id').value.trim(),
      title: document.getElementById('story-title').value.trim(),
      timeOfDay: document.getElementById('story-time').value,
      age: document.getElementById('story-age').value,
      coverImage: document.getElementById('story-cover').value.trim(),
      tags: document
        .getElementById('story-tags')
        .value.split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      preview: document.getElementById('story-preview').value.trim(),
      icon: document.getElementById('story-icon').value.trim() || '📖',
      content: document
        .getElementById('story-content')
        .value.split('\n')
        .map(line => line.trim())
        .filter(Boolean),
      lesson: document.getElementById('story-lesson').value.trim(),
      dua: {
        arabic: document.getElementById('story-dua-arabic').value.trim(),
        transitilation: '',
        translation: document.getElementById('story-dua-translation').value.trim()
      }
    };

    const jsonText = JSON.stringify(data, null, 2);
    output.textContent = jsonText;
    appState.drafts.unshift(data);
    saveDrafts();
    showStatus('Draft story added locally. Use the JSON output to update the remote store if needed.');
  });
}

function renderAddPage() {
  buildAddForm();
}

function setRouteToAge(age) {
  window.location.hash = `#/age/${age}`;
}

function setRouteToAdd() {
  window.location.hash = `#/add?age=${appState.selectedAge}&time=${appState.selectedTime}`;
}

function fetchStories(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error('Unable to load story source.');
    return response.json();
  });
}

function loadStories() {
  const store = CONFIG.storeOptions.find(option => option.id === appState.selectedStore);
  if (!store) return Promise.reject(new Error('Invalid store selected.'));

  return fetchStories(store.url).then(data => {
    if (!Array.isArray(data.stories)) {
      throw new Error('Invalid story JSON format.');
    }
    return data.stories;
  });
}

function handleStoreLoadError(error) {
  if (appState.selectedStore !== 'local') {
    showStatus('Remote source failed. Loading local fallback instead.');
    appState.selectedStore = 'local';
    saveSetting(STORAGE.store, 'local');
    elements.storeSelect.value = 'local';
    return fetchStories(CONFIG.localStoreUrl).then(data => data.stories || []);
  }

  showStatus('Could not load stories. Please check your connection or local JSON file.');
  return [];
}

function applyEventHandlers() {
  window.addEventListener('hashchange', () => {
    syncRoute();
  });

  elements.storeSelect.addEventListener('change', () => {
    appState.selectedStore = elements.storeSelect.value;
    saveSetting(STORAGE.store, appState.selectedStore);
    loadAndRenderStories();
  });

  elements.ageFilter.addEventListener('click', event => {
    const button = event.target.closest('[data-age]');
    if (!button) return;
    appState.selectedAge = button.dataset.age;
    saveSetting(STORAGE.age, appState.selectedAge);
    setRouteToAge(appState.selectedAge);
  });

  elements.timeToggle.addEventListener('click', event => {
    const button = event.target.closest('[data-time]');
    if (!button) return;
    appState.selectedTime = button.dataset.time;
    saveSetting(STORAGE.time, appState.selectedTime);
    renderPage();
  });

  elements.showAddPage.addEventListener('click', () => {
    window.location.href = 'add/';
  });

  elements.closeReader.addEventListener('click', closeReader);

  elements.themeToggle.addEventListener('click', () => {
    setTheme(appState.theme === 'dark' ? 'light' : 'dark');
  });
}

function loadAndRenderStories() {
  hideStatus();
  loadStories()
    .then(stories => {
      appState.stories = stories;
      renderPage();
    })
    .catch(handleStoreLoadError)
    .then(stories => {
      if (Array.isArray(stories)) appState.stories = stories;
      renderPage();
    });
}

function init() {
  appState.selectedStore = getSaved(STORAGE.store, 'local');
  appState.selectedAge = getSaved(STORAGE.age, '0-3months');
  appState.selectedTime = getSaved(STORAGE.time, 'all');
  appState.theme = getSaved(STORAGE.theme, 'dark');
  appState.readStories = loadReadStories();
  appState.drafts = loadDrafts();

  setTheme(appState.theme);
  buildStoreOptions();
  applyEventHandlers();
  syncRoute();
  loadAndRenderStories();

  elements.storeNote.textContent = 'Tip: Remote store is read-only when using GitHub raw. Add story JSON manually to the repo or use the add page to keep drafts locally.';
}

init();

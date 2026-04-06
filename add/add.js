const THEME_STORAGE_KEY = 'hakeem_theme';
const DRAFT_STORAGE_KEY = 'hakeem_draft_stories';
const JSONBIN_BIN_ID_KEY = 'jsonbin_bin_id';
const JSONBIN_API_KEY_KEY = 'jsonbin_api_key';

const themeToggle = document.getElementById('theme-toggle');
const form = document.getElementById('raw-json-form');
const result = document.getElementById('json-result');
const input = document.getElementById('raw-json-input');

// Add configuration section to the form
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('raw-json-form');
  const configSection = document.createElement('div');
  configSection.className = 'field-group';
  configSection.innerHTML = `
    <label for="jsonbin-bin-id">JSONBin Bin ID (optional)</label>
    <input id="jsonbin-bin-id" placeholder="Your JSONBin bin ID">
    <label for="jsonbin-api-key">JSONBin API Key (optional)</label>
    <input id="jsonbin-api-key" type="password" placeholder="Your JSONBin API key">
    <small style="color: #b39564; font-size: 12px;">Leave empty to save locally only. Get keys from <a href="https://jsonbin.io" target="_blank" style="color: #f5c842;">jsonbin.io</a></small>
  `;
  form.insertBefore(configSection, form.lastElementChild);

  // Load saved values
  document.getElementById('jsonbin-bin-id').value = localStorage.getItem(JSONBIN_BIN_ID_KEY) || '';
  document.getElementById('jsonbin-api-key').value = localStorage.getItem(JSONBIN_API_KEY_KEY) || '';
});

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  setTheme(saved);
}

function validateStory(story) {
  const required = [
    'id',
    'title',
    'timeOfDay',
    'age',
    'coverImage',
    'tags',
    'preview',
    'icon',
    'content',
    'lesson',
    'dua'
  ];
  for (const key of required) {
    if (!(key in story)) {
      return `Missing required field: ${key}`;
    }
  }
  if (!Array.isArray(story.tags)) return 'Tags must be an array.';
  if (!Array.isArray(story.content)) return 'Content must be an array of paragraphs.';
  if (typeof story.dua !== 'object' || !story.dua.arabic || !story.dua.translation) {
    return 'Dua object must include arabic and translation.';
  }
  return true;
}

function validateJson(data) {
  if (Array.isArray(data)) {
    return { stories: data };
  }
  if (typeof data === 'object' && data !== null && Array.isArray(data.stories)) {
    return data;
  }
  throw new Error('JSON must be an array or object containing a stories array.');
}

function saveDrafts(stories) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stories));
}

async function saveToJsonBin(binId, apiKey, data) {
  const url = `https://api.jsonbin.io/v3/b/${binId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
      'X-Bin-Versioning': 'false'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`JSONBin error: ${response.status} - ${error}`);
  }

  return await response.json();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  result.textContent = 'Validating...';
  result.style.color = '#b39564';

  try {
    const parsed = JSON.parse(input.value);
    const payload = validateJson(parsed);
    const stories = payload.stories;
    if (!stories.length) {
      throw new Error('No stories found in the provided JSON.');
    }

    for (const story of stories) {
      const valid = validateStory(story);
      if (valid !== true) {
        throw new Error(valid);
      }
    }

    // Save locally as drafts
    saveDrafts(stories);
    result.textContent = `Valid JSON. ${stories.length} story ${stories.length === 1 ? 'item' : 'items'} saved locally as drafts.`;
    result.style.color = '#4ec97a';

    // Try to save to JSONBin if configured
    const binId = document.getElementById('jsonbin-bin-id').value.trim();
    const apiKey = document.getElementById('jsonbin-api-key').value.trim();

    if (binId && apiKey) {
      result.textContent += ' Saving to JSONBin...';
      localStorage.setItem(JSONBIN_BIN_ID_KEY, binId);
      localStorage.setItem(JSONBIN_API_KEY_KEY, apiKey);

      await saveToJsonBin(binId, apiKey, payload);
      result.textContent += ' Successfully saved to JSONBin!';
    } else {
      result.textContent += ' (JSONBin not configured - saved locally only)';
    }

  } catch (error) {
    result.textContent = `Error: ${error.message}`;
    result.style.color = '#ff8080';
  }
});

themeToggle.addEventListener('click', () => {
  const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
});

loadTheme();

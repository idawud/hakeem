# Hakeem Stories

A simple static story app for baby Hakeem with Ghanaian, Islamic, British, and STEM-friendly themes.

## What this does

- Loads stories from a remote or local JSON store
- Filters by age category and morning/evening stories
- Tracks read stories in the browser
- Includes a side panel for store selection, day/night mode, and age category
- Supports a light/dark theme toggle
- Includes an add-story page to build new story JSON entries

## Files

- `index.html` — main application page
- `styles.css` — responsive app styling
- `app.js` — application logic, routing, filters, and story rendering
- `stories.json` — bundled local story data sample
- `.gitignore` — ignored files for Git

## Run locally

Because the app fetches `stories.json`, run a local web server rather than opening the file directly.

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

### Environment Variables (Optional)

For local development with JSONBin, create a `.env` file in the project root:

```env
JSONBIN_BIN_ID=your_bin_id_here
JSONBIN_API_KEY=your_api_key_here
```

The app will automatically load these values into the add page form. For security, never commit `.env` files to version control.

If you don't set environment variables, you can manually enter the JSONBin credentials in the `/add/` page.

## Remote store configuration

The app supports loading story data from a remote JSON source.

### GitHub raw store

By default, `app.js` includes a placeholder URL for a GitHub raw JSON file. Update the URL in `CONFIG.remoteStoreUrl` and in `CONFIG.storeOptions` to point to your own repository:

```js
'https://raw.githubusercontent.com/idawud/hakeem/main/stories.json'
```

This allows the app to load stories remotely, but note that GitHub raw content is read-only from the browser.

### JSONBin writeable store

For a writeable remote store:

1. Sign up for a free account at [jsonbin.io](https://jsonbin.io)
2. Create a new bin and copy the Bin ID from the URL
3. Get your API key from your account settings
4. In the `/add/` page, enter your Bin ID and API key
5. The page will save validated stories directly to your JSONBin

Your stories will be available at: `https://api.jsonbin.io/b/YOUR_BIN_ID/latest`

Update the remote store URL in `app.js` to point to your JSONBin:
```js
'https://api.jsonbin.io/b/YOUR_BIN_ID/latest'
```

## Adding more stories

### Option 1: Use the add-story page

1. Open the app and click **Add a story**.
2. This navigates to `/add/`, where you paste a raw JSON array of stories.
3. Validate the JSON.
4. Copy the validated stories JSON and paste it into your remote `stories.json` file.

The raw JSON is also saved locally as drafts in your browser.

### Option 2: Edit `stories.json`

Add new story objects to the `stories` array in `stories.json`.

Each story should use the same schema as the sample entries.

## Deploy to GitHub Pages

### Automatic Deployment

1. Push this repository to GitHub (already done).
2. Go to your repository settings.
3. Scroll down to "Pages" section.
4. Under "Source", select "Deploy from a branch".
5. Choose `main` branch and `/ (root)` folder.
6. Click "Save".

Your app will be available at: `https://idawud.github.io/hakeem/`

### Manual Deployment (Alternative)

If you prefer to deploy from a `docs/` folder:

1. Create a `docs/` folder in your repository.
2. Copy all files (except `.env`, `.gitignore`, and development files) to `docs/`.
3. In repository settings → Pages, select `main` branch and `/docs` folder.

### Environment Variables in Production

For production deployment, JSONBin credentials are entered manually in the `/add/` page. The app saves them securely in browser localStorage.

If you want to inject environment variables during build:

1. Use GitHub Actions with repository secrets
2. Create a build workflow that injects the variables into the HTML/JS
3. Or use a static site generator that supports environment variables

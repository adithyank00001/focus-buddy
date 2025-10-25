# Focus Partner Configuration System

This document explains how to configure the Focus Partner Chrome extension to use environment variables for AI-related settings.

## Overview

The Focus Partner extension has been refactored to use environment variables for all AI-related configurations, including:

- OpenAI API keys
- Model names (gpt-4o-mini, gpt-4o, gpt-3.5-turbo, etc.)
- API endpoints

## Simple Configuration Method

### Using .env File

1. **Update .env file**: Ensure your `.env` file contains:

   ```
   OPENAI_API_KEY=your_actual_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   ```

2. **Run build script**: Execute the build script to populate the configuration:

   ```bash
   npm run build-config
   # or
   node scripts/build-config.js
   ```

3. **Load extension**: The extension will automatically load the configuration from the environment variables.

## How It Works

The configuration system works by:

1. **Reading .env file**: The build script reads your `.env` file
2. **Populating config.js**: Values are written to `scripts/config.js`
3. **Global availability**: The config is made available globally as `window.ENV_CONFIG` and `globalThis.ENV_CONFIG`
4. **Direct access**: All AI scripts access the configuration directly using `ENV_CONFIG.OPENAI_API_KEY` and `ENV_CONFIG.OPENAI_MODEL`

## Files Modified

The following files have been updated to use environment variables:

- `scripts/ai.js` - Main AI integration script
- `background.js` - Background service worker
- `popup/popup.js` - Popup interface script
- `scripts/config.js` - Environment configuration loader
- `scripts/build-config.js` - Build script for .env integration
- `manifest.json` - Updated to include config.js
- `popup/popup.html` - Updated to load config.js

## Configuration Access

All AI-related code now uses:

```javascript
API_KEY: window.ENV_CONFIG?.OPENAI_API_KEY || "";
MODEL: window.ENV_CONFIG?.OPENAI_MODEL || "gpt-4o-mini";
```

## Security Notes

- **No hardcoded API keys**: All API keys are loaded from environment variables
- **Environment variable-based**: Configuration comes from `.env` file
- **Build-time population**: Values are populated during build process
- **No runtime storage**: No Chrome storage needed for configuration

## Development Workflow

1. **Update .env file** with your configuration
2. **Run build script** to update configuration files
3. **Reload extension** in Chrome to pick up changes
4. **Test functionality** to ensure configuration is working

## Troubleshooting

### Configuration Not Loading

1. Check that the build script ran successfully
2. Verify the `.env` file exists and is properly formatted
3. Check the browser console for error messages

### API Key Issues

1. Ensure your API key is valid and has sufficient credits
2. Check that the model name is correct and available
3. Verify the API endpoint is accessible

### Build Script Issues

1. Ensure Node.js is installed
2. Check that the `.env` file exists and is properly formatted
3. Verify file permissions for the scripts directory

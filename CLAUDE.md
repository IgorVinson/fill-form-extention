# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension called "Job Application Assistant" that uses DeepSeek/OpenAI AI integration to intelligently auto-fill job application forms. The extension features AI-powered form analysis, standardized answer integration, and creative field filling that works across all major job sites.

## Development Commands

### Extension Development
```bash
# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the project directory
# 4. Click reload button (🔄) after making changes

# Test the extension
# Use the "Fill Current Page" button in extension popup
# Or open browser console (F12) on job application pages for debugging
```

### Testing
```bash
# Primary testing method: Use extension popup "Fill Current Page" button
# Debug via browser console (F12) to see AI request/response logs
# Check "AI Response Log" in extension popup for detailed AI interactions
```

## Architecture Overview

### AI-Driven Workflow (Current System)
The extension follows a 6-step AI-powered workflow:

1. **Page Analysis** (`pageAnalyzer.js`) - Extracts comprehensive form structure and context
2. **CV Data Loading** (`storage.js`) - Loads structured CV from local storage  
3. **Standard Answers Loading** (`standard-answers.json`) - Loads predefined responses for common questions
4. **AI Analysis** (`aiService.js`) - Sends page+CV+standard answers to DeepSeek/OpenAI for intelligent field mapping
5. **Response Processing** (`responseProcessor.js`) - Parses and validates AI responses
6. **Auto-Fill Execution** (`smartFiller.js`) - Applies values to form fields with creative filling

### Core Components

- **`content.js`** - Main orchestrator script, coordinates complete AI workflow
- **`aiService.js`** - DeepSeek/OpenAI/Local LLM integration with multi-provider support
- **`pageAnalyzer.js`** - Advanced form field detection and context extraction
- **`responseProcessor.js`** - Parse and validate AI responses with error handling
- **`smartFiller.js`** - Universal form filling logic for all field types
- **`storage.js`** - Local storage management for CV data and settings
- **`standard-answers.json`** - Predefined responses for demographics, work auth, etc.
- **`cvParser.js`** - Parses CV_default.html into structured JSON
- **`background.js`** - Service worker for extension lifecycle events
- **`popup.js/html`** - Extension popup UI with AI provider configuration

### Additional Components
- **`companyExtractor.js`** - Extract company info from job pages
- **`coverLetterGenerator.js`** - AI cover letter generation

## Data Structures

### CV Data Schema
```javascript
{
  personal: { name, email, phone, linkedin, location, workAuthorization },
  professional: { title, summary, skills[], experience[], education[], projects[] },
  preferences: { roleInterest, questions{} }
}
```

### Page Data Structure
```javascript
{
  url: string,
  title: string,
  fields: [{
    id: string,
    type: 'input'|'select'|'textarea'|'checkbox'|'radio',
    label: string,
    name: string,
    required: boolean,
    options?: string[],
    context: string
  }]
}
```

## AI Integration

### Supported LLM Options
- **DeepSeek** (default): deepseek-chat model via API (fast and cost-effective)
- **OpenAI**: GPT-4o-mini via API
- **Local LLM**: Ollama integration (localhost:11434) with llama3.1:8b

### AI Configuration
- Multi-provider support with easy switching
- API keys stored securely in extension storage
- Enhanced prompts for creative field filling (no empty strings)
- Standard answers integration for consistent responses
- Error handling with retry logic and provider fallbacks

## Key Files for Development

- **`manifest.json`** - Extension configuration and permissions
- **`standard-answers.json`** - Standardized responses for common questions (editable)
- **`TESTING.md`** - Comprehensive testing guide
- **`mvp-roadmap.md`** - Complete development phases and implementation status

## Development Workflow

1. **Make code changes** to relevant component files
2. **Reload extension** in chrome://extensions/
3. **Test on job forms** using "Fill Current Page" button in extension popup
4. **Check console logs** (F12) for detailed AI request/response debugging
5. **Review AI Response Log** in extension popup for detailed AI interactions
6. **Edit standard-answers.json** to customize responses for common questions

## Testing Strategy

- **Primary test site**: https://apply.workable.com/lago-1/j/88ECCCE5E5/apply/
- **Extension popup testing**: Use "Fill Current Page" button for form filling
- **AI response debugging**: Check AI Response Log in popup for detailed interactions
- **Cross-site validation**: Test on LinkedIn, Indeed, and other job sites
- **Standard answers**: Verify demographic and work authorization responses

## Extension States

- **Phase 1-3: COMPLETE** - Core infrastructure, AI-powered auto-fill, cover letters
- **Phase 4: PENDING** - UI enhancements and polish
- **Phase 5: COMPLETE** - Advanced AI integration with DeepSeek/OpenAI and standard answers

The extension is currently in a fully functional state with intelligent AI-driven form filling, creative response generation, and standardized answer integration. All legacy pattern-matching code has been removed in favor of the AI-powered approach.
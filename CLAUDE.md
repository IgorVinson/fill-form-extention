# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension called "Job Application Assistant" that uses AI to automatically fill job application forms based on CV data. The extension has evolved from a simple field-mapping system to an intelligent AI-driven workflow that can analyze any job form and generate appropriate responses.

## Development Commands

### Extension Development
```bash
# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the project directory
# 4. Click reload button (🔄) after making changes

# Test the extension
# Open browser console (F12) on any job application page and run:
testPhase1();  # Run complete integration test
testPageOnly();  # Test page analysis only
testCurrentPage();  # Analyze current page forms
```

### Testing
```bash
# The main test command (run in browser console on job application pages)
testPhase1();

# Individual component testing
const pageAnalyzer = new PageAnalyzer();
const pageData = pageAnalyzer.extractPageData();
```

## Architecture Overview

### AI-Driven Workflow (Current System)
The extension follows a 5-step AI-powered workflow:

1. **Page Analysis** (`pageAnalyzer.js`) - Extracts form structure and context
2. **CV Data Loading** (`storage.js`) - Loads structured CV from local storage  
3. **AI Analysis** (`aiService.js`) - Sends page+CV data to AI for field mapping
4. **Response Processing** (`responseProcessor.js`) - Parses AI responses to form data
5. **Auto-Fill Execution** (`smartFiller.js`) - Applies values to form fields

### Core Components

- **`content.js`** - Main orchestrator script, initializes all components
- **`pageAnalyzer.js`** - Extracts comprehensive form data (fields, labels, context)
- **`aiService.js`** - Handles OpenAI/Local LLM integration with intelligent prompting
- **`responseProcessor.js`** - Maps AI responses back to form fields with validation
- **`smartFiller.js`** - Universal form filling logic for all field types
- **`storage.js`** - Local storage management for CV data and settings
- **`cvParser.js`** - Parses CV_default.html into structured JSON
- **`background.js`** - Service worker for extension lifecycle events
- **`popup.js/html`** - Extension popup UI for configuration

### Legacy Components (Fallback)
- **`fieldDetector.js`** - Pattern-based field detection (legacy)
- **`fieldMapper.js`** - Hardcoded CV-to-field mapping (legacy)
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
- **OpenAI** (default): GPT-4o-mini via API
- **Local LLM**: Ollama integration (localhost:11434) with llama3.1:8b

### AI Configuration
- API keys stored in extension storage
- Prompts optimized for form analysis and field mapping
- Error handling with retry logic and fallback mechanisms

## Key Files for Development

- **`manifest.json`** - Extension configuration and permissions
- **`TESTING.md`** - Comprehensive testing guide with console commands
- **`mvp-roadmap.md`** - Complete development phases and implementation status
- **`workable-fixes-checklist.md`** - Technical architecture documentation

## Development Workflow

1. **Make code changes** to relevant component files
2. **Reload extension** in chrome://extensions/
3. **Test on job forms** using `testPhase1()` in browser console
4. **Check console logs** for detailed debugging information
5. **Verify form filling** works correctly across different field types

## Testing Strategy

- **Primary test site**: https://apply.workable.com/lago-1/j/88ECCCE5E5/apply/
- **Console testing**: Use `testPhase1()` for comprehensive workflow testing
- **Component isolation**: Test individual components with specific functions
- **Cross-site validation**: Test on LinkedIn, Indeed, and other job sites

## Extension States

- **Phase 1-3: COMPLETE** - Core infrastructure, auto-fill, cover letters
- **Phase 4: PENDING** - UI enhancements and polish
- **Phase 5: COMPLETE** - Intelligent form analysis with AI integration

The extension is currently in a fully functional state with AI-driven form filling capabilities.
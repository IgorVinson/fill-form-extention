# Fill Form Extension

Chrome extension that auto-fills job application forms using AI-powered smart matching.

<!-- Add screenshot here -->

## Overview

Job Application Assistant is a powerful Chrome extension that streamlines the job application process by automatically filling out forms using AI. It analyzes job descriptions, matches them with your CV and standard answers, and intelligently populates application fields — saving hours of repetitive data entry.

## Key Features

- **Auto-Form Detection**: Automatically identifies job application forms on any website
- **AI-Powered Matching**: Uses OpenAI/DeepSeek to generate contextual responses based on:
  - Job description analysis
  - Your CV content
  - Stored standard answers
- **Smart Field Mapping**: Intelligently maps your data to form fields
- **Cover Letter Generation**: Creates tailored cover letters for each application
- **Company Research**: Automatically extracts company information from the page
- **Customizable Responses**: Store and manage standard answers for common questions
- **One-Click Apply**: Fill entire forms with a single click
- **Privacy-First**: All processing happens via your chosen AI API — no data stored on external servers

## Tech Stack

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## Getting Started

### Prerequisites

- Google Chrome browser
- OpenAI API key or DeepSeek API key

### Installation

#### Development Mode

```bash
# Clone the repository
git clone https://github.com/IgorVinson/fill-form-extention.git
cd fill-form-extention

# Open Chrome and navigate to chrome://extensions/
# Enable "Developer mode" in the top right
# Click "Load unpacked" and select this directory
```

#### Configuration

1. Click the extension icon in Chrome toolbar
2. Enter your OpenAI or DeepSeek API key
3. Upload your CV (PDF or HTML format)
4. Fill in standard answers for common questions

## Project Structure

```
fill-form-extention/
├── manifest.json           # Chrome extension manifest
├── background.js           # Service worker for background tasks
├── content.js             # Content script injected into web pages
├── popup.html             # Extension popup UI
├── popup.js               # Popup JavaScript logic
├── smartFiller.js         # Core form-filling engine
├── coverLetterGenerator.js # AI cover letter generation
├── cvParser.js            # CV parsing utilities
├── pageAnalyzer.js        # Page content analysis
├── aiService.js           # AI API integration
├── dataStructure.js       # Data models
├── storage.js             # Chrome storage utilities
├── companyExtractor.js    # Company info extraction
├── responseProcessor.js   # AI response handling
├── standard-answers.json  # Default standard answers
└── icon.png               # Extension icon
```

## How It Works

1. **Page Detection**: The content script scans pages for job application forms
2. **Data Analysis**: 
   - Extracts job description and company info
   - Analyzes form fields and their labels
   - Matches questions with your standard answers
3. **AI Processing**: Sends context to AI API to generate optimal responses
4. **Form Population**: Intelligently fills form fields with generated content
5. **Review & Submit**: User reviews filled form and submits application

## Configuration Files

### standard-answers.json

Store your responses to common application questions:

```json
{
  "Why are you interested in this position?": "I'm passionate about...",
  "Describe your experience with React": "I have 3 years of experience...",
  "Expected salary": "$80,000 - $100,000"
}
```

## Development

### File Overview

- **background.js**: Handles extension lifecycle, API calls, and cross-tab communication
- **content.js**: Injected into web pages, detects forms, and communicates with background
- **smartFiller.js**: Core logic for matching data to form fields
- **pageAnalyzer.js**: Extracts job descriptions and company information
- **aiService.js**: Manages AI API calls (OpenAI/DeepSeek)

### Testing

See [TESTING.md](TESTING.md) for detailed testing procedures.

### Roadmap

See [mvp-roadmap.md](mvp-roadmap.md) for planned features.

## Privacy & Security

- Your CV and standard answers are stored locally in Chrome storage
- API keys are encrypted before storage
- No data is sent to external servers except AI API calls
- You control which AI provider to use

## License

MIT

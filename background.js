// Background Script - One-time CV parsing and initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed - initializing CV data');
    await initializeCVData();
  }
});

// Initialize CV data on first install
async function initializeCVData() {
  try {
    // Check if already initialized
    const result = await chrome.storage.local.get(['jobHelperInitialized']);
    if (result.jobHelperInitialized) {
      console.log('CV data already initialized');
      return;
    }

    console.log('Starting CV data initialization...');
    
    // Parse actual CV data
    const cvData = await parseCVFromHTML();
    
    const defaultSettings = {
      openaiApiKey: '',
      autoFillEnabled: true,
      coverLetterEnabled: false
    };

    const defaultTemplates = {
      coverLetterTemplates: []
    };

    // Save parsed CV data to storage
    await chrome.storage.local.set({
      jobHelperCVData: cvData,
      jobHelperSettings: defaultSettings,
      jobHelperTemplates: defaultTemplates,
      jobHelperInitialized: true
    });

    console.log('CV data initialization completed successfully');
  } catch (error) {
    console.error('Error initializing CV data:', error);
    
    // Fallback to defaults if parsing fails
    const defaultCVData = {
      personal: { name: '', email: '', phone: '', linkedin: '', location: '' },
      professional: { title: '', summary: '', skills: [], skillsCategories: {}, experience: [], education: [], projects: [] }
    };
    
    await chrome.storage.local.set({
      jobHelperCVData: defaultCVData,
      jobHelperSettings: { openaiApiKey: '', autoFillEnabled: true, coverLetterEnabled: false },
      jobHelperTemplates: { coverLetterTemplates: [] },
      jobHelperInitialized: true
    });
  }
}

// Parse CV from HTML file
async function parseCVFromHTML() {
  try {
    const response = await fetch(chrome.runtime.getURL('CV_default.html'));
    const htmlText = await response.text();
    
    // Use regex parsing instead of DOMParser in background script
    return parseHTMLWithRegex(htmlText);
  } catch (error) {
    console.error('Error parsing CV:', error);
    throw error;
  }
}

// Parse HTML using regex patterns (for background script)
function parseHTMLWithRegex(htmlText) {
  const cvData = {
    personal: {
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      location: ''
    },
    professional: {
      title: '',
      summary: '',
      skills: [],
      skillsCategories: {},
      experience: [],
      education: [],
      projects: []
    }
  };

  // Extract name
  const nameMatch = htmlText.match(/<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i);
  if (nameMatch) cvData.personal.name = nameMatch[1].trim();

  // Extract email
  const emailMatch = htmlText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) cvData.personal.email = emailMatch[1];

  // Extract phone
  const phoneMatch = htmlText.match(/\((\d{3})\)\s*(\d{3})-(\d{4})/);
  if (phoneMatch) cvData.personal.phone = phoneMatch[0];

  // Extract LinkedIn
  const linkedinMatch = htmlText.match(/href="([^"]*linkedin[^"]*)"/);
  if (linkedinMatch) cvData.personal.linkedin = linkedinMatch[1];

  // Extract professional title
  const titleMatch = htmlText.match(/<[^>]*class="[^"]*professional-title[^"]*"[^>]*>([^<]+)</i);
  if (titleMatch) cvData.professional.title = titleMatch[1].trim();

  // Extract location from contact info
  const locationMatch = htmlText.match(/([^,\n]+,\s*[^,\n]+)(?![^<]*linkedin)/);
  if (locationMatch) cvData.personal.location = locationMatch[1].trim();

  console.log('CV parsed successfully:', cvData);
  return cvData;
}

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'initializeCV') {
    initializeCVData().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
});
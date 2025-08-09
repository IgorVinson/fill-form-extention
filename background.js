// Background Script - One-time CV parsing and initialization
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === "install") {
    console.log("Extension installed - initializing CV data");
    await initializeCVData();
  }
});

// Initialize CV data on first install
async function initializeCVData() {
  try {
    // Check if already initialized
    const result = await chrome.storage.local.get(["jobHelperInitialized"]);
    if (result.jobHelperInitialized) {
      console.log("CV data already initialized");
      return;
    }

    console.log("Starting CV data initialization...");

    // Parse actual CV data
    const cvData = await parseCVFromHTML();

    const defaultSettings = {
      openaiApiKey: "",
      autoFillEnabled: true,
      coverLetterEnabled: false,
      aiProvider: "deepseek",
      deepseekApiKey: "",
      deepseekModel: "deepseek-chat",
      deepseekURL: "https://api.deepseek.com/v1/chat/completions",
      useLocalLLM: false,
      localURL: "http://localhost:11434/api/chat",
      localModel: "deepseek-r1:latest",
    };

    const defaultTemplates = {
      coverLetterTemplates: [],
    };

    // Save parsed CV data to storage
    await chrome.storage.local.set({
      jobHelperCVData: cvData,
      jobHelperSettings: defaultSettings,
      jobHelperTemplates: defaultTemplates,
      jobHelperInitialized: true,
    });

    console.log("CV data initialization completed successfully");
  } catch (error) {
    console.error("Error initializing CV data:", error);

    // Fallback to defaults if parsing fails
    const defaultCVData = {
      personal: { name: "", email: "", phone: "", linkedin: "", location: "" },
      professional: {
        title: "",
        summary: "",
        skills: [],
        skillsCategories: {},
        experience: [],
        education: [],
        projects: [],
      },
    };

    await chrome.storage.local.set({
      jobHelperCVData: defaultCVData,
      jobHelperSettings: {
        openaiApiKey: "",
        autoFillEnabled: true,
        coverLetterEnabled: false,
      },
      jobHelperTemplates: { coverLetterTemplates: [] },
      jobHelperInitialized: true,
    });
  }
}

// Parse CV from HTML file
async function parseCVFromHTML() {
  try {
    const response = await fetch(chrome.runtime.getURL("CV_default.html"));
    const htmlText = await response.text();

    // Use regex parsing instead of DOMParser in background script
    return parseHTMLWithRegex(htmlText);
  } catch (error) {
    console.error("Error parsing CV:", error);
    throw error;
  }
}

// Parse HTML using regex patterns (for background script)
function parseHTMLWithRegex(htmlText) {
  const cvData = {
    personal: {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      location: "",
    },
    professional: {
      title: "",
      summary: "",
      skills: [],
      skillsCategories: {},
      experience: [],
      education: [],
      projects: [],
    },
  };

  // Extract name
  const nameMatch = htmlText.match(
    /<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i
  );
  if (nameMatch) cvData.personal.name = nameMatch[1].trim();

  // Extract email
  const emailMatch = htmlText.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  if (emailMatch) cvData.personal.email = emailMatch[1];

  // Extract phone
  const phoneMatch = htmlText.match(/\((\d{3})\)\s*(\d{3})-(\d{4})/);
  if (phoneMatch) cvData.personal.phone = phoneMatch[0];

  // Extract LinkedIn
  const linkedinMatch = htmlText.match(/href="([^"]*linkedin[^"]*)"/);
  if (linkedinMatch) cvData.personal.linkedin = linkedinMatch[1];

  // Extract professional title
  const titleMatch = htmlText.match(
    /<[^>]*class="[^"]*professional-title[^"]*"[^>]*>([^<]+)</i
  );
  if (titleMatch) cvData.professional.title = titleMatch[1].trim();

  // Extract location from contact info
  const locationMatch = htmlText.match(/([^,\n]+,\s*[^,\n]+)(?![^<]*linkedin)/);
  if (locationMatch) cvData.personal.location = locationMatch[1].trim();

  console.log("CV parsed successfully:", cvData);
  return cvData;
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log("Background: Service worker started");
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Background: Service worker installed/updated");
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔥 Background: RECEIVED MESSAGE!");
  console.log("Background: Action:", request.action);
  console.log("Background: Sender:", sender);
  
  if (request.action === "test") {
    console.log("Background: Test message received successfully!");
    sendResponse({success: true, message: "Background script is working"});
    return;
  }
  
  if (request.action === "initializeCV") {
    initializeCVData()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (request.action === "makeLocalAPICall") {
    makeLocalAPICall(request.url, request.options)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "testLocalConnection") {
    testLocalConnection(request.url)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }

  // Handle DeepSeek and OpenAI API calls
  if (request.action === "makeOpenAICall") {
    console.log("Background: Received makeOpenAICall request");
    console.log("Background: URL:", request.url);
    console.log("Background: API Key length:", request.apiKey?.length || 0);
    
    // Simplified approach - just try the call without fancy error handling
    (async () => {
      try {
        console.log("Background: Making simple fetch call...");
        const response = await fetch(request.url, {
          method: "POST", 
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${request.apiKey}`
          },
          body: request.options.body
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Background: ✅ SUCCESS!");
          sendResponse({ success: true, data: data });
        } else {
          const errorText = await response.text();
          console.log("Background: ❌ API Error:", response.status, errorText);
          sendResponse({ error: `API Error ${response.status}: ${errorText}` });
        }
      } catch (error) {
        console.log("Background: ❌ Network Error:", error.message);
        sendResponse({ error: error.message });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

/**
 * Make API call to local LLM from background script
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Object} API response
 */
async function makeLocalAPICall(url, options) {
  try {
    console.log("Background: Making local API call to", url);
    console.log("Background: Request options:", options);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Background: API Error ${response.status}:`, errorText);
      throw new Error(`Local LLM Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Background: Local API call successful");
    return { success: true, data };
  } catch (error) {
    console.error("Background: Local API call failed:", error);
    throw error;
  }
}

/**
 * Test connection to local LLM from background script
 * @param {string} baseUrl - Base URL for the local LLM
 * @returns {Object} Connection test result
 */
async function testLocalConnection(baseUrl) {
  try {
    console.log("Background: Testing local LLM connection to", baseUrl);

    const testURL = baseUrl.replace("/api/chat", "/api/tags");
    const response = await fetch(testURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Local LLM not responding (${response.status})`);
    }

    const data = await response.json();
    console.log("Background: Local LLM connection successful");
    return { success: true, data };
  } catch (error) {
    console.error("Background: Local LLM connection failed:", error);
    throw error;
  }
}

/**
 * Make API call to OpenAI/DeepSeek from background script
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options  
 * @param {string} apiKey - API key for authorization
 * @returns {Object} API response
 */
async function makeOpenAICall(url, options, apiKey) {
  try {
    console.log("Background: Making OpenAI/DeepSeek API call to", url);
    
    // Add authorization header
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${apiKey}`
      }
    };

    console.log("Background: Making fetch request...");
    
    // Try without DevTools interference - completely ignore DevTools blocking
    let response;
    try {
      response = await fetch(url, requestOptions);
      console.log("Background: Fetch succeeded! Status:", response.status);
    } catch (fetchError) {
      console.log("Background: Fetch failed, but let's try to continue:", fetchError.message);
      // Even if DevTools says it's blocked, sometimes the request actually works
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Background: API Error ${response.status}:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("Background: OpenAI/DeepSeek API call successful");
    return { success: true, data };
  } catch (error) {
    console.error("Background: OpenAI/DeepSeek API call failed:", error);
    throw error;
  }
}

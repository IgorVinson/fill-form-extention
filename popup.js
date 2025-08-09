// Job Helper Extension - Popup Interface
let storage, cvParser, companyExtractor, coverLetterGenerator, templates;

// Initialize components
document.addEventListener("DOMContentLoaded", async () => {
  storage = new StorageManager();
  cvParser = new CVParser();
  companyExtractor = new CompanyExtractor();
  coverLetterGenerator = new CoverLetterGenerator();
  templates = new Templates();

  await initializeUI();
  setupEventListeners();
});

// Initialize UI with current data
async function initializeUI() {
  try {
    const initialized = await storage.isInitialized();
    const settings = await storage.loadSettings();

    // Update UI based on initialization status
    updateCVStatus(initialized);

    // Load settings
    document.getElementById("autoFillEnabled").checked =
      settings.autoFillEnabled;

    // Load AI provider settings
    const aiProvider = settings.aiProvider || "deepseek";
    const modeRadio = document.getElementById(aiProvider + "Mode");
    if (modeRadio) {
      modeRadio.checked = true;
    }
    handleAIModeChange(); // Show appropriate config section

    // Load DeepSeek settings
    if (settings.deepseekApiKey) {
      document.getElementById("deepseekApiKey").value = settings.deepseekApiKey;
    }
    if (settings.deepseekModel) {
      document.getElementById("deepseekModel").value = settings.deepseekModel;
    }

    // Load local LLM settings
    if (settings.localURL) {
      document.getElementById("localURL").value = settings.localURL;
    }
    if (settings.localModel) {
      document.getElementById("localModel").value = settings.localModel;
    }

    if (initialized) {
      const cvData = await storage.loadCVData();
      displayCVInfo(cvData);
    }
  } catch (error) {
    console.error("Error initializing UI:", error);
    updateStatus("cvStatus", "Error initializing extension", "error");
  }
}

// Setup all event listeners
function setupEventListeners() {
  // CV Initialization
  document
    .getElementById("initializeCV")
    .addEventListener("click", initializeCV);
  document.getElementById("showCV").addEventListener("click", showCVData);

  // Settings
  document
    .getElementById("autoFillEnabled")
    .addEventListener("change", saveSettings);
  document.getElementById("saveApiKey").addEventListener("click", saveApiKey);
  document.getElementById("saveDeepSeekConfig").addEventListener("click", saveDeepSeekConfig);
  document.getElementById("testDeepSeekAPI").addEventListener("click", testDeepSeekAPI);
  document.getElementById("showAILog").addEventListener("click", showAILog);

  // AI Mode Configuration
  document.querySelectorAll('input[name="aiMode"]').forEach(radio => {
    radio.addEventListener("change", handleAIModeChange);
  });
  document
    .getElementById("saveLocalConfig")
    .addEventListener("click", saveLocalConfig);
  document
    .getElementById("testLocalConnection")
    .addEventListener("click", testLocalConnection);

  // Actions
  document
    .getElementById("triggerAutoFill")
    .addEventListener("click", triggerAutoFill);
  document
    .getElementById("debugContentScript")
    .addEventListener("click", debugContentScript);
  document
    .getElementById("generateCoverLetter")
    .addEventListener("click", generateCoverLetter);
}

// Initialize CV data
async function initializeCV() {
  try {
    updateStatus("cvStatus", "Parsing CV data...", "loading");

    const cvData = await cvParser.parseCVFromHTML();

    // Validate parsed data
    if (!window.CVDataStructure.validateCVData(cvData)) {
      throw new Error("Invalid CV data structure");
    }

    await storage.saveCVData(cvData);
    await storage.setInitialized(true);

    updateCVStatus(true);
    displayCVInfo(cvData);
    updateStatus("cvStatus", "CV data initialized successfully!", "success");
  } catch (error) {
    console.error("Error initializing CV:", error);
    updateStatus("cvStatus", `Error: ${error.message}`, "error");
  }
}

// Show CV data
async function showCVData() {
  try {
    const cvData = await storage.loadCVData();
    document.getElementById("debugOutput").textContent = JSON.stringify(
      cvData,
      null,
      2
    );
    document.getElementById("debugSection").style.display = "block";
  } catch (error) {
    console.error("Error showing CV data:", error);
  }
}

// Save settings
async function saveSettings() {
  try {
    const currentSettings = await storage.loadSettings();
    const settings = {
      ...currentSettings, // Preserve existing settings
      autoFillEnabled: document.getElementById("autoFillEnabled").checked,
      coverLetterEnabled: false,
    };

    await storage.saveSettings(settings);
    console.log("Settings saved");
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Save API key
async function saveApiKey() {
  try {
    const apiKey = document.getElementById("apiKey").value.trim();
    if (!apiKey) {
      updateStatus("apiStatus", "Please enter an API key", "error");
      return;
    }

    const settings = await storage.loadSettings();
    settings.openaiApiKey = apiKey;
    await storage.saveSettings(settings);

    document.getElementById("apiKey").value = "";
    updateStatus("apiStatus", "OpenAI API key saved successfully!", "success");
  } catch (error) {
    console.error("Error saving API key:", error);
    updateStatus("apiStatus", "Error saving API key", "error");
  }
}

async function saveDeepSeekConfig() {
  try {
    const apiKey = document.getElementById("deepseekApiKey").value.trim();
    const model = document.getElementById("deepseekModel").value.trim();
    
    if (!apiKey) {
      updateStatus("apiStatus", "Please enter a DeepSeek API key", "error");
      return;
    }

    const settings = await storage.loadSettings();
    settings.deepseekApiKey = apiKey;
    settings.deepseekModel = model || "deepseek-chat";
    await storage.saveSettings(settings);

    document.getElementById("deepseekApiKey").value = "";
    updateStatus("apiStatus", "DeepSeek configuration saved successfully!", "success");
  } catch (error) {
    console.error("Error saving DeepSeek config:", error);
    updateStatus("apiStatus", "Error saving DeepSeek config", "error");
  }
}

// Trigger auto-fill
async function triggerAutoFill() {
  try {
    // Provide immediate feedback to user
    const button = document.getElementById("triggerAutoFill");
    const originalText = button.textContent;
    button.textContent = "Filling...";
    button.disabled = true;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    console.log("🔍 Debug: Current tab info:", {
      url: tab.url,
      title: tab.title,
      id: tab.id
    });

    // Check if content script is loaded, if not inject it
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return typeof window.aiAutoFillForm === 'function';
        }
      });
      
      const isLoaded = result[0]?.result;
      console.log("🔍 Content script loaded?", isLoaded);
      
      if (!isLoaded) {
        console.log("🔧 Content script not loaded, injecting...");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "dataStructure.js",
            "storage.js", 
            "fieldDetector.js",
            "fieldMapper.js",
            "companyExtractor.js",
            "pageAnalyzer.js",
            "aiService.js",
            "responseProcessor.js",
            "smartFiller.js",
            "content.js"
          ]
        });
        console.log("✅ Content scripts injected manually");
        
        // Wait a bit for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (injectionError) {
      console.error("🔧 Failed to check/inject content scripts:", injectionError);
      // Try to inject anyway
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "dataStructure.js",
            "storage.js", 
            "fieldDetector.js",
            "fieldMapper.js",
            "companyExtractor.js",
            "pageAnalyzer.js",
            "aiService.js",
            "responseProcessor.js",
            "smartFiller.js",
            "content.js"
          ]
        });
        console.log("✅ Content scripts force-injected");
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (forceError) {
        console.error("❌ Force injection also failed:", forceError);
      }
    }

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "triggerAutoFill",
      },
      response => {
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;

        if (chrome.runtime.lastError) {
          console.error(
            "Error triggering auto-fill:",
            chrome.runtime.lastError
          );
          updateStatus("cvStatus", "Error triggering auto-fill", "error");
        } else if (response && response.success) {
          console.log("Auto-fill triggered:", response);
          updateStatus("cvStatus", response.message, "success");
        } else {
          updateStatus("cvStatus", "Auto-fill completed", "success");
        }
      }
    );
  } catch (error) {
    console.error("Error triggering auto-fill:", error);
    updateStatus("cvStatus", `Error: ${error.message}`, "error");

    // Restore button state
    const button = document.getElementById("triggerAutoFill");
    button.textContent = "Fill Current Page";
    button.disabled = false;
  }
}

// Generate cover letter
async function generateCoverLetter() {
  try {
    // Provide immediate feedback to user
    const button = document.getElementById("generateCoverLetter");
    const originalText = button.textContent;
    button.textContent = "Generating...";
    button.disabled = true;

    const settings = await storage.loadSettings();
    if (!settings.openaiApiKey) {
      updateStatus("apiStatus", "OpenAI API key required", "error");
      // Restore button state
      button.textContent = originalText;
      button.disabled = false;
      return;
    }

    // Load CV data
    const cvData = await storage.loadCVData();
    if (!window.CVDataStructure.validateCVData(cvData)) {
      updateStatus("cvStatus", "Invalid CV data", "error");
      // Restore button state
      button.textContent = originalText;
      button.disabled = false;
      return;
    }

    // Get company info from current tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    let companyInfo = {
      companyName: "the company",
      jobTitle: "the position",
      jobDescription: "No description available",
      location: "Location not specified",
    };

    // Try to extract company info from the page
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "extractCompanyInfo",
      });

      if (response && response.success) {
        companyInfo = response.companyInfo;
      }
    } catch (error) {
      console.log("Could not extract company info from page, using defaults");
    }

    // Generate cover letter using OpenAI
    const result = await coverLetterGenerator.generateCoverLetter(
      cvData,
      companyInfo,
      settings.openaiApiKey
    );

    // Restore button state
    button.textContent = originalText;
    button.disabled = false;

    if (result.success) {
      document.getElementById("coverLetterOutput").value = result.coverLetter;
      updateStatus(
        "cvStatus",
        "Cover letter generated successfully!",
        "success"
      );

      // Add option to insert into page
      addInsertButton(result.coverLetter);
    } else {
      updateStatus("cvStatus", `Error: ${result.error}`, "error");
      document.getElementById("coverLetterOutput").value =
        "Error generating cover letter";
    }
  } catch (error) {
    console.error("Error generating cover letter:", error);
    updateStatus("cvStatus", `Error: ${error.message}`, "error");
    document.getElementById("coverLetterOutput").value =
      "Error generating cover letter";

    // Restore button state
    const button = document.getElementById("generateCoverLetter");
    button.textContent = "Generate Cover Letter";
    button.disabled = false;
  }
}

// Add insert button for cover letter
function addInsertButton(coverLetter) {
  // Remove existing insert button if present
  const existingButton = document.getElementById("insertCoverLetter");
  if (existingButton) {
    existingButton.remove();
  }

  // Create new insert button
  const insertButton = document.createElement("button");
  insertButton.id = "insertCoverLetter";
  insertButton.textContent = "Insert into Page";
  insertButton.addEventListener("click", () => insertCoverLetter(coverLetter));

  // Insert before the cover letter output
  const output = document.getElementById("coverLetterOutput");
  output.parentNode.insertBefore(insertButton, output);
}

// Insert cover letter into the current page
async function insertCoverLetter(coverLetter) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "insertCoverLetter",
        coverLetter: coverLetter,
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error inserting cover letter:",
            chrome.runtime.lastError
          );
          updateStatus("cvStatus", "Error inserting cover letter", "error");
        } else if (response && response.success) {
          console.log("Cover letter inserted:", response);
          updateStatus("cvStatus", response.message, "success");
        } else {
          updateStatus("cvStatus", "Cover letter inserted", "success");
        }
      }
    );
  } catch (error) {
    console.error("Error inserting cover letter:", error);
    updateStatus("cvStatus", `Error: ${error.message}`, "error");
  }
}

// Helper functions
function updateCVStatus(initialized) {
  const button = document.getElementById("initializeCV");
  const showButton = document.getElementById("showCV");

  if (initialized) {
    button.textContent = "Re-initialize CV Data";
    showButton.style.display = "block";
  } else {
    button.textContent = "Initialize CV Data";
    showButton.style.display = "none";
  }
}

function displayCVInfo(cvData) {
  if (cvData && cvData.personal && cvData.personal.name) {
    updateStatus("cvStatus", `CV loaded: ${cvData.personal.name}`, "success");
  } else {
    updateStatus("cvStatus", "CV loaded (no name found)", "success");
  }
}

function updateStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status ${type}`;
}

// AI Mode Configuration Functions
function handleAIModeChange() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked').value;
  
  // Hide all config sections
  document.getElementById("openaiConfig").style.display = "none";
  document.getElementById("deepseekConfig").style.display = "none";
  document.getElementById("localConfig").style.display = "none";
  
  // Show the relevant config section
  if (selectedMode === "openai") {
    document.getElementById("openaiConfig").style.display = "block";
  } else if (selectedMode === "deepseek") {
    document.getElementById("deepseekConfig").style.display = "block";
  } else if (selectedMode === "local") {
    document.getElementById("localConfig").style.display = "block";
  }

  // Save the mode immediately
  saveAIMode();
}

async function saveAIMode() {
  try {
    const selectedMode = document.querySelector('input[name="aiMode"]:checked').value;
    const settings = await storage.loadSettings();
    settings.aiProvider = selectedMode;
    
    // For backward compatibility, also set useLocalLLM
    settings.useLocalLLM = selectedMode === "local";
    
    await storage.saveSettings(settings);

    updateStatus(
      "apiStatus",
      `Switched to ${selectedMode.toUpperCase()} mode`,
      "info"
    );
  } catch (error) {
    console.error("Error saving AI mode:", error);
    updateStatus("apiStatus", "Error saving AI mode", "error");
  }
}

async function saveLocalConfig() {
  try {
    const localURL = document.getElementById("localURL").value.trim();
    const localModel = document.getElementById("localModel").value.trim();

    if (!localURL || !localModel) {
      updateStatus(
        "apiStatus",
        "Please enter both URL and model name",
        "error"
      );
      return;
    }

    const settings = await storage.loadSettings();
    settings.localURL = localURL;
    settings.localModel = localModel;
    settings.useLocalLLM = true;
    await storage.saveSettings(settings);

    updateStatus("apiStatus", "Local LLM configuration saved!", "success");
  } catch (error) {
    console.error("Error saving local config:", error);
    updateStatus("apiStatus", "Error saving local configuration", "error");
  }
}

async function testLocalConnection() {
  try {
    updateStatus("apiStatus", "Testing connection...", "info");

    const localURL = document.getElementById("localURL").value.trim();
    const localModel = document.getElementById("localModel").value.trim();

    if (!localURL || !localModel) {
      updateStatus(
        "apiStatus",
        "Please enter both URL and model name",
        "error"
      );
      return;
    }

    // Test connection to Ollama
    const testURL = localURL.replace("/api/chat", "/api/tags");
    const response = await fetch(testURL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Connection failed (${response.status})`);
    }

    const data = await response.json();
    const models = data.models || [];
    const modelExists = models.some(m => m.name === localModel);

    if (!modelExists) {
      const availableModels = models.map(m => m.name).join(", ");
      updateStatus(
        "apiStatus",
        `Model '${localModel}' not found. Available: ${availableModels}`,
        "error"
      );
      return;
    }

    updateStatus(
      "apiStatus",
      `✅ Connection successful! Model '${localModel}' is ready.`,
      "success"
    );
  } catch (error) {
    console.error("Error testing connection:", error);
    let errorMsg = "Connection failed. ";

    if (error.message.includes("fetch")) {
      errorMsg += "Make sure Ollama is running: 'ollama serve'";
    } else {
      errorMsg += error.message;
    }

    updateStatus("apiStatus", errorMsg, "error");
  }
}

// Show AI response log
async function showAILog() {
  try {
    const result = await chrome.storage.local.get(['aiResponseLog']);
    const logData = result.aiResponseLog || "No AI responses logged yet.";
    document.getElementById("aiLogOutput").value = logData;
  } catch (error) {
    document.getElementById("aiLogOutput").value = "Error loading AI log: " + error.message;
  }
}

// Test DeepSeek API with hardcoded request
async function testDeepSeekAPI() {
  const button = document.getElementById("testDeepSeekAPI");
  const originalText = button.textContent;
  
  try {
    button.textContent = "Testing...";
    button.disabled = true;
    updateStatus("apiStatus", "Sending test request to DeepSeek...", "info");
    
    // Clear previous response
    document.getElementById("deepseekTestResult").style.display = "none";
    document.getElementById("deepseekResponse").textContent = "";
    
    console.log('🧪 Starting DeepSeek API test...');
    
    // Get saved DeepSeek settings
    const settings = await storage.loadSettings();
    const apiKey = settings.deepseekApiKey;
    const model = settings.deepseekModel || "deepseek-chat";
    
    if (!apiKey) {
      throw new Error("DeepSeek API key not found. Please save your API key first.");
    }
    
    // Generate random prompt to get different jokes each time
    const animals = ['cat', 'dog', 'elephant', 'penguin', 'giraffe', 'monkey', 'lion', 'bear', 'rabbit', 'duck'];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomNumber = Math.floor(Math.random() * 1000) + 1;
    
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: `hi this is test request #${randomNumber}, can you tell me a different joke about ${randomAnimal}?`
        }
      ],
      temperature: 0.9,
      max_tokens: 1000
    };
    
    console.log('📤 Sending test request to DeepSeek:', requestBody);
    
    // Make direct API call (Note: Close DevTools if you get fetch errors)
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API Error:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ DeepSeek API Response:', data);
    console.log('🤖 AI Response Content:', data.choices?.[0]?.message?.content);
    
    // Log the joke separately for easy reading
    const joke = data.choices?.[0]?.message?.content;
    if (joke) {
      console.log('🎭 Joke from DeepSeek:', joke);
      
      // Display the response in the popup
      document.getElementById("deepseekResponse").textContent = joke;
      document.getElementById("deepseekTestResult").style.display = "block";
    }
    
    updateStatus("apiStatus", "Test successful! See response below.", "success");
    
  } catch (error) {
    console.error('❌ DeepSeek test failed:', error);
    updateStatus("apiStatus", `Test failed: ${error.message}`, "error");
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Debug content script function
async function debugContentScript() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    console.log("🐛 Debugging content script on tab:", tab.id);

    // Inject a simple debug function
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Log to page console
        console.log("🐛 DEBUG: Content script test executed");
        console.log("🐛 Available functions:", {
          aiAutoFillForm: typeof window.aiAutoFillForm,
          pageAnalyzer: typeof window.pageAnalyzer,
          aiService: typeof window.aiService,
          storageManager: typeof window.storageManager
        });
        
        // Try to analyze page
        if (window.pageAnalyzer) {
          try {
            const pageData = window.pageAnalyzer.extractPageData();
            console.log("🐛 Page analysis result:", pageData);
            return {
              success: true,
              pageData: pageData,
              functions: {
                aiAutoFillForm: typeof window.aiAutoFillForm,
                pageAnalyzer: typeof window.pageAnalyzer,
                aiService: typeof window.aiService,
                storageManager: typeof window.storageManager
              }
            };
          } catch (error) {
            console.error("🐛 Page analysis failed:", error);
            return { success: false, error: error.message };
          }
        }
        
        return { success: false, error: "pageAnalyzer not available" };
      }
    });

    console.log("🐛 Debug result:", result[0]?.result);
    updateStatus("cvStatus", "Debug info logged to page console (F12)", "info");
    
  } catch (error) {
    console.error("🐛 Debug failed:", error);
    updateStatus("cvStatus", "Debug failed: " + error.message, "error");
  }
}

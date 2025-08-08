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

    // Load AI mode settings
    const useLocalLLM = settings.useLocalLLM || false;
    document.getElementById(
      useLocalLLM ? "localMode" : "openaiMode"
    ).checked = true;
    handleAIModeChange(); // Show appropriate config section

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
    const settings = {
      autoFillEnabled: document.getElementById("autoFillEnabled").checked,
      coverLetterEnabled: false,
      openaiApiKey: (await storage.loadSettings()).openaiApiKey,
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
    updateStatus("apiStatus", "API key saved successfully!", "success");
  } catch (error) {
    console.error("Error saving API key:", error);
    updateStatus("apiStatus", "Error saving API key", "error");
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
  const useLocal = document.getElementById("localMode").checked;
  document.getElementById("openaiConfig").style.display = useLocal
    ? "none"
    : "block";
  document.getElementById("localConfig").style.display = useLocal
    ? "block"
    : "none";

  // Save the mode immediately
  saveAIMode();
}

async function saveAIMode() {
  try {
    const useLocalLLM = document.getElementById("localMode").checked;
    const settings = await storage.loadSettings();
    settings.useLocalLLM = useLocalLLM;
    await storage.saveSettings(settings);

    updateStatus(
      "apiStatus",
      `Switched to ${useLocalLLM ? "Local LLM" : "OpenAI"} mode`,
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

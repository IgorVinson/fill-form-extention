// Content Script - AI-Driven Auto-fill job application forms

// Global variables for new AI workflow components
let storageManager,
  pageAnalyzer,
  aiService,
  responseProcessor,
  smartFiller,
  companyExtractor;

// Global variables for legacy components (backup)
let fieldDetector, fieldMapper;

// Initialize when script loads
(async () => {
  try {
    // Initialize new AI workflow components
    storageManager = new StorageManager();
    pageAnalyzer = new PageAnalyzer();
    aiService = new AIService();
    responseProcessor = new ResponseProcessor();
    smartFiller = new SmartFiller();
    companyExtractor = new CompanyExtractor();

    // Initialize legacy components as backup
    fieldDetector = new FieldDetector();
    fieldMapper = new FieldMapper();

    console.log("✅ AI-driven auto-fill system initialized");

    // Check if auto-fill is enabled
    const settings = await storageManager.loadSettings();
    if (settings.autoFillEnabled) {
      // Auto-fill on page load (with a small delay to ensure page is ready)
      setTimeout(() => {
        aiAutoFillForm();
      }, 1500); // Slightly longer delay for AI processing
    }
  } catch (error) {
    console.error("❌ Failed to initialize AI auto-fill system:", error);
    // Fallback to legacy system
    initializeLegacySystem();
  }
})();

// Initialize legacy system as fallback
async function initializeLegacySystem() {
  console.log("🔄 Falling back to legacy auto-fill system");
  storageManager = new StorageManager();
  fieldDetector = new FieldDetector();
  fieldMapper = new FieldMapper();
  companyExtractor = new CompanyExtractor();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "triggerAutoFill") {
    aiAutoFillForm(true) // Force run = true for manual triggers
      .then(result =>
        sendResponse({
          success: true,
          message: "AI auto-fill completed",
          ...result,
        })
      )
      .catch(error => {
        console.error("AI auto-fill failed, trying legacy:", error);
        // Fallback to legacy auto-fill
        legacyAutoFillForm()
          .then(result =>
            sendResponse({
              success: true,
              message: "Legacy auto-fill completed",
              ...result,
            })
          )
          .catch(legacyError =>
            sendResponse({ success: false, error: legacyError.message })
          );
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "insertCoverLetter") {
    insertCoverLetter(request.coverLetter)
      .then(result =>
        sendResponse({ success: true, message: "Cover letter inserted" })
      )
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  } else if (request.action === "extractCompanyInfo") {
    const companyInfo = extractCompanyInfo();
    sendResponse({ success: true, companyInfo: companyInfo });
    return true; // Keep message channel open for async response
  }
});

// Main AI-driven auto-fill function
async function aiAutoFillForm(forceRun = false) {
  try {
    console.log("🚀 Starting AI-driven auto-fill...");

    // Step 1: Load CV data and settings
    const cvData = await storageManager.loadCVData();
    const settings = await storageManager.loadSettings();

    // Check if auto-fill is enabled (unless forced by manual trigger)
    if (!forceRun && !settings.autoFillEnabled) {
      console.log("Auto-fill is disabled");
      return { success: false, message: "Auto-fill is disabled" };
    }

    // Check if we have valid CV data
    if (!window.CVDataStructure.validateCVData(cvData)) {
      console.log("Invalid CV data");
      return { success: false, message: "Invalid CV data" };
    }

    // Step 2: Extract page data
    console.log("📊 Analyzing page structure...");
    const pageData = pageAnalyzer.extractPageData();

    if (pageData.totalFields === 0) {
      console.log("No form fields detected on page");
      return { success: false, message: "No form fields detected" };
    }

    console.log(`✅ Found ${pageData.totalFields} form fields`);

    // Step 3: AI analysis and mapping
    console.log("🤖 Sending data to AI for analysis...");
    console.log("🤖 AI Service config check:", {
      hasAIService: !!aiService,
      aiServiceType: typeof aiService,
      aiServiceConstructor: aiService?.constructor?.name
    });
    
    let aiResponse;
    try {
      console.log("🤖 Calling aiService.analyzeFormAndGenerateValues...");
      aiResponse = await aiService.analyzeFormAndGenerateValues(
        pageData,
        cvData
      );
      console.log("🤖 AI service returned:", aiResponse);
    } catch (error) {
      console.error("❌ AI analysis failed:", error.message);
      console.error("❌ AI analysis error details:", error);
      console.error("❌ AI analysis stack:", error.stack);
      
      // Try fallback to legacy system
      console.log("🔄 Falling back to legacy auto-fill system...");
      console.log("🔄 Reason for fallback: AI system failed with error:", error.message);
      try {
        const legacyResult = await legacyAutoFillForm();
        console.log("✅ Legacy system result:", legacyResult);
        return {
          success: true,
          message: `Legacy auto-fill completed: ${legacyResult.mappedCount} fields filled`,
          mappedCount: legacyResult.mappedCount,
          isLegacy: true
        };
      } catch (legacyError) {
        console.error("❌ Legacy fallback also failed:", legacyError);
        console.error("❌ Legacy fallback error details:", legacyError);
        return { 
          success: false, 
          message: `AI failed: ${error.message}. Legacy fallback also failed: ${legacyError.message}` 
        };
      }
    }

    if (!aiResponse || Object.keys(aiResponse).length === 0) {
      console.log("AI did not generate any field values, trying legacy fallback...");
      
      try {
        const legacyResult = await legacyAutoFillForm();
        return {
          success: true,
          message: `Legacy auto-fill completed: ${legacyResult.mappedCount} fields filled`,
          mappedCount: legacyResult.mappedCount,
          isLegacy: true
        };
      } catch (legacyError) {
        return { success: false, message: "Both AI and legacy systems failed" };
      }
    }

    console.log(
      `✅ AI generated values for ${Object.keys(aiResponse).length} fields`
    );

    // Step 4: Process AI response
    console.log("⚙️ Processing AI response...");
    const processedResponse = responseProcessor.processResponse(
      aiResponse,
      pageData
    );

    if (!processedResponse.success) {
      console.log("Response processing failed");
      return { success: false, message: "Response processing failed" };
    }

    const mappedFields = responseProcessor.getMappedFields();
    console.log(`✅ Mapped ${mappedFields.length} fields for filling`);

    // Step 5: Fill form fields
    console.log("📝 Filling form fields...");
    const fillResult = await smartFiller.fillForm(mappedFields);

    console.log(
      `✅ AI auto-fill completed: ${fillResult.filled}/${fillResult.totalAttempted} fields filled (${fillResult.successRate}%)`
    );

    return {
      success: true,
      message: `AI auto-fill completed: ${fillResult.filled} fields filled`,
      ...fillResult,
      aiFieldsGenerated: Object.keys(aiResponse).length,
      pageFieldsDetected: pageData.totalFields,
    };
  } catch (error) {
    console.error("❌ AI auto-fill failed:", error);
    throw error;
  }
}

// Legacy auto-fill function (fallback)
async function legacyAutoFillForm() {
  try {
    console.log("🔄 Using legacy auto-fill system...");

    // Load CV data and settings
    const cvData = await storageManager.loadCVData();
    const settings = await storageManager.loadSettings();

    // Check if auto-fill is enabled
    if (!settings.autoFillEnabled) {
      console.log("Auto-fill is disabled");
      return { success: false, message: "Auto-fill is disabled" };
    }

    // Check if we have valid CV data
    if (!window.CVDataStructure.validateCVData(cvData)) {
      console.log("Invalid CV data");
      return { success: false, message: "Invalid CV data" };
    }

    // Detect form fields
    const detectedFields = fieldDetector.detectFormFields();
    console.log("Legacy: Detected fields:", detectedFields.length);

    // Map CV data to detected fields
    const mappedFields = fieldMapper.mapFields(detectedFields, cvData);
    console.log(
      "Legacy: Mapped fields:",
      mappedFields.filter(f => f.mapped).length
    );

    // Apply mapped values to form fields
    fieldMapper.applyMappedValues(mappedFields);

    // Log results
    const mappedCount = mappedFields.filter(f => f.mapped).length;
    const unmappedFields = fieldMapper.getUnmappedFields(mappedFields);

    console.log(`Legacy auto-fill completed: ${mappedCount} fields filled`);

    if (unmappedFields.length > 0) {
      console.log(
        "Legacy unmapped fields:",
        unmappedFields.map(f => f.label)
      );
    }

    return {
      success: true,
      message: `Legacy auto-fill completed: ${mappedCount} fields filled`,
      mappedCount: mappedCount,
      isLegacy: true,
    };
  } catch (error) {
    console.error("Error during legacy auto-fill:", error);
    return { success: false, error: error.message };
  }
}

// Insert cover letter into form fields
async function insertCoverLetter(coverLetter) {
  try {
    // Detect form fields
    const detectedFields = fieldDetector.detectFormFields();

    // Look for cover letter/summary fields
    const coverLetterFields = detectedFields.filter(
      field =>
        field.type === "summary" ||
        field.label.includes("cover") ||
        field.label.includes("summary") ||
        field.label.includes("letter") ||
        field.element.tagName === "TEXTAREA"
    );

    if (coverLetterFields.length === 0) {
      // If no specific cover letter field found, try any large text area
      const textAreas = detectedFields.filter(
        field => field.element.tagName === "TEXTAREA" && field.element.rows > 5
      );
      coverLetterFields.push(...textAreas);
    }

    // Insert cover letter into the first matching field
    if (coverLetterFields.length > 0) {
      const field = coverLetterFields[0].element;
      field.value = coverLetter;
      fieldMapper.triggerInputEvents(field);
      console.log(
        "Cover letter inserted into field:",
        coverLetterFields[0].label
      );
      return { success: true, message: "Cover letter inserted" };
    } else {
      console.log("No suitable field found for cover letter");
      return {
        success: false,
        message: "No suitable field found for cover letter",
      };
    }
  } catch (error) {
    console.error("Error inserting cover letter:", error);
    return { success: false, error: error.message };
  }
}

// Extract company information (for future use)
function extractCompanyInfo() {
  return companyExtractor.extractCompanyInfo();
}

// DEBUG FUNCTIONS - Available in browser console
window.checkAIStatus = function () {
  console.log("🔍 Checking AI Component Status...");

  const status = {
    pageAnalyzer: pageAnalyzer !== null && typeof pageAnalyzer !== "undefined",
    aiService: aiService !== null && typeof aiService !== "undefined",
    responseProcessor:
      responseProcessor !== null && typeof responseProcessor !== "undefined",
    smartFiller: smartFiller !== null && typeof smartFiller !== "undefined",
    storageManager:
      storageManager !== null && typeof storageManager !== "undefined",
    companyExtractor:
      companyExtractor !== null && typeof companyExtractor !== "undefined",
  };

  console.log("📋 Component Status:", status);

  // Check if classes are defined
  const classStatus = {
    PageAnalyzer: typeof PageAnalyzer !== "undefined",
    AIService: typeof AIService !== "undefined",
    ResponseProcessor: typeof ResponseProcessor !== "undefined",
    SmartFiller: typeof SmartFiller !== "undefined",
    StorageManager: typeof StorageManager !== "undefined",
    CompanyExtractor: typeof CompanyExtractor !== "undefined",
  };

  console.log("📋 Class Definitions:", classStatus);

  const allLoaded = Object.values(status).every(loaded => loaded);
  console.log(
    allLoaded
      ? "✅ All AI components loaded successfully"
      : "❌ Some AI components failed to load"
  );

  return { instances: status, classes: classStatus };
};

window.debugPageAnalysis = function () {
  console.log("🔍 Running Page Analysis Debug...");

  if (!pageAnalyzer) {
    console.error("❌ PageAnalyzer not loaded");
    return null;
  }

  try {
    const pageData = pageAnalyzer.extractFormData();
    console.log("📋 Page Analysis Results:");
    console.log("Total fields detected:", pageData.fields.length);
    console.log("Page metadata:", pageData.metadata);
    console.log("Form fields:", pageData.fields);

    // Show field breakdown by type
    const fieldTypes = {};
    pageData.fields.forEach(field => {
      fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
    });
    console.log("Field types breakdown:", fieldTypes);

    return pageData;
  } catch (error) {
    console.error("❌ Error during page analysis:", error);
    return null;
  }
};

window.debugAIAutoFill = function () {
  console.log("🤖 Running AI Auto-Fill Debug...");

  // Check component status first
  const status = window.checkAIStatus();
  if (!Object.values(status.instances).every(loaded => loaded)) {
    console.error("❌ Cannot run AI auto-fill - components not loaded");
    return;
  }

  // Run the AI auto-fill workflow with detailed logging
  console.log("🚀 Starting AI auto-fill workflow...");
  return aiAutoFillForm();
};

window.checkAPIKey = function () {
  console.log("🔑 Checking AI Configuration...");

  chrome.storage.local.get(
    ["openaiApiKey", "useLocalLLM", "localURL", "localModel"],
    function (result) {
      const useLocal = result.useLocalLLM || false;

      if (useLocal) {
        console.log("🏠 Using Local LLM Configuration:");
        console.log(
          "- Local URL:",
          result.localURL || "http://localhost:11434/api/chat"
        );
        console.log("- Local Model:", result.localModel || "llama3.1:8b");
        console.log("💰 Cost: FREE (no API charges)");
      } else {
        console.log("🌐 Using OpenAI Configuration:");
        if (result.openaiApiKey) {
          console.log("✅ OpenAI API key is configured");
          console.log("Key length:", result.openaiApiKey.length);
          console.log(
            "Key preview:",
            result.openaiApiKey.substring(0, 10) + "..."
          );
        } else {
          console.log("❌ OpenAI API key is NOT configured");
          console.log("🔧 Please add your API key in the extension popup");
        }
      }
    }
  );
};

window.testLegacyFallback = function () {
  console.log("🔄 Testing Legacy Fallback...");
  return autoFillForm();
};

window.debugAvailableFunctions = function () {
  console.log("🔍 Checking available functions and objects...");

  const available = {
    functions: [],
    classes: [],
    objects: [],
  };

  // Check for common function names
  const functionNames = [
    "autoFillForm",
    "aiAutoFillForm",
    "fillForm",
    "extractFormData",
  ];
  functionNames.forEach(name => {
    if (typeof window[name] === "function") {
      available.functions.push(name);
    }
  });

  // Check for class definitions
  const classNames = [
    "PageAnalyzer",
    "AIService",
    "ResponseProcessor",
    "SmartFiller",
    "StorageManager",
    "CompanyExtractor",
  ];
  classNames.forEach(name => {
    if (typeof window[name] !== "undefined") {
      available.classes.push(name);
    }
  });

  // Check for objects
  const objectNames = [
    "pageAnalyzer",
    "aiService",
    "responseProcessor",
    "smartFiller",
    "storageManager",
    "companyExtractor",
  ];
  objectNames.forEach(name => {
    if (typeof window[name] !== "undefined" && window[name] !== null) {
      available.objects.push(name);
    }
  });

  console.log("📋 Available functions:", available.functions);
  console.log("📋 Available classes:", available.classes);
  console.log("📋 Available objects:", available.objects);

  return available;
};

// Quick DeepSeek API test
window.testDeepSeekAPI = async () => {
  console.log("🧪 Testing DeepSeek API connection...");
  try {
    const testAI = new AIService();
    await testAI.initialize();
    
    const testMessages = [
      { role: "system", content: "You are a helpful assistant. Respond with just 'OK' - no explanations." },
      { role: "user", content: "Say OK" }
    ];
    
    console.log("Sending test request...");
    const response = await testAI.sendAIRequest(testMessages);
    console.log("✅ DeepSeek API test successful! Response:", response);
    return response;
  } catch (error) {
    console.error("❌ DeepSeek API test failed:", error);
    throw error;
  }
};

console.log("✅ Debug functions loaded! Available commands:");
console.log("- checkAIStatus() - Check if AI components are loaded");
console.log("- debugPageAnalysis() - Test page field detection");
console.log("- debugAIAutoFill() - Test full AI workflow");
console.log("- checkAPIKey() - Check if OpenAI API key is configured");
console.log("- testDeepSeekAPI() - Test DeepSeek API connection");
console.log("- testLegacyFallback() - Test legacy auto-fill system");
console.log(
  "- debugAvailableFunctions() - See what's actually available on the page"
);

// Content Script - Auto-fill job application forms

// Global variables for components
let storageManager, fieldDetector, fieldMapper, companyExtractor;

// Initialize when script loads
(async () => {
  // Initialize components
  storageManager = new StorageManager();
  fieldDetector = new FieldDetector();
  fieldMapper = new FieldMapper();
  companyExtractor = new CompanyExtractor();

  // Check if auto-fill is enabled
  const settings = await storageManager.loadSettings();
  if (settings.autoFillEnabled) {
    // Auto-fill on page load (with a small delay to ensure page is ready)
    setTimeout(() => {
      autoFillForm();
    }, 1000);
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "triggerAutoFill") {
    autoFillForm()
      .then(result =>
        sendResponse({ success: true, message: "Auto-fill completed" })
      )
      .catch(error => sendResponse({ success: false, error: error.message }));
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

// Auto-fill form with CV data
async function autoFillForm() {
  try {
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
    console.log("Detected fields:", detectedFields.length);

    // Map CV data to detected fields
    const mappedFields = fieldMapper.mapFields(detectedFields, cvData);
    console.log("Mapped fields:", mappedFields.filter(f => f.mapped).length);

    // Apply mapped values to form fields
    fieldMapper.applyMappedValues(mappedFields);

    // Log results
    const mappedCount = mappedFields.filter(f => f.mapped).length;
    const unmappedFields = fieldMapper.getUnmappedFields(mappedFields);

    console.log(`Auto-fill completed: ${mappedCount} fields filled`);

    if (unmappedFields.length > 0) {
      console.log(
        "Unmapped fields:",
        unmappedFields.map(f => f.label)
      );
    }

    return {
      success: true,
      message: `Auto-fill completed: ${mappedCount} fields filled`,
      mappedCount: mappedCount,
    };
  } catch (error) {
    console.error("Error during auto-fill:", error);
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

// test-phase1.js - Test Phase 1 Core AI Integration
// This script tests pageAnalyzer, aiService, and responseProcessor

/**
 * Phase 1 Integration Test
 * Tests the complete workflow: Page Analysis → AI Processing → Response Processing
 */
class Phase1Tester {
  constructor() {
    this.pageAnalyzer = new PageAnalyzer();
    this.aiService = new AIService();
    this.responseProcessor = new ResponseProcessor();
    this.testResults = {
      pageAnalysis: null,
      aiResponse: null,
      responseProcessing: null,
      errors: [],
    };
  }

  /**
   * Run complete Phase 1 test
   */
  async runCompleteTest() {
    console.log("🚀 Starting Phase 1 Integration Test...");
    console.log("===============================");

    try {
      // Step 1: Test Page Analysis
      await this.testPageAnalysis();

      // Step 2: Test AI Service (requires API key)
      await this.testAIService();

      // Step 3: Test Response Processing
      await this.testResponseProcessing();

      // Step 4: Show final results
      this.showTestResults();

      return this.testResults;
    } catch (error) {
      console.error("❌ Phase 1 Test Failed:", error);
      this.testResults.errors.push(error.message);
      return this.testResults;
    }
  }

  /**
   * Test Page Analysis functionality
   */
  async testPageAnalysis() {
    console.log("\n📊 Testing Page Analysis...");

    try {
      const pageData = this.pageAnalyzer.extractPageData();
      this.testResults.pageAnalysis = pageData;

      console.log(`✅ Page Analysis Success:`);
      console.log(`   - URL: ${pageData.url}`);
      console.log(`   - Total Fields: ${pageData.totalFields}`);
      console.log(`   - Field Types:`, pageData.fieldTypes);

      if (pageData.totalFields > 0) {
        console.log(`   - Sample Field:`, {
          id: pageData.fields[0].id,
          type: pageData.fields[0].type,
          label: pageData.fields[0].label,
        });
      }

      return pageData;
    } catch (error) {
      console.error("❌ Page Analysis Failed:", error);
      this.testResults.errors.push(`Page Analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test AI Service functionality
   */
  async testAIService() {
    console.log("\n🤖 Testing AI Service...");

    try {
      // Check if API key is available
      const hasApiKey = await this.checkApiKey();
      if (!hasApiKey) {
        console.log("⚠️  No API key found - skipping AI test");
        console.log("   To test AI: Set OpenAI API key in extension popup");
        return null;
      }

      // Initialize AI service
      await this.aiService.initialize();
      console.log("✅ AI Service initialized successfully");

      // Test with mock CV data and current page data
      const mockCVData = this.getMockCVData();
      const pageData = this.testResults.pageAnalysis;

      if (!pageData || pageData.totalFields === 0) {
        console.log("⚠️  No form fields detected - creating mock page data");
        const mockPageData = this.getMockPageData();
        const aiResponse = await this.aiService.analyzeFormAndGenerateValues(
          mockPageData,
          mockCVData
        );
        this.testResults.aiResponse = aiResponse;
      } else {
        const aiResponse = await this.aiService.analyzeFormAndGenerateValues(
          pageData,
          mockCVData
        );
        this.testResults.aiResponse = aiResponse;
      }

      console.log(`✅ AI Service Success:`);
      console.log(
        `   - Generated values for ${
          Object.keys(this.testResults.aiResponse).length
        } fields`
      );
      console.log(
        `   - Sample response:`,
        Object.entries(this.testResults.aiResponse).slice(0, 3)
      );

      return this.testResults.aiResponse;
    } catch (error) {
      console.error("❌ AI Service Failed:", error);
      this.testResults.errors.push(`AI Service: ${error.message}`);

      // Continue with mock AI response for response processor test
      this.testResults.aiResponse = this.getMockAIResponse();
      console.log("📝 Using mock AI response for response processor test");

      return this.testResults.aiResponse;
    }
  }

  /**
   * Test Response Processing functionality
   */
  async testResponseProcessing() {
    console.log("\n⚙️  Testing Response Processing...");

    try {
      const pageData = this.testResults.pageAnalysis || this.getMockPageData();
      const aiResponse =
        this.testResults.aiResponse || this.getMockAIResponse();

      const processedResponse = this.responseProcessor.processResponse(
        aiResponse,
        pageData
      );
      this.testResults.responseProcessing = processedResponse;

      console.log(`✅ Response Processing Success:`);
      console.log(`   - Total fields: ${processedResponse.totalFields}`);
      console.log(`   - Mapped fields: ${processedResponse.mappedFields}`);
      console.log(
        `   - Success rate: ${(
          (processedResponse.mappedFields / processedResponse.totalFields) *
          100
        ).toFixed(1)}%`
      );
      console.log(
        `   - Required fields OK: ${processedResponse.validation.valid}`
      );

      const mappedFields = this.responseProcessor.getMappedFields();
      if (mappedFields.length > 0) {
        console.log(`   - Sample mapping:`, {
          field: mappedFields[0].fieldLabel,
          value: mappedFields[0].processedValue,
          method: mappedFields[0].matchMethod,
        });
      }

      return processedResponse;
    } catch (error) {
      console.error("❌ Response Processing Failed:", error);
      this.testResults.errors.push(`Response Processing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if API key is available
   */
  async checkApiKey() {
    try {
      const settings = await chrome.storage.local.get(["openaiApiKey"]);
      return !!(
        settings.openaiApiKey && settings.openaiApiKey.startsWith("sk-")
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get mock CV data for testing
   */
  getMockCVData() {
    return {
      name: "Igor Vinson",
      email: "igorvinson@gmail.com",
      phone: "(509) 609-9820",
      location: "Gaston, United States",
      linkedin: "https://linkedin.com/in/igorvinson",
      title: "Software Engineer",
      summary:
        "Experienced software engineer with expertise in web development",
      experience: [
        {
          company: "Tech Corp",
          position: "Senior Developer",
          startDate: "2020-01-01",
          endDate: "2023-12-31",
          description: "Led development of web applications",
        },
      ],
      skills: ["JavaScript", "Python", "React", "Node.js"],
      education: [
        {
          institution: "University of Technology",
          degree: "Bachelor of Computer Science",
          graduationYear: "2019",
        },
      ],
    };
  }

  /**
   * Get mock page data for testing when no real form is available
   */
  getMockPageData() {
    return {
      url: window.location.href,
      title: "Test Job Application Form",
      timestamp: new Date().toISOString(),
      totalFields: 6,
      fieldTypes: { text: 4, email: 1, tel: 1 },
      fields: [
        {
          id: "first_name",
          type: "text",
          label: "First Name",
          required: true,
          element: "input",
          options: [],
        },
        {
          id: "last_name",
          type: "text",
          label: "Last Name",
          required: true,
          element: "input",
          options: [],
        },
        {
          id: "email",
          type: "email",
          label: "Email Address",
          required: true,
          element: "input",
          options: [],
        },
        {
          id: "phone",
          type: "tel",
          label: "Phone Number",
          required: false,
          element: "input",
          options: [],
        },
        {
          id: "location",
          type: "text",
          label: "Location",
          required: false,
          element: "input",
          options: [],
        },
        {
          id: "experience_years",
          type: "select",
          label: "Years of Experience",
          required: true,
          element: "select",
          options: [
            { value: "0-1", text: "0-1 years" },
            { value: "2-3", text: "2-3 years" },
            { value: "4-5", text: "4-5 years" },
            { value: "5+", text: "5+ years" },
          ],
        },
      ],
    };
  }

  /**
   * Get mock AI response for testing
   */
  getMockAIResponse() {
    return {
      first_name: "Igor",
      last_name: "Vinson",
      email: "igorvinson@gmail.com",
      phone: "(509) 609-9820",
      location: "Gaston, United States",
      experience_years: "4-5",
    };
  }

  /**
   * Show comprehensive test results
   */
  showTestResults() {
    console.log("\n📋 PHASE 1 TEST RESULTS");
    console.log("========================");

    // Overall status
    const hasErrors = this.testResults.errors.length > 0;
    console.log(`Overall Status: ${hasErrors ? "❌ FAILED" : "✅ PASSED"}`);

    // Component status
    console.log("\nComponent Status:");
    console.log(
      `  📊 Page Analyzer: ${
        this.testResults.pageAnalysis ? "✅ Working" : "❌ Failed"
      }`
    );
    console.log(
      `  🤖 AI Service: ${
        this.testResults.aiResponse ? "✅ Working" : "❌ Failed"
      }`
    );
    console.log(
      `  ⚙️  Response Processor: ${
        this.testResults.responseProcessing ? "✅ Working" : "❌ Failed"
      }`
    );

    // Errors
    if (this.testResults.errors.length > 0) {
      console.log("\nErrors:");
      this.testResults.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    // Next steps
    console.log("\nNext Steps:");
    if (hasErrors) {
      console.log("  1. Fix the errors listed above");
      console.log("  2. Ensure OpenAI API key is set in extension popup");
      console.log("  3. Re-run the test");
    } else {
      console.log("  ✅ Phase 1 is ready!");
      console.log("  🚀 You can now proceed to Phase 3 (Smart Form Filler)");
      console.log("  💡 Or test on a real job application form");
    }
  }

  /**
   * Test on current page forms
   */
  async testOnCurrentPage() {
    console.log("🔍 Testing on current page forms...");

    const pageData = this.pageAnalyzer.extractPageData();

    if (pageData.totalFields === 0) {
      console.log("⚠️  No form fields found on current page");
      console.log("   Navigate to a job application form and try again");
      return false;
    }

    console.log(`Found ${pageData.totalFields} form fields on current page`);
    console.log("Field details:");

    pageData.fields.slice(0, 5).forEach((field, index) => {
      console.log(`  ${index + 1}. ${field.label || field.id} (${field.type})`);
    });

    return pageData;
  }
}

// Global test functions for easy console access
window.testPhase1 = async function () {
  const tester = new Phase1Tester();
  return await tester.runCompleteTest();
};

window.testPageOnly = function () {
  const tester = new Phase1Tester();
  return tester.testPageAnalysis();
};

window.testCurrentPage = function () {
  const tester = new Phase1Tester();
  return tester.testOnCurrentPage();
};

// Instructions
console.log("🧪 Phase 1 Test Suite Loaded!");
console.log("===============================");
console.log("Available test functions:");
console.log("  testPhase1()     - Run complete Phase 1 test");
console.log("  testPageOnly()   - Test page analysis only");
console.log("  testCurrentPage() - Analyze current page forms");
console.log("");
console.log("To start testing, run: testPhase1()");

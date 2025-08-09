// Comprehensive debugging script for local LLM integration
console.log("🔍 Starting comprehensive local LLM debugging...");

// Step 1: Check Ollama service availability
async function testOllamaService() {
  console.log("\n=== STEP 1: Testing Ollama Service ===");

  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Ollama service is running");
      console.log(
        "📦 Available models:",
        data.models.map(m => m.name)
      );
      return true;
    } else {
      console.error("❌ Ollama service returned error:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Cannot reach Ollama service:", error.message);
    return false;
  }
}

// Step 2: Test direct API call
async function testDirectAPICall() {
  console.log("\n=== STEP 2: Testing Direct API Call ===");

  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-r1:latest",
        messages: [
          { role: "user", content: "Reply with exactly: DIRECT_API_SUCCESS" },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Direct API call failed:", response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log("✅ Direct API call successful");
    console.log(
      "📨 Response:",
      data.message?.content?.substring(0, 100) + "..."
    );
    return true;
  } catch (error) {
    console.error("❌ Direct API call error:", error.message);
    return false;
  }
}

// Step 3: Test background script API call
async function testBackgroundAPICall() {
  console.log("\n=== STEP 3: Testing Background Script API Call ===");

  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      {
        action: "makeLocalAPICall",
        url: "http://localhost:11434/api/chat",
        options: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-r1:latest",
            messages: [
              {
                role: "user",
                content: "Reply with exactly: BACKGROUND_API_SUCCESS",
              },
            ],
            stream: false,
          }),
        },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ Background script error:",
            chrome.runtime.lastError.message
          );
          resolve(false);
          return;
        }

        if (response.error) {
          console.error("❌ Background API error:", response.error);
          resolve(false);
          return;
        }

        if (response.success) {
          console.log("✅ Background API call successful");
          console.log(
            "📨 Response:",
            response.data.message?.content?.substring(0, 100) + "..."
          );
          resolve(true);
        } else {
          console.error("❌ Background API unexpected response:", response);
          resolve(false);
        }
      }
    );
  });
}

// Step 4: Test extension settings
async function testExtensionSettings() {
  console.log("\n=== STEP 4: Testing Extension Settings ===");

  return new Promise(resolve => {
    chrome.storage.sync.get(null, function (settings) {
      console.log("📋 Current settings:", settings);

      const isConfigured =
        settings.useLocalLLM === true &&
        settings.localURL &&
        settings.localModel;

      if (isConfigured) {
        console.log("✅ Extension is configured for local LLM");
        console.log(`🎯 Model: ${settings.localModel}`);
        console.log(`🔗 URL: ${settings.localURL}`);
      } else {
        console.log("❌ Extension is not properly configured for local LLM");
      }

      resolve(isConfigured);
    });
  });
}

// Step 5: Test AI Service initialization
async function testAIServiceInit() {
  console.log("\n=== STEP 5: Testing AI Service Initialization ===");

  if (typeof window.AIService !== "undefined") {
    try {
      const aiService = new AIService();
      await aiService.initialize();
      console.log("✅ AI Service initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ AI Service initialization failed:", error.message);
      return false;
    }
  } else {
    console.log(
      "⚠️ AIService class not found. Make sure you are on a page where the extension is loaded."
    );
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running comprehensive tests...");

  const results = {
    ollama: await testOllamaService(),
    directAPI: false,
    backgroundAPI: false,
    settings: false,
    aiService: false,
  };

  if (results.ollama) {
    results.directAPI = await testDirectAPICall();
    results.backgroundAPI = await testBackgroundAPICall();
  }

  results.settings = await testExtensionSettings();

  if (results.settings) {
    results.aiService = await testAIServiceInit();
  }

  console.log("\n=== TEST RESULTS SUMMARY ===");
  console.log("🔧 Ollama Service:", results.ollama ? "✅ PASS" : "❌ FAIL");
  console.log("🌐 Direct API:", results.directAPI ? "✅ PASS" : "❌ FAIL");
  console.log(
    "🔄 Background API:",
    results.backgroundAPI ? "✅ PASS" : "❌ FAIL"
  );
  console.log(
    "⚙️ Extension Settings:",
    results.settings ? "✅ PASS" : "❌ FAIL"
  );
  console.log("🤖 AI Service:", results.aiService ? "✅ PASS" : "❌ FAIL");

  const allPassed = Object.values(results).every(result => result === true);

  if (allPassed) {
    console.log("\n🎉 All tests passed! Local LLM should be working.");
    console.log("📝 Try running: debugAIAutoFill()");
  } else {
    console.log("\n🔧 Some tests failed. Check the issues above.");
  }

  return results;
}

// Start the tests
runAllTests().catch(console.error);

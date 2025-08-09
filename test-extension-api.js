// Test script for browser console - tests extension's local LLM functionality
// Run this in the browser console on a job application page

console.log("🧪 Testing Extension Local LLM API...");

// Test 1: Check if extension functions are available
function testExtensionLoaded() {
  console.log("1. Testing extension loading...");

  if (typeof checkAIStatus === "function") {
    console.log("✅ Extension content script loaded");
    return true;
  } else {
    console.log("❌ Extension content script not loaded");
    return false;
  }
}

// Test 2: Test background script API call directly
function testBackgroundAPI() {
  console.log("2. Testing background script API call...");

  return new Promise((resolve, reject) => {
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
                content: "Reply with just: EXTENSION TEST SUCCESS",
              },
            ],
            stream: false,
          }),
        },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ Background API Error:",
            chrome.runtime.lastError.message
          );
          reject(chrome.runtime.lastError);
          return;
        }

        if (response.error) {
          console.error("❌ Background API Error:", response.error);
          reject(new Error(response.error));
          return;
        }

        if (response.success) {
          console.log(
            "✅ Background API Success:",
            response.data.message.content
          );
          resolve(response.data);
        } else {
          console.error(
            "❌ Background API: Unexpected response format",
            response
          );
          reject(new Error("Unexpected response format"));
        }
      }
    );
  });
}

// Test 3: Test local LLM connection
function testLocalConnection() {
  console.log("3. Testing local LLM connection...");

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "testLocalConnection",
        url: "http://localhost:11434",
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ Connection Test Error:",
            chrome.runtime.lastError.message
          );
          reject(chrome.runtime.lastError);
          return;
        }

        if (response.error) {
          console.error("❌ Connection Test Error:", response.error);
          reject(new Error(response.error));
          return;
        }

        if (response.success) {
          console.log("✅ Local LLM Connection Success");
          console.log(
            "📦 Available models:",
            response.data.models.map(m => m.name)
          );
          resolve(response.data);
        } else {
          console.error(
            "❌ Connection Test: Unexpected response format",
            response
          );
          reject(new Error("Unexpected response format"));
        }
      }
    );
  });
}

// Test 4: Test current AI configuration
function testAIConfiguration() {
  console.log("4. Testing AI configuration...");

  chrome.storage.sync.get(
    ["useLocalLLM", "localURL", "localModel"],
    function (result) {
      console.log("Current AI configuration:", result);

      if (result.useLocalLLM) {
        console.log("✅ Local LLM mode enabled");
        console.log(`📡 URL: ${result.localURL}`);
        console.log(`🤖 Model: ${result.localModel}`);
      } else {
        console.log("❌ Local LLM mode disabled");
      }
    }
  );
}

// Run all tests
async function runAllTests() {
  try {
    console.log("🚀 Starting Extension API Tests...");

    // Test 1: Extension loading
    if (!testExtensionLoaded()) {
      console.log(
        "⚠️ Extension not loaded - make sure you're on a job application page"
      );
      return;
    }

    // Test 4: Check configuration
    testAIConfiguration();

    // Wait a bit for configuration check
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Connection test
    try {
      await testLocalConnection();
    } catch (error) {
      console.error("Connection test failed:", error.message);
    }

    // Test 2: API call
    try {
      await testBackgroundAPI();
    } catch (error) {
      console.error("API call test failed:", error.message);
    }

    console.log("🏁 Extension API Tests completed");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Auto-run tests
runAllTests();

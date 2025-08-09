// Script to configure the extension for local LLM mode
console.log("🔧 Configuring extension for local LLM mode...");

// Configure settings to use local LLM with DeepSeek R1
chrome.storage.sync.set(
  {
    useLocalLLM: true,
    localURL: "http://localhost:11434/api/chat",
    localModel: "deepseek-r1:latest",
    openaiApiKey: "", // Clear any OpenAI key to force local mode
    autoFillEnabled: true,
  },
  function () {
    console.log("✅ Extension configured for local LLM mode");
    console.log("Settings:");
    console.log("  - useLocalLLM: true");
    console.log("  - localURL: http://localhost:11434/api/chat");
    console.log("  - localModel: deepseek-r1:latest");

    // Verify the configuration
    chrome.storage.sync.get(null, function (settings) {
      console.log("📋 Current extension settings:", settings);

      // Test if checkAIStatus function is available
      if (typeof checkAIStatus === "function") {
        console.log("🧪 Running AI status check...");
        checkAIStatus();
      } else {
        console.log(
          "⚠️ checkAIStatus function not found. Make sure you are on a job application page."
        );
      }
    });
  }
);

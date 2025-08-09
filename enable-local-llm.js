// Script to enable local LLM mode with DeepSeek R1
// Run this in the browser console

console.log("🔧 Configuring Extension for Local LLM with DeepSeek R1...");

// Configure local LLM settings
chrome.storage.sync.set(
  {
    useLocalLLM: true,
    localURL: "http://localhost:11434/api/chat",
    localModel: "deepseek-r1:latest",
  },
  function () {
    if (chrome.runtime.lastError) {
      console.error(
        "❌ Configuration failed:",
        chrome.runtime.lastError.message
      );
      return;
    }

    console.log("✅ Local LLM configuration saved successfully!");
    console.log("📁 Settings updated:");
    console.log("   - useLocalLLM: true");
    console.log("   - localURL: http://localhost:11434/api/chat");
    console.log("   - localModel: deepseek-r1:latest");

    // Verify the configuration
    chrome.storage.sync.get(
      ["useLocalLLM", "localURL", "localModel"],
      function (result) {
        console.log("🔍 Verified configuration:", result);

        if (result.useLocalLLM) {
          console.log("✅ Extension is now configured to use DeepSeek R1!");
          console.log("🎯 Ready to test AI auto-fill");
        } else {
          console.log("❌ Configuration verification failed");
        }
      }
    );
  }
);

console.log("⏳ Configuration in progress...");

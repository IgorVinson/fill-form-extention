// Test script to debug local LLM API calls
console.log("Testing local LLM API...");

// Test direct curl equivalent
async function testDirectAPI() {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-r1:latest",
        messages: [{ role: "user", content: "Reply with just: TEST SUCCESS" }],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Direct API Error:", response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log("Direct API Success:", data.message.content);
  } catch (error) {
    console.error("Direct API Failed:", error);
  }
}

// Test via background script
async function testBackgroundAPI() {
  try {
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
              { role: "user", content: "Reply with just: BACKGROUND SUCCESS" },
            ],
            stream: false,
          }),
        },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            "Background API Error:",
            chrome.runtime.lastError.message
          );
          return;
        }

        if (response.error) {
          console.error("Background API Error:", response.error);
          return;
        }

        if (response.success) {
          console.log("Background API Success:", response.data.message.content);
        } else {
          console.error("Background API: Unexpected response format", response);
        }
      }
    );
  } catch (error) {
    console.error("Background API Failed:", error);
  }
}

// Run tests
console.log("1. Testing direct API call...");
testDirectAPI();

setTimeout(() => {
  console.log("2. Testing background script API call...");
  testBackgroundAPI();
}, 2000);

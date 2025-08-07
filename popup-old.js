document.getElementById('cvUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function() {
    chrome.storage.local.set({ cv: reader.result }, () => {
      alert("CV uploaded!");
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById('downloadCV').addEventListener('click', function() {
  chrome.storage.local.get('cv', function(data) {
    if (!data.cv) return alert("No CV uploaded.");
    const link = document.createElement('a');
    link.href = data.cv;
    link.download = "cv.pdf";
    link.click();
  });
});

document.getElementById('generate').addEventListener('click', async () => {
  const prompt = document.getElementById('prompt').value;
  chrome.storage.local.get('apiKey', async ({ apiKey }) => {
    if (!apiKey) return alert("No OpenAI API key set.");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    document.getElementById('output').textContent = json.choices?.[0]?.message?.content || "Error";
  });
});

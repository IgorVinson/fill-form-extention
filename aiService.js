// aiService.js - Handle AI communication for form analysis

class AIService {
  constructor() {
    this.apiKey = null;
    this.baseURL = "https://api.openai.com/v1/chat/completions";
    this.model = "gpt-4o-mini"; // Cost-effective model
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds

    // Local LLM settings
    this.useLocalLLM = false;
    this.localURL = "http://localhost:11434/api/chat"; // Ollama default
    this.localModel = "llama3.1:8b"; // Default local model
  }

  /**
   * Initialize with settings from storage
   */
  async initialize() {
    try {
      const settings = await chrome.storage.local.get([
        "openaiApiKey",
        "useLocalLLM",
        "localURL",
        "localModel",
      ]);

      // Load local LLM settings
      this.useLocalLLM = settings.useLocalLLM || false;
      this.localURL = settings.localURL || "http://localhost:11434/api/chat";
      this.localModel = settings.localModel || "llama3.1:8b";

      if (this.useLocalLLM) {
        // Test local LLM connection
        await this.testLocalConnection();
        console.log(
          `AIService: Initialized with local LLM (${this.localModel})`
        );
      } else {
        // Use OpenAI
        this.apiKey = settings.openaiApiKey;
        if (!this.apiKey) {
          throw new Error(
            "OpenAI API key not found. Please configure it in the extension popup."
          );
        }
        console.log("AIService: Initialized with OpenAI API");
      }

      return true;
    } catch (error) {
      console.error("AIService: Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Main method to analyze form and generate field values
   * @param {Object} pageData - Extracted page data from pageAnalyzer
   * @param {Object} cvData - CV data from storage
   * @returns {Object} AI response with field values
   */
  async analyzeFormAndGenerateValues(pageData, cvData) {
    try {
      // Ensure service is initialized
      if (this.useLocalLLM) {
        await this.testLocalConnection();
      } else if (!this.apiKey) {
        await this.initialize();
      }

      console.log(
        `AIService: Analyzing form with ${
          pageData.fields.length
        } fields using ${this.useLocalLLM ? "local LLM" : "OpenAI"}`
      );

      // Create optimized prompt
      const prompt = this.createFormAnalysisPrompt(pageData, cvData);

      // Send request to OpenAI
      const response = await this.sendAIRequest(prompt);

      // Parse and validate response
      const parsedResponse = this.parseAIResponse(response);

      console.log(
        `AIService: Generated values for ${
          Object.keys(parsedResponse).length
        } fields`
      );
      return parsedResponse;
    } catch (error) {
      console.error("AIService: Form analysis failed:", error);
      throw error;
    }
  }

  /**
   * Create optimized prompt for form analysis
   * @param {Object} pageData - Page data
   * @param {Object} cvData - CV data
   * @returns {Array} Messages array for OpenAI API
   */
  createFormAnalysisPrompt(pageData, cvData) {
    // Prepare simplified page data for AI
    const simplifiedFields = pageData.fields.map(field => ({
      id: field.id,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      context: field.context.parentText,
    }));

    // Prepare simplified CV data
    const simplifiedCV = {
      personal: {
        name: cvData.name || "",
        email: cvData.email || "",
        phone: cvData.phone || "",
        location: cvData.location || "",
        linkedin: cvData.linkedin || "",
      },
      professional: {
        title: cvData.title || "",
        summary: cvData.summary || "",
        experience: cvData.experience || [],
        skills: cvData.skills || [],
        education: cvData.education || [],
      },
    };

    const systemPrompt = `You are an expert assistant that helps fill job application forms based on CV data.

IMPORTANT RULES:
1. Return ONLY a valid JSON object with field IDs as keys and appropriate values
2. For text fields: provide direct string values
3. For dropdowns/selects: match the exact option value from the provided options
4. For checkboxes/radio: return boolean true/false or the exact option value
5. For number fields: return numeric values only
6. If you cannot determine a value, use empty string ""
7. Do not include any explanation or markdown formatting

RESPONSE FORMAT:
{
  "field_id": "value",
  "another_field": "another_value"
}`;

    const userPrompt = `Analyze this job application form and fill it with appropriate values based on my CV.

FORM FIELDS:
${JSON.stringify(simplifiedFields, null, 2)}

MY CV DATA:
${JSON.stringify(simplifiedCV, null, 2)}

Please provide values for each field based on my CV data. Return only the JSON response.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  /**
   * Send request to AI (OpenAI or Local LLM) with retry logic
   * @param {Array} messages - Messages for the AI
   * @returns {Object} AI response
   */
  async sendAIRequest(messages) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `AIService: Sending request (attempt ${attempt}/${
            this.maxRetries
          }) to ${this.useLocalLLM ? "local LLM" : "OpenAI"}`
        );

        const response = this.useLocalLLM
          ? await this.makeLocalAPICall(messages)
          : await this.makeOpenAICall(messages);

        const content = this.useLocalLLM
          ? response.message?.content
          : response.choices?.[0]?.message?.content;

        if (content) {
          return content;
        } else {
          throw new Error("No valid response from AI");
        }
      } catch (error) {
        lastError = error;
        console.warn(`AIService: Attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (
          error.message.includes("API key") ||
          error.message.includes("quota") ||
          error.message.includes("connection")
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(
      `AI request failed after ${this.maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Make actual API call to OpenAI
   * @param {Array} messages - Messages for the API
   * @returns {Object} Raw API response
   */
  async makeOpenAICall(messages) {
    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.1, // Low temperature for consistent responses
      max_tokens: 2000,
      response_format: { type: "json_object" }, // Ensure JSON response
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API Error ${response.status}: ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout - AI service took too long to respond"
        );
      }
      throw error;
    }
  }

  /**
   * Make API call to local LLM (Ollama)
   * @param {Array} messages - Messages for the API
   * @returns {Object} Raw API response
   */
  async makeLocalAPICall(messages) {
    const requestBody = {
      model: this.localModel,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.localURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Local LLM Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout - Local LLM took too long to respond");
      }
      if (error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to local LLM. Make sure Ollama is running on " +
            this.localURL
        );
      }
      throw error;
    }
  }

  /**
   * Test connection to local LLM
   * @returns {boolean} Connection successful
   */
  async testLocalConnection() {
    try {
      const testURL = this.localURL.replace("/api/chat", "/api/tags");
      const response = await fetch(testURL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Local LLM not responding (${response.status})`);
      }

      const data = await response.json();
      const models = data.models || [];
      const modelExists = models.some(m => m.name === this.localModel);

      if (!modelExists) {
        throw new Error(
          `Model '${this.localModel}' not found. Available models: ${models
            .map(m => m.name)
            .join(", ")}`
        );
      }

      console.log(
        `✅ Local LLM connection successful. Model '${this.localModel}' is available.`
      );
      return true;
    } catch (error) {
      throw new Error(`Local LLM connection failed: ${error.message}`);
    }
  }

  /**
   * Parse and validate AI response
   * @param {string} aiResponse - Raw AI response
   * @returns {Object} Parsed field values
   */
  parseAIResponse(aiResponse) {
    try {
      // Clean response (remove any markdown formatting)
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/, "")
          .replace(/\n?```$/, "");
      }
      if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/```\n?/, "")
          .replace(/\n?```$/, "");
      }

      // Parse JSON
      const parsed = JSON.parse(cleanResponse);

      // Validate response
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Response is not a valid object");
      }

      // Filter out any non-string/non-boolean/non-number values
      const validated = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (
          typeof value === "string" ||
          typeof value === "boolean" ||
          typeof value === "number"
        ) {
          validated[key] = value;
        } else if (value === null || value === undefined) {
          validated[key] = "";
        }
      }

      return validated;
    } catch (error) {
      console.error("AIService: Failed to parse AI response:", error);
      console.log("Raw response:", aiResponse);

      // Return empty object as fallback
      return {};
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if valid format
   */
  validateApiKey(apiKey) {
    return (
      typeof apiKey === "string" &&
      apiKey.startsWith("sk-") &&
      apiKey.length > 20
    );
  }

  /**
   * Test API connection
   * @returns {boolean} True if connection successful
   */
  async testConnection() {
    try {
      if (!this.apiKey) {
        await this.initialize();
      }

      const testMessages = [
        {
          role: "user",
          content: 'Test connection. Respond with: {"status": "ok"}',
        },
      ];

      await this.makeAPICall(testMessages);
      return true;
    } catch (error) {
      console.error("AIService: Connection test failed:", error);
      return false;
    }
  }

  /**
   * Update API key
   * @param {string} newApiKey - New API key
   */
  async updateApiKey(newApiKey) {
    if (!this.validateApiKey(newApiKey)) {
      throw new Error("Invalid API key format");
    }

    this.apiKey = newApiKey;
    await chrome.storage.local.set({ openaiApiKey: newApiKey });
    console.log("AIService: API key updated successfully");
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      model: this.model,
      hasApiKey: !!this.apiKey,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    };
  }

  /**
   * Debug method to test form analysis
   * @param {Object} pageData - Page data
   * @param {Object} cvData - CV data
   */
  async debugFormAnalysis(pageData, cvData) {
    console.log("=== AI SERVICE DEBUG ===");
    console.log("Configuration:", this.getConfig());

    try {
      const prompt = this.createFormAnalysisPrompt(pageData, cvData);
      console.log("Generated prompt:", prompt);

      const result = await this.analyzeFormAndGenerateValues(pageData, cvData);
      console.log("AI Response:", result);

      return result;
    } catch (error) {
      console.error("Debug failed:", error);
      throw error;
    }
  }
}

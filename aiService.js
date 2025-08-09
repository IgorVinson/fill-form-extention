// aiService.js - Handle AI communication for form analysis

class AIService {
  constructor() {
    this.apiKey = null;
    this.baseURL = "https://api.openai.com/v1/chat/completions";
    this.model = "gpt-4o-mini"; // Cost-effective model
    this.maxRetries = 3;
    this.timeout = 15000; // 15 seconds - faster fail for debugging

    // AI Provider settings
    this.aiProvider = "openai"; // "openai", "deepseek", or "local"
    
    // DeepSeek settings
    this.deepseekURL = "https://api.deepseek.com/v1/chat/completions";
    this.deepseekModel = "deepseek-chat";

    // Local LLM settings
    this.localURL = "http://localhost:11434/api/chat"; // Ollama default
    this.localModel = "llama3.1:8b"; // Default local model
  }

  /**
   * Initialize with settings from storage
   */
  async initialize() {
    try {
      // Use StorageManager to get settings (matches how they're saved)
      const storageManager = new StorageManager();
      const settings = await storageManager.loadSettings();

      // Load AI provider settings
      this.aiProvider = settings.aiProvider || "openai";
      
      // Load DeepSeek settings
      this.deepseekURL = settings.deepseekURL || "https://api.deepseek.com/v1/chat/completions";
      this.deepseekModel = settings.deepseekModel || "deepseek-chat";
      
      // Load local LLM settings
      this.localURL = settings.localURL || "http://localhost:11434/api/chat";
      this.localModel = settings.localModel || "llama3.1:8b";

      console.log(`AIService: Using ${this.aiProvider.toUpperCase()} mode`);

      if (this.aiProvider === "local") {
        // Test local LLM connection
        await this.testLocalConnection();
        console.log(`AIService: Initialized with local LLM (${this.localModel})`);
      } else if (this.aiProvider === "deepseek") {
        // Use DeepSeek
        this.apiKey = settings.deepseekApiKey;
        if (!this.apiKey) {
          throw new Error(
            "DeepSeek API key not found. Please configure it in the extension popup."
          );
        }
        this.baseURL = this.deepseekURL;
        this.model = this.deepseekModel;
        console.log("AIService: Initialized with DeepSeek API");
      } else {
        // Use OpenAI (default)
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
      if (this.aiProvider === "local") {
        await this.testLocalConnection();
      } else if (!this.apiKey) {
        await this.initialize();
      }

      console.log(
        `AIService: Analyzing form with ${pageData.fields.length} fields using ${this.aiProvider.toUpperCase()}`
      );

      // Load standard answers
      const standardAnswers = await this.loadStandardAnswers();

      // Create optimized prompt
      const prompt = this.createFormAnalysisPrompt(pageData, cvData, standardAnswers);

      // Log the complete prompt structure being sent
      console.log("=".repeat(80));
      console.log("🤖 DEEPSEEK API REQUEST - RAW PROMPT:");
      console.log("=".repeat(80));
      console.log("System Prompt:", prompt[0].content);
      console.log("-".repeat(40));
      console.log("User Prompt:", prompt[1].content);
      console.log("=".repeat(80));

      // Send request to OpenAI
      const response = await this.sendAIRequest(prompt);

      // Log the raw AI response
      console.log("=".repeat(80));
      console.log("🤖 DEEPSEEK API RESPONSE - RAW DATA:");
      console.log("=".repeat(80));
      console.log("Raw Response Length:", response.length, "characters");
      console.log("Raw Response Content:");
      console.log(response);
      console.log("=".repeat(80));

      // Parse and validate response
      const parsedResponse = this.parseAIResponse(response);

      console.log(
        `AIService: Generated values for ${
          Object.keys(parsedResponse).length
        } fields`
      );

      // Log the AI response for debugging
      this.logAIResponse(response, parsedResponse);

      return parsedResponse;
    } catch (error) {
      console.error("AIService: Form analysis failed:", error);
      throw error;
    }
  }

  /**
   * Load standard answers from JSON file
   * @returns {Object} Standard answers data
   */
  async loadStandardAnswers() {
    try {
      const response = await fetch(chrome.runtime.getURL("standard-answers.json"));
      const standardAnswers = await response.json();
      console.log("AIService: Loaded standard answers:", standardAnswers);
      return standardAnswers;
    } catch (error) {
      console.warn("AIService: Could not load standard answers:", error);
      // Return basic fallback data
      return {
        personal: {
          middleName: "",
          gender: "Male",
          address: { street: "8044 sycamore hill ln", city: "Raleigh", state: "NC", zipCode: "27612" }
        },
        workAuthorization: { authorized: true, needsSponsorship: false },
        background: { hasDisability: false, isVeteran: false },
        currentDate: { year: 2025, month: 8, day: 8, formatted: "08/08/2025" }
      };
    }
  }

  /**
   * Create optimized prompt for form analysis
   * @param {Object} pageData - Page data
   * @param {Object} cvData - CV data
   * @param {Object} standardAnswers - Standard answers for common questions
   * @returns {Array} Messages array for OpenAI API
   */
  createFormAnalysisPrompt(pageData, cvData, standardAnswers) {

    const systemPrompt = `Fill job forms with CV data. Be creative and helpful - don't leave fields empty! Rules:
1. Return ONLY valid JSON: {"field_id": "value"}
2. Text fields: string values (be creative with reasonable defaults)
3. Dropdowns: exact option from list (choose most relevant)
4. Checkboxes/radio: true/false (choose logically appropriate values)
5. Numbers: numeric only (use reasonable defaults like years of experience)
6. For unknown fields: Make intelligent guesses based on field names and common job application patterns
7. Use your knowledge to fill gaps (e.g., LinkedIn URL format, GitHub username, cover letter content)
8. Never use empty strings "" - always provide meaningful values
9. No explanations, no markdown
10. IMPORTANT: Respond immediately without thinking or reasoning`;

    // Optimize field data to reduce token usage
    const compactFields = pageData.fields.map(field => {
      const compact = {
        id: field.id,
        type: field.type,
        label: field.label || field.placeholder || "unknown"
      };
      if (field.required) compact.req = true;
      if (field.options && field.options.length > 0) compact.opts = field.options.slice(0, 10); // Limit options
      return compact;
    });

    // Enhanced CV data - provide more context for creative filling
    const compactCV = {
      name: cvData.personal?.name || cvData.name || "",
      email: cvData.personal?.email || cvData.email || "",
      phone: cvData.personal?.phone || cvData.phone || "",
      location: cvData.personal?.location || cvData.location || "",
      title: cvData.professional?.title || cvData.title || "",
      linkedin: cvData.personal?.linkedin || "",
      workAuth: cvData.personal?.workAuthorization || "",
      summary: cvData.professional?.summary || "",
      skills: cvData.professional?.skills?.slice(0, 10) || [], // Top 10 skills
      experience: cvData.professional?.experience?.slice(0, 3)?.map(exp => ({
        company: exp.company,
        position: exp.position,
        years: exp.duration
      })) || [],
      education: cvData.professional?.education?.slice(0, 2)?.map(edu => ({
        school: edu.school,
        degree: edu.degree,
        field: edu.field
      })) || []
    };

    const userPrompt = `Form fields:
${JSON.stringify(compactFields)}

My CV:
${JSON.stringify(compactCV)}

Standard answers for common questions:
${JSON.stringify(standardAnswers)}

Fill form with my CV data and standard answers. Be creative and comprehensive - fill ALL fields with meaningful values. Use the standard answers for demographics, work authorization, disability, veteran status, address, etc. Always use current date (2025) not old dates. Return only JSON.`;

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
          `AIService: Sending request (attempt ${attempt}/${this.maxRetries}) to ${this.aiProvider.toUpperCase()}`
        );

        const response = this.aiProvider === "local"
          ? await this.makeLocalAPICall(messages)
          : await this.makeOpenAICall(messages); // Direct API call to avoid timeout issues

        const content = this.aiProvider === "local"
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
   * Make API call via background script to avoid CORS
   * @param {Array} messages - Messages for the API
   * @returns {Object} Raw API response
   */
  async makeOpenAICallViaBackground(messages) {
    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.1,
      max_tokens: 4000,
    };

    // Configure based on provider
    if (this.aiProvider === "deepseek") {
      if (this.model.includes("r1")) {
        requestBody.reasoning_effort = "low";
      }
    } else {
      requestBody.response_format = { type: "json_object" };
    }

    console.log(`AIService: Making ${this.aiProvider.toUpperCase()} request via background script`);
    console.log(`AIService: URL: ${this.baseURL}`);
    console.log(`AIService: Model: ${this.model}`);
    
    // Log complete request body being sent to DeepSeek
    console.log("=".repeat(80));
    console.log("📤 COMPLETE REQUEST BODY TO DEEPSEEK:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(requestBody, null, 2));
    console.log("=".repeat(80));

    return new Promise((resolve, reject) => {
      console.log("AIService: Sending message to background...");
      
      // Add timeout for background script response
      const timeout = setTimeout(() => {
        reject(new Error("Background script timeout - no response after 30 seconds"));
      }, 30000);

      chrome.runtime.sendMessage(
        {
          action: "makeOpenAICall",
          url: this.baseURL,
          options: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
          apiKey: this.apiKey,
        },
        response => {
          clearTimeout(timeout);
          console.log("AIService: Got response from background:", response);
          
          if (chrome.runtime.lastError) {
            console.error("AIService: Chrome runtime error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response?.error) {
            reject(new Error(response.error));
            return;
          }

          if (response?.success) {
            // Log the complete API response from DeepSeek
            console.log("=".repeat(80));
            console.log("📨 COMPLETE DEEPSEEK API RESPONSE:");
            console.log("=".repeat(80));
            console.log(JSON.stringify(response.data, null, 2));
            console.log("=".repeat(80));
            resolve(response.data);
          } else {
            reject(new Error("Unexpected response format"));
          }
        }
      );
    });
  }

  /**
   * Make actual API call to OpenAI/DeepSeek directly (CORS issues)
   * @param {Array} messages - Messages for the API
   * @returns {Object} Raw API response
   */
  async makeOpenAICall(messages) {
    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.1, // Low temperature for consistent responses
      max_tokens: 4000, // Increased for longer forms
    };

    // Configure based on provider
    if (this.aiProvider === "deepseek") {
      // DeepSeek-specific settings to disable thinking and speed up responses
      if (this.model.includes("r1")) {
        // For R1 models, we can try to disable thinking
        requestBody.reasoning_effort = "low"; // Minimize thinking time
      }
      // Don't use response_format for DeepSeek
    } else {
      // OpenAI settings
      requestBody.response_format = { type: "json_object" };
    }

    console.log(`AIService: Making ${this.aiProvider.toUpperCase()} request to:`, this.baseURL);
    console.log(`AIService: Using model:`, this.model);
    console.log(`AIService: Request body size:`, JSON.stringify(requestBody).length, 'characters');

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    // Make direct API call (reverting to working approach)
    console.log(`AIService: Making direct ${this.aiProvider.toUpperCase()} request to:`, this.baseURL);
    console.log(`AIService: Using model:`, this.model);
    console.log(`AIService: Request body size:`, JSON.stringify(requestBody).length, 'characters');

    try {
      const startTime = Date.now();
      
      // Add timeout to prevent freezing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      console.log(`AIService: Response received in ${responseTime}ms`);
      console.log(`AIService: Response status: ${response.status}`);
      console.log(`AIService: Response headers:`, Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`AIService: API Error ${response.status}:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        throw new Error(
          `API Error ${response.status}: ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      console.log(`AIService: Parsing JSON response...`);
      const jsonData = await response.json();
      console.log(`AIService: ✅ SUCCESS! Got response from DeepSeek:`, jsonData);
      console.log(`AIService: Response parsing completed, returning data...`);
      return jsonData;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout - AI service took too long to respond"
        );
      }
      throw error;
    }
  }

  /**
   * Make API call to local LLM (Ollama) via background script
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

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    // Use background script to make the API call (to avoid CORS)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "makeLocalAPICall",
          url: this.localURL,
          options: options,
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error("Unexpected response format"));
          }
        }
      );
    });
  }

  /**
   * Test connection to local LLM via background script
   * @returns {boolean} Connection successful
   */
  async testLocalConnection() {
    // Use background script to test connection (to avoid CORS)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "testLocalConnection",
          url: this.localURL,
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response.error) {
            reject(new Error(`Local LLM connection failed: ${response.error}`));
            return;
          }

          if (response.success) {
            const models = response.data.models || [];
            const modelExists = models.some(m => m.name === this.localModel);

            if (!modelExists) {
              const availableModels = models.map(m => m.name).join(", ");
              reject(
                new Error(
                  `Model '${this.localModel}' not found. Available models: ${availableModels}`
                )
              );
              return;
            }

            console.log(
              `✅ Local LLM connection successful. Model '${this.localModel}' is available.`
            );
            resolve(true);
          } else {
            reject(new Error("Unexpected response format"));
          }
        }
      );
    });
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

      // Attempt to fix truncated JSON
      if (!cleanResponse.endsWith('}')) {
        console.warn("AIService: Response appears truncated, attempting to fix...");
        // Find the last complete field and close the JSON
        const lastCompleteComma = cleanResponse.lastIndexOf(',');
        const lastCompleteField = cleanResponse.lastIndexOf('"');
        
        if (lastCompleteComma > -1 && lastCompleteField > lastCompleteComma) {
          // We have an incomplete field, remove it
          cleanResponse = cleanResponse.substring(0, lastCompleteComma) + '\n}';
        } else {
          // Just add closing brace
          cleanResponse += '\n}';
        }
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

      console.log(`AIService: Successfully parsed ${Object.keys(validated).length} fields from response`);
      return validated;
    } catch (error) {
      console.error("AIService: Failed to parse AI response:", error);
      console.log("Raw response length:", aiResponse.length);
      console.log("Raw response preview:", aiResponse.substring(0, 500) + "...");

      // Try alternative parsing approach for partial JSON
      try {
        console.log("AIService: Attempting alternative parsing...");
        const partialParsed = this.parsePartialJSON(aiResponse);
        if (Object.keys(partialParsed).length > 0) {
          console.log(`AIService: Recovered ${Object.keys(partialParsed).length} fields from partial response`);
          return partialParsed;
        }
      } catch (altError) {
        console.warn("AIService: Alternative parsing also failed");
      }

      // Return empty object as final fallback
      return {};
    }
  }

  /**
   * Parse partial/truncated JSON by extracting field-value pairs
   * @param {string} response - Raw response that may contain partial JSON
   * @returns {Object} Parsed fields
   */
  parsePartialJSON(response) {
    const fields = {};
    
    // Remove any JSON wrapper and markdown
    let content = response.trim();
    if (content.startsWith("```json")) {
      content = content.replace(/```json\n?/, "").replace(/\n?```$/, "");
    }
    if (content.startsWith("```")) {
      content = content.replace(/```\n?/, "").replace(/\n?```$/, "");
    }
    
    // Extract field-value pairs using regex
    const fieldPattern = /"([^"]+)":\s*("([^"]*)"|true|false|null|(\d+))/g;
    let match;
    
    while ((match = fieldPattern.exec(content)) !== null) {
      const fieldId = match[1];
      const rawValue = match[2];
      
      // Parse the value
      let value;
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else if (rawValue === 'null') value = "";
      else if (match[4]) value = parseInt(match[4]); // number
      else value = match[3] || ""; // string (removing quotes)
      
      fields[fieldId] = value;
    }
    
    return fields;
  }

  /**
   * Log AI response for debugging in popup
   * @param {string} rawResponse - Raw AI response
   * @param {Object} parsedResponse - Parsed response object
   */
  async logAIResponse(rawResponse, parsedResponse) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: this.aiProvider,
        model: this.model,
        rawResponseLength: rawResponse.length,
        parsedFields: Object.keys(parsedResponse).length,
        sampleFields: Object.entries(parsedResponse).slice(0, 5).map(([key, value]) => ({
          field: key,
          value: String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')
        })),
        rawResponse: rawResponse.substring(0, 1000) + (rawResponse.length > 1000 ? '\n\n... (truncated)' : '')
      };

      // Store in chrome storage for popup access
      const logText = `=== AI Response Log (${logEntry.timestamp}) ===
Provider: ${logEntry.provider}
Model: ${logEntry.model}
Raw Response Length: ${logEntry.rawResponseLength}
Parsed Fields: ${logEntry.parsedFields}

Sample Fields:
${logEntry.sampleFields.map(f => `  ${f.field}: "${f.value}"`).join('\n')}

Raw Response (first 1000 chars):
${logEntry.rawResponse}

================================\n\n`;

      // Append to existing log
      const result = await chrome.storage.local.get(['aiResponseLog']);
      const existingLog = result.aiResponseLog || '';
      const newLog = logText + existingLog; // Newest first
      
      // Keep only last 5 entries to avoid storage bloat
      const entries = newLog.split('===').slice(0, 11); // 5 entries * 2 markers + 1
      const trimmedLog = entries.join('===');
      
      await chrome.storage.local.set({ aiResponseLog: trimmedLog });
    } catch (error) {
      console.warn('Failed to log AI response:', error);
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

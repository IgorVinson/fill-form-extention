// responseProcessor.js - Process AI responses and map them back to form fields

class ResponseProcessor {
  constructor() {
    this.processedResponse = null;
    this.fieldMappings = [];
    this.errors = [];
  }

  /**
   * Main method to process AI response and create field mappings
   * @param {Object} aiResponse - AI generated field values
   * @param {Object} pageData - Original page data from pageAnalyzer
   * @returns {Object} Processed response with field mappings
   */
  processResponse(aiResponse, pageData) {
    try {
      console.log(
        `ResponseProcessor: Processing AI response for ${
          Object.keys(aiResponse).length
        } values`
      );

      // Reset state
      this.reset();

      // Create field mappings
      this.fieldMappings = this.createFieldMappings(aiResponse, pageData);

      // Validate mappings
      const validationResult = this.validateMappings();

      // Create processed response
      this.processedResponse = {
        success: true,
        totalFields: pageData.fields.length,
        aiValues: Object.keys(aiResponse).length,
        mappedFields: this.fieldMappings.filter(m => m.mapped).length,
        unmappedFields: this.fieldMappings.filter(m => !m.mapped).length,
        fieldMappings: this.fieldMappings,
        errors: this.errors,
        validation: validationResult,
      };

      console.log(
        `ResponseProcessor: Mapped ${this.processedResponse.mappedFields}/${this.processedResponse.totalFields} fields`
      );
      return this.processedResponse;
    } catch (error) {
      console.error("ResponseProcessor: Failed to process response:", error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Create field mappings between AI response and page fields
   * @param {Object} aiResponse - AI response values
   * @param {Object} pageData - Page data
   * @returns {Array} Array of field mapping objects
   */
  createFieldMappings(aiResponse, pageData) {
    const mappings = [];

    pageData.fields.forEach(field => {
      const mapping = {
        fieldId: field.id,
        fieldType: field.type,
        fieldLabel: field.label,
        element: field.element,
        required: field.required,
        originalValue: field.value,
        aiValue: null,
        processedValue: null,
        mapped: false,
        skipped: false,
        error: null,
        matchMethod: null,
      };

      // Try to find AI value for this field
      const aiValue = this.findAIValueForField(field, aiResponse);

      if (aiValue !== null) {
        mapping.aiValue = aiValue;
        mapping.processedValue = this.processValueForField(aiValue, field);
        mapping.mapped = true;
        mapping.matchMethod = this.getMatchMethod(field, aiResponse);
      } else {
        mapping.skipped = true;
        mapping.error = "No AI value found for field";
      }

      mappings.push(mapping);
    });

    return mappings;
  }

  /**
   * Find AI value for a specific field
   * @param {Object} field - Field data
   * @param {Object} aiResponse - AI response
   * @returns {*} AI value or null if not found
   */
  findAIValueForField(field, aiResponse) {
    // Direct ID match (most reliable)
    if (aiResponse.hasOwnProperty(field.id)) {
      return aiResponse[field.id];
    }

    // Name attribute match
    if (field.name && aiResponse.hasOwnProperty(field.name)) {
      return aiResponse[field.name];
    }

    // HTML ID match
    if (field.htmlId && aiResponse.hasOwnProperty(field.htmlId)) {
      return aiResponse[field.htmlId];
    }

    // Fuzzy matching based on label
    if (field.label) {
      const labelMatch = this.findByLabelMatch(field.label, aiResponse);
      if (labelMatch !== null) {
        return labelMatch;
      }
    }

    return null;
  }

  /**
   * Find value by matching field label with AI response keys
   * @param {string} label - Field label
   * @param {Object} aiResponse - AI response
   * @returns {*} Matched value or null
   */
  findByLabelMatch(label, aiResponse) {
    const normalizedLabel = this.normalizeString(label);

    // Try exact matches first
    for (const [key, value] of Object.entries(aiResponse)) {
      const normalizedKey = this.normalizeString(key);

      // Exact match
      if (normalizedLabel === normalizedKey) {
        return value;
      }

      // Label contains key or key contains label
      if (
        normalizedLabel.includes(normalizedKey) ||
        normalizedKey.includes(normalizedLabel)
      ) {
        return value;
      }
    }

    // Try common field mappings
    const commonMappings = {
      "first name": ["firstname", "fname", "given_name"],
      "last name": ["lastname", "lname", "surname", "family_name"],
      email: ["email_address", "mail"],
      phone: ["telephone", "mobile", "phone_number"],
      address: ["location", "street"],
      experience: ["years_experience", "work_experience"],
      salary: ["expected_salary", "salary_expectation"],
    };

    for (const [pattern, alternatives] of Object.entries(commonMappings)) {
      if (normalizedLabel.includes(pattern)) {
        for (const alt of alternatives) {
          if (aiResponse.hasOwnProperty(alt)) {
            return aiResponse[alt];
          }
        }
      }
    }

    return null;
  }

  /**
   * Process and format value for specific field type
   * @param {*} value - Raw AI value
   * @param {Object} field - Field data
   * @returns {*} Processed value ready for form filling
   */
  processValueForField(value, field) {
    try {
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return "";
      }

      // Convert to string for processing
      let processedValue = String(value);

      switch (field.type) {
        case "text":
        case "email":
        case "tel":
        case "url":
          return processedValue.trim();

        case "number":
          return this.processNumberValue(processedValue);

        case "checkbox":
          return this.processBooleanValue(value);

        case "radio":
          return this.processRadioValue(processedValue, field);

        case "select":
        case "select-one":
        case "combobox":
          return this.processSelectValue(processedValue, field);

        case "textarea":
          return this.processTextareaValue(processedValue);

        case "date":
          return this.processDateValue(processedValue);

        default:
          return processedValue.trim();
      }
    } catch (error) {
      console.warn(
        `ResponseProcessor: Error processing value for field ${field.id}:`,
        error
      );
      return String(value || "");
    }
  }

  /**
   * Process number values
   */
  processNumberValue(value) {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? "" : numValue.toString();
  }

  /**
   * Process boolean values for checkboxes
   */
  processBooleanValue(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const strValue = String(value).toLowerCase();
    return strValue === "true" || strValue === "yes" || strValue === "1";
  }

  /**
   * Process radio button values
   */
  processRadioValue(value, field) {
    if (!field.options || field.options.length === 0) {
      return value;
    }

    // Try exact match first
    const exactMatch = field.options.find(
      opt => opt.value === value || opt.text === value
    );
    if (exactMatch) {
      return exactMatch.value;
    }

    // Try fuzzy match
    const normalizedValue = this.normalizeString(value);
    const fuzzyMatch = field.options.find(
      opt =>
        this.normalizeString(opt.text).includes(normalizedValue) ||
        this.normalizeString(opt.value).includes(normalizedValue)
    );

    return fuzzyMatch ? fuzzyMatch.value : value;
  }

  /**
   * Process select/dropdown values
   */
  processSelectValue(value, field) {
    if (!field.options || field.options.length === 0) {
      return value;
    }

    // Try exact match first
    const exactMatch = field.options.find(
      opt => opt.value === value || opt.text === value
    );
    if (exactMatch) {
      return exactMatch.value;
    }

    // Try fuzzy match
    const normalizedValue = this.normalizeString(value);
    const fuzzyMatch = field.options.find(
      opt =>
        this.normalizeString(opt.text).includes(normalizedValue) ||
        normalizedValue.includes(this.normalizeString(opt.text))
    );

    return fuzzyMatch ? fuzzyMatch.value : field.options[0]?.value || value;
  }

  /**
   * Process textarea values
   */
  processTextareaValue(value) {
    return String(value).trim();
  }

  /**
   * Process date values
   */
  processDateValue(value) {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value; // Return original if not a valid date
      }
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    } catch (error) {
      return value;
    }
  }

  /**
   * Determine how the field was matched
   */
  getMatchMethod(field, aiResponse) {
    if (aiResponse.hasOwnProperty(field.id)) return "direct_id";
    if (field.name && aiResponse.hasOwnProperty(field.name))
      return "name_attribute";
    if (field.htmlId && aiResponse.hasOwnProperty(field.htmlId))
      return "html_id";
    if (field.label) return "label_match";
    return "unknown";
  }

  /**
   * Validate the created mappings
   * @returns {Object} Validation result
   */
  validateMappings() {
    const validation = {
      valid: true,
      requiredFieldsMapped: 0,
      requiredFieldsTotal: 0,
      warnings: [],
      criticalErrors: [],
    };

    this.fieldMappings.forEach(mapping => {
      if (mapping.required) {
        validation.requiredFieldsTotal++;

        if (mapping.mapped) {
          validation.requiredFieldsMapped++;
        } else {
          validation.criticalErrors.push(
            `Required field "${mapping.fieldLabel}" not mapped`
          );
          validation.valid = false;
        }
      }

      // Check for processing errors
      if (mapping.error) {
        validation.warnings.push(`${mapping.fieldLabel}: ${mapping.error}`);
      }
    });

    return validation;
  }

  /**
   * Get successfully mapped fields for form filling
   * @returns {Array} Array of mapped field objects
   */
  getMappedFields() {
    return this.fieldMappings.filter(
      mapping => mapping.mapped && !mapping.error
    );
  }

  /**
   * Get fields that failed to map
   * @returns {Array} Array of unmapped field objects
   */
  getUnmappedFields() {
    return this.fieldMappings.filter(
      mapping => !mapping.mapped || mapping.error
    );
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary object
   */
  getSummary() {
    if (!this.processedResponse) {
      return { error: "No processed response available" };
    }

    return {
      success: this.processedResponse.success,
      totalFields: this.processedResponse.totalFields,
      mappedFields: this.processedResponse.mappedFields,
      unmappedFields: this.processedResponse.unmappedFields,
      successRate:
        (
          (this.processedResponse.mappedFields /
            this.processedResponse.totalFields) *
          100
        ).toFixed(1) + "%",
      requiredFieldsOk: this.processedResponse.validation.valid,
    };
  }

  /**
   * Normalize string for comparison
   */
  normalizeString(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  /**
   * Reset processor state
   */
  reset() {
    this.processedResponse = null;
    this.fieldMappings = [];
    this.errors = [];
  }

  /**
   * Create error response
   */
  createErrorResponse(error) {
    return {
      success: false,
      error: error.message,
      totalFields: 0,
      mappedFields: 0,
      unmappedFields: 0,
      fieldMappings: [],
      errors: [error.message],
    };
  }

  /**
   * Debug method to analyze response processing
   */
  debugProcessing(aiResponse, pageData) {
    console.log("=== RESPONSE PROCESSOR DEBUG ===");
    console.log("AI Response keys:", Object.keys(aiResponse));
    console.log("Page fields:", pageData.fields.length);

    const result = this.processResponse(aiResponse, pageData);

    console.log("Processing result:", this.getSummary());
    console.log(
      "Mapped fields:",
      this.getMappedFields().map(f => ({
        id: f.fieldId,
        label: f.fieldLabel,
        value: f.processedValue,
      }))
    );
    console.log(
      "Unmapped fields:",
      this.getUnmappedFields().map(f => ({
        id: f.fieldId,
        label: f.fieldLabel,
        error: f.error,
      }))
    );

    return result;
  }
}

// smartFiller.js - Apply AI responses to form fields intelligently

class SmartFiller {
  constructor() {
    this.filledFields = [];
    this.failedFields = [];
    this.skippedFields = [];
  }

  /**
   * Main method to fill form fields with processed AI responses
   * @param {Array} mappedFields - Processed field mappings from responseProcessor
   * @returns {Object} Fill results summary
   */
  async fillForm(mappedFields) {
    try {
      console.log(
        `SmartFiller: Starting to fill ${mappedFields.length} fields`
      );

      // Reset state
      this.reset();

      // Process each mapped field
      for (const fieldMapping of mappedFields) {
        await this.fillSingleField(fieldMapping);

        // Small delay between fields to avoid overwhelming the page
        await this.sleep(50);
      }

      // Create and return summary
      const summary = this.createFillSummary();
      console.log(
        `SmartFiller: Completed. Filled ${this.filledFields.length}/${mappedFields.length} fields`
      );

      return summary;
    } catch (error) {
      console.error("SmartFiller: Form filling failed:", error);
      throw error;
    }
  }

  /**
   * Fill a single form field
   * @param {Object} fieldMapping - Field mapping from responseProcessor
   */
  async fillSingleField(fieldMapping) {
    try {
      // Skip if not mapped or no processed value
      if (!fieldMapping.mapped || fieldMapping.processedValue === null) {
        this.skippedFields.push({
          ...fieldMapping,
          reason: "No processed value available",
        });
        return;
      }

      // Find the actual DOM element
      const element = this.findElement(fieldMapping);
      if (!element) {
        this.failedFields.push({
          ...fieldMapping,
          error: "Element not found in DOM",
        });
        return;
      }

      // Check if element is fillable
      if (!this.isElementFillable(element)) {
        this.skippedFields.push({
          ...fieldMapping,
          reason: "Element not fillable (disabled/readonly)",
        });
        return;
      }

      // Fill based on field type
      const success = await this.fillByFieldType(element, fieldMapping);

      if (success) {
        this.filledFields.push({
          ...fieldMapping,
          element: element,
        });
        
        // Visual feedback: briefly highlight filled fields
        try {
          const originalBorder = element.style.border;
          const originalBackground = element.style.backgroundColor;
          element.style.border = "2px solid #4CAF50";
          element.style.backgroundColor = "#E8F5E8";
          
          setTimeout(() => {
            element.style.border = originalBorder;
            element.style.backgroundColor = originalBackground;
          }, 1500);
          
          console.log(`SmartFiller: ✅ Filled field ${fieldMapping.fieldId} with value: "${fieldMapping.processedValue}"`);
        } catch (visualError) {
          // Visual feedback failed, but fill was successful
          console.log(`SmartFiller: ✅ Filled field ${fieldMapping.fieldId} with value: "${fieldMapping.processedValue}" (no visual feedback)`);
        }
      } else {
        this.failedFields.push({
          ...fieldMapping,
          error: "Failed to fill field",
        });
      }
    } catch (error) {
      console.warn(
        `SmartFiller: Error filling field ${fieldMapping.fieldId}:`,
        error
      );
      this.failedFields.push({
        ...fieldMapping,
        error: error.message,
      });
    }
  }

  /**
   * Find DOM element for field mapping
   * @param {Object} fieldMapping - Field mapping object
   * @returns {HTMLElement|null} Found element or null
   */
  findElement(fieldMapping) {
    // Try by ID first
    if (fieldMapping.fieldId) {
      let element = document.getElementById(fieldMapping.fieldId);
      if (element) return element;

      // Try as name attribute
      element = document.querySelector(`[name="${fieldMapping.fieldId}"]`);
      if (element) return element;

      // Try as class
      element = document.querySelector(`.${fieldMapping.fieldId}`);
      if (element) return element;
    }

    // Fallback: find by label text (for dynamic forms)
    if (fieldMapping.fieldLabel) {
      const inputs = document.querySelectorAll("input, select, textarea");
      for (const input of inputs) {
        const label = this.findLabelForElement(input);
        if (
          label &&
          label.toLowerCase().includes(fieldMapping.fieldLabel.toLowerCase())
        ) {
          return input;
        }
      }
    }

    return null;
  }

  /**
   * Find label text for an element
   * @param {HTMLElement} element - Form element
   * @returns {string} Label text or empty string
   */
  findLabelForElement(element) {
    // Check for associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Check parent label
    const parentLabel = element.closest("label");
    if (parentLabel) return parentLabel.textContent.trim();

    // Check aria-label
    if (element.getAttribute("aria-label")) {
      return element.getAttribute("aria-label");
    }

    return "";
  }

  /**
   * Check if element can be filled
   * @param {HTMLElement} element - Form element
   * @returns {boolean} True if fillable
   */
  isElementFillable(element) {
    return (
      !element.disabled && !element.readOnly && element.offsetParent !== null
    ); // Check if visible
  }

  /**
   * Fill element based on its type
   * @param {HTMLElement} element - Form element
   * @param {Object} fieldMapping - Field mapping
   * @returns {boolean} True if successful
   */
  async fillByFieldType(element, fieldMapping) {
    const fieldType =
      fieldMapping.fieldType || element.type || element.tagName.toLowerCase();
    const value = fieldMapping.processedValue;

    try {
      switch (fieldType) {
        case "text":
        case "email":
        case "tel":
        case "url":
        case "password":
          return this.fillTextInput(element, value);

        case "number":
        case "range":
          return this.fillNumberInput(element, value);

        case "textarea":
          return this.fillTextarea(element, value);

        case "select":
        case "select-one":
        case "combobox":
          return this.fillSelect(element, value);

        case "checkbox":
          return this.fillCheckbox(element, value);

        case "radio":
          return this.fillRadio(element, value);

        case "date":
        case "datetime-local":
        case "time":
          return this.fillDateInput(element, value);

        case "file":
          return this.fillFileInput(element, value);

        default:
          // Default to text input behavior
          return this.fillTextInput(element, value);
      }
    } catch (error) {
      console.warn(`SmartFiller: Error filling ${fieldType} field:`, error);
      
      // Try basic fallback - just set the value without events
      try {
        element.value = String(value || "");
        console.log(`SmartFiller: ✅ Filled field ${fieldMapping?.fieldId || 'unknown'} with basic value setting`);
        return true;
      } catch (basicError) {
        console.error(`SmartFiller: Complete failure for field:`, basicError);
        return false;
      }
    }
  }

  /**
   * Fill text input fields
   */
  fillTextInput(element, value) {
    try {
      if (typeof value !== "string") {
        value = String(value || "");
      }

      element.value = value;
      
      // Try to trigger events, but don't fail if it doesn't work
      try {
        this.triggerInputEvents(element);
      } catch (eventError) {
        console.warn("SmartFiller: Event triggering failed, but value was set:", eventError);
      }
      
      return true;
    } catch (error) {
      console.error("SmartFiller: Failed to set text input value:", error);
      return false;
    }
  }

  /**
   * Fill number input fields
   */
  fillNumberInput(element, value) {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        element.value = "";
      } else {
        element.value = numValue.toString();
      }
      
      try {
        this.triggerInputEvents(element);
      } catch (eventError) {
        console.warn("SmartFiller: Event triggering failed for number input, but value was set:", eventError);
      }
      
      return true;
    } catch (error) {
      console.error("SmartFiller: Failed to set number input value:", error);
      return false;
    }
  }

  /**
   * Fill textarea fields
   */
  fillTextarea(element, value) {
    try {
      if (typeof value !== "string") {
        value = String(value || "");
      }

      element.value = value;
      
      try {
        this.triggerInputEvents(element);
      } catch (eventError) {
        console.warn("SmartFiller: Event triggering failed for textarea, but value was set:", eventError);
      }
      
      return true;
    } catch (error) {
      console.error("SmartFiller: Failed to set textarea value:", error);
      return false;
    }
  }

  /**
   * Fill select/dropdown fields
   */
  fillSelect(element, value) {
    // Try exact value match first
    for (const option of element.options) {
      if (option.value === value) {
        element.value = value;
        this.triggerChangeEvent(element);
        return true;
      }
    }

    // Try text content match
    for (const option of element.options) {
      if (
        option.textContent.trim().toLowerCase() === String(value).toLowerCase()
      ) {
        element.value = option.value;
        this.triggerChangeEvent(element);
        return true;
      }
    }

    // Try partial match
    for (const option of element.options) {
      if (
        option.textContent
          .trim()
          .toLowerCase()
          .includes(String(value).toLowerCase())
      ) {
        element.value = option.value;
        this.triggerChangeEvent(element);
        return true;
      }
    }

    console.warn(
      `SmartFiller: Could not match value "${value}" for select field`
    );
    return false;
  }

  /**
   * Fill checkbox fields
   */
  fillCheckbox(element, value) {
    const shouldCheck = this.parseBooleanValue(value);
    element.checked = shouldCheck;
    this.triggerChangeEvent(element);
    return true;
  }

  /**
   * Fill radio button fields
   */
  fillRadio(element, value) {
    // For radio buttons, we need to find the correct radio in the group
    const name = element.name;
    if (!name) {
      // Single radio button
      const shouldCheck = this.parseBooleanValue(value);
      element.checked = shouldCheck;
      this.triggerChangeEvent(element);
      return true;
    }

    // Radio group - find the matching option
    const radioButtons = document.querySelectorAll(
      `input[type="radio"][name="${name}"]`
    );

    for (const radio of radioButtons) {
      if (radio.value === value) {
        radio.checked = true;
        this.triggerChangeEvent(radio);
        return true;
      }
    }

    // Try label matching
    for (const radio of radioButtons) {
      const label = this.findLabelForElement(radio);
      if (label && label.toLowerCase().includes(String(value).toLowerCase())) {
        radio.checked = true;
        this.triggerChangeEvent(radio);
        return true;
      }
    }

    return false;
  }

  /**
   * Fill date input fields
   */
  fillDateInput(element, value) {
    element.value = String(value || "");
    this.triggerInputEvents(element);
    return true;
  }

  /**
   * Handle file input fields (placeholder - would need actual file handling)
   */
  fillFileInput(element, value) {
    // File inputs can't be programmatically filled for security reasons
    console.log(
      "SmartFiller: File input detected but cannot be filled programmatically"
    );
    return false;
  }

  /**
   * Parse boolean value from various formats
   */
  parseBooleanValue(value) {
    if (typeof value === "boolean") {
      return value;
    }

    const strValue = String(value).toLowerCase().trim();
    return (
      strValue === "true" ||
      strValue === "yes" ||
      strValue === "1" ||
      strValue === "on" ||
      strValue === "checked"
    );
  }

  /**
   * Trigger input events to notify the page of changes
   */
  triggerInputEvents(element) {
    try {
      // Set React internal properties if present (for React compatibility)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 
        'value'
      )?.set;
      
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 
        'value'
      )?.set;
      
      // Apply the appropriate setter
      if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(element, element.value);
      } else if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, element.value);
      }

      // Create and dispatch basic events (avoiding constructors that might not exist)
      const eventNames = ["input", "change", "blur", "keyup"];

      eventNames.forEach(eventName => {
        try {
          // Use the most basic Event constructor for compatibility
          const event = new Event(eventName, {
            bubbles: true,
            cancelable: true
          });
          
          element.dispatchEvent(event);
        } catch (eventError) {
          // Fallback to createEvent if Event constructor fails
          try {
            const event = document.createEvent('Event');
            event.initEvent(eventName, true, true);
            element.dispatchEvent(event);
          } catch (createEventError) {
            console.warn(`SmartFiller: Could not trigger ${eventName} event:`, createEventError);
          }
        }
      });

      // Additional React-specific event triggering with delay
      setTimeout(() => {
        try {
          const changeEvent = new Event("change", { bubbles: true, cancelable: true });
          element.dispatchEvent(changeEvent);
        } catch (error) {
          // Silent fallback
        }
      }, 100);

    } catch (error) {
      console.warn("SmartFiller: Event triggering failed:", error);
      // Continue without events - at least the value will be set
    }
  }

  /**
   * Trigger change event specifically
   */
  triggerChangeEvent(element) {
    const event = new Event("change", {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }

  /**
   * Create summary of fill results
   */
  createFillSummary() {
    return {
      success: true,
      totalAttempted:
        this.filledFields.length +
        this.failedFields.length +
        this.skippedFields.length,
      filled: this.filledFields.length,
      failed: this.failedFields.length,
      skipped: this.skippedFields.length,
      successRate: this.calculateSuccessRate(),
      filledFields: this.filledFields.map(f => ({
        id: f.fieldId,
        label: f.fieldLabel,
        type: f.fieldType,
        value: f.processedValue,
      })),
      failedFields: this.failedFields.map(f => ({
        id: f.fieldId,
        label: f.fieldLabel,
        error: f.error,
      })),
      skippedFields: this.skippedFields.map(f => ({
        id: f.fieldId,
        label: f.fieldLabel,
        reason: f.reason,
      })),
    };
  }

  /**
   * Calculate success rate percentage
   */
  calculateSuccessRate() {
    const total = this.filledFields.length + this.failedFields.length;
    if (total === 0) return 0;
    return Math.round((this.filledFields.length / total) * 100);
  }

  /**
   * Get fields that were successfully filled
   */
  getFilledFields() {
    return this.filledFields;
  }

  /**
   * Get fields that failed to fill
   */
  getFailedFields() {
    return this.failedFields;
  }

  /**
   * Get fields that were skipped
   */
  getSkippedFields() {
    return this.skippedFields;
  }

  /**
   * Reset filler state
   */
  reset() {
    this.filledFields = [];
    this.failedFields = [];
    this.skippedFields = [];
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug method to test form filling
   */
  async debugFillForm(mappedFields) {
    console.log("=== SMART FILLER DEBUG ===");
    console.log(`Attempting to fill ${mappedFields.length} fields`);

    const result = await this.fillForm(mappedFields);

    console.log("Fill Results:");
    console.log(`  ✅ Filled: ${result.filled}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    console.log(`  ⏭️  Skipped: ${result.skipped}`);
    console.log(`  📊 Success Rate: ${result.successRate}%`);

    if (result.failedFields.length > 0) {
      console.log("Failed fields:", result.failedFields);
    }

    return result;
  }
}

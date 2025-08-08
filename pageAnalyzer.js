// pageAnalyzer.js - Extract comprehensive form data from any page

class PageAnalyzer {
  constructor() {
    this.formFields = [];
  }

  /**
   * Main method to extract all form data from the current page
   * @returns {Object} Structured page data with all form fields
   */
  extractPageData() {
    const pageData = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      fields: this.extractFormFields(),
      totalFields: 0,
      fieldTypes: {},
    };

    // Calculate statistics
    pageData.totalFields = pageData.fields.length;
    pageData.fieldTypes = this.calculateFieldTypeStats(pageData.fields);

    console.log(
      `PageAnalyzer: Extracted ${pageData.totalFields} fields from page`
    );
    return pageData;
  }

  /**
   * Extract all form fields with comprehensive data
   * @returns {Array} Array of field objects with detailed properties
   */
  extractFormFields() {
    const fields = [];

    // Get all potential form elements
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      "select",
      "textarea",
      '[role="combobox"]',
      '[role="textbox"]',
      '[contenteditable="true"]',
    ];

    const elements = document.querySelectorAll(selectors.join(", "));

    elements.forEach((element, index) => {
      const fieldData = this.extractFieldData(element, index);
      if (fieldData) {
        fields.push(fieldData);
      }
    });

    return fields;
  }

  /**
   * Extract detailed data for a single form field
   * @param {HTMLElement} element - The form element
   * @param {number} index - Element index for unique ID generation
   * @returns {Object|null} Field data object or null if invalid
   */
  extractFieldData(element, index) {
    try {
      const fieldData = {
        // Basic identification
        id: this.generateFieldId(element, index),
        element: element.tagName.toLowerCase(),
        type: this.getFieldType(element),

        // Attributes and properties
        name: element.name || "",
        htmlId: element.id || "",
        className: element.className || "",

        // Labels and text
        label: this.extractLabel(element),
        placeholder: element.placeholder || "",
        value: this.getCurrentValue(element),

        // Validation and requirements
        required: this.isRequired(element),
        disabled: element.disabled || false,
        readonly: element.readOnly || false,

        // Options for select/radio/checkbox
        options: this.extractOptions(element),

        // Context and surrounding text
        context: this.extractContext(element),

        // Position and visibility
        position: this.getElementPosition(element),
        visible: this.isVisible(element),

        // Additional attributes
        attributes: this.extractAttributes(element),
      };

      return fieldData;
    } catch (error) {
      console.warn("PageAnalyzer: Error extracting field data:", error);
      return null;
    }
  }

  /**
   * Generate a unique ID for the field
   */
  generateFieldId(element, index) {
    if (element.id) return element.id;
    if (element.name) return element.name;
    if (element.className)
      return `class_${element.className.split(" ")[0]}_${index}`;
    return `field_${index}`;
  }

  /**
   * Determine the field type
   */
  getFieldType(element) {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input") {
      return element.type || "text";
    }

    if (tagName === "select") {
      return element.multiple ? "select-multiple" : "select";
    }

    if (tagName === "textarea") {
      return "textarea";
    }

    if (element.getAttribute("role") === "combobox") {
      return "combobox";
    }

    if (
      element.getAttribute("role") === "textbox" ||
      element.contentEditable === "true"
    ) {
      return "textbox";
    }

    return tagName;
  }

  /**
   * Extract label text for the field
   */
  extractLabel(element) {
    const labels = [];

    // 1. Associated label element
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) labels.push(this.cleanText(label.textContent));
    }

    // 2. Parent label
    const parentLabel = element.closest("label");
    if (parentLabel) {
      labels.push(this.cleanText(parentLabel.textContent));
    }

    // 3. aria-label
    if (element.getAttribute("aria-label")) {
      labels.push(element.getAttribute("aria-label"));
    }

    // 4. aria-labelledby
    if (element.getAttribute("aria-labelledby")) {
      const labelElement = document.getElementById(
        element.getAttribute("aria-labelledby")
      );
      if (labelElement) labels.push(this.cleanText(labelElement.textContent));
    }

    // 5. Previous text node or element
    const prevText = this.findPreviousText(element);
    if (prevText) labels.push(prevText);

    // Return the first non-empty label or concatenate multiple
    const uniqueLabels = [...new Set(labels.filter(label => label.length > 0))];
    return uniqueLabels.length > 0 ? uniqueLabels.join(" | ") : "";
  }

  /**
   * Find text that appears before the element (potential label)
   */
  findPreviousText(element) {
    const parent = element.parentElement;
    if (!parent) return "";

    // Look for text in previous siblings
    let prev = element.previousSibling;
    while (prev) {
      if (prev.nodeType === Node.TEXT_NODE) {
        const text = this.cleanText(prev.textContent);
        if (text.length > 0) return text;
      } else if (prev.nodeType === Node.ELEMENT_NODE) {
        const text = this.cleanText(prev.textContent);
        if (text.length > 0 && text.length < 100) return text;
      }
      prev = prev.previousSibling;
    }

    // Look in parent's text
    const parentText = this.cleanText(
      parent.textContent.replace(element.textContent || "", "")
    );
    return parentText.length > 0 && parentText.length < 100 ? parentText : "";
  }

  /**
   * Get current value of the field
   */
  getCurrentValue(element) {
    if (element.type === "checkbox" || element.type === "radio") {
      return element.checked;
    }
    return element.value || "";
  }

  /**
   * Check if field is required
   */
  isRequired(element) {
    return (
      element.required ||
      element.getAttribute("aria-required") === "true" ||
      element.className.includes("required") ||
      (element.closest("label") &&
        element.closest("label").textContent.includes("*"))
    );
  }

  /**
   * Extract options for select, radio, or checkbox groups
   */
  extractOptions(element) {
    const options = [];

    if (element.tagName.toLowerCase() === "select") {
      const optionElements = element.querySelectorAll("option");
      optionElements.forEach(option => {
        if (option.value || option.textContent.trim()) {
          options.push({
            value: option.value,
            text: this.cleanText(option.textContent),
            selected: option.selected,
          });
        }
      });
    }

    // For radio buttons and checkboxes, find related elements by name
    if (element.type === "radio" || element.type === "checkbox") {
      if (element.name) {
        const relatedElements = document.querySelectorAll(
          `input[name="${element.name}"]`
        );
        relatedElements.forEach(related => {
          const label = this.extractLabel(related);
          options.push({
            value: related.value,
            text: label || related.value,
            checked: related.checked,
          });
        });
      }
    }

    return options;
  }

  /**
   * Extract surrounding context text
   */
  extractContext(element) {
    const context = {
      parentText: "",
      siblingText: "",
      nearbyText: "",
    };

    // Parent context
    const parent = element.parentElement;
    if (parent) {
      context.parentText = this.cleanText(parent.textContent.substring(0, 200));
    }

    // Sibling context
    const siblings = Array.from(parent?.children || []);
    const siblingTexts = siblings
      .filter(sibling => sibling !== element)
      .map(sibling => this.cleanText(sibling.textContent))
      .filter(text => text.length > 0 && text.length < 100);
    context.siblingText = siblingTexts.join(" | ");

    // Nearby text (within 100px)
    const nearbyElements = this.findNearbyElements(element, 100);
    context.nearbyText = nearbyElements
      .map(el => this.cleanText(el.textContent))
      .filter(text => text.length > 0 && text.length < 50)
      .join(" | ");

    return context;
  }

  /**
   * Find elements near the target element
   */
  findNearbyElements(element, maxDistance) {
    const rect = element.getBoundingClientRect();
    const allElements = document.querySelectorAll(
      "p, span, div, label, h1, h2, h3, h4, h5, h6"
    );
    const nearby = [];

    allElements.forEach(el => {
      if (el === element || el.contains(element) || element.contains(el))
        return;

      const elRect = el.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(rect.left - elRect.left, 2) +
          Math.pow(rect.top - elRect.top, 2)
      );

      if (distance <= maxDistance && el.textContent.trim().length > 0) {
        nearby.push(el);
      }
    });

    return nearby.slice(0, 5); // Limit to 5 nearest elements
  }

  /**
   * Get element position
   */
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      element.offsetHeight > 0 &&
      element.offsetWidth > 0
    );
  }

  /**
   * Extract important attributes
   */
  extractAttributes(element) {
    const importantAttrs = [
      "data-*",
      "aria-*",
      "autocomplete",
      "pattern",
      "min",
      "max",
      "step",
      "maxlength",
      "minlength",
      "accept",
      "multiple",
    ];

    const attributes = {};

    // Get all attributes
    for (let attr of element.attributes) {
      const name = attr.name.toLowerCase();

      // Include data- and aria- attributes
      if (name.startsWith("data-") || name.startsWith("aria-")) {
        attributes[name] = attr.value;
      }

      // Include other important attributes
      if (importantAttrs.includes(name)) {
        attributes[name] = attr.value;
      }
    }

    return attributes;
  }

  /**
   * Calculate field type statistics
   */
  calculateFieldTypeStats(fields) {
    const stats = {};
    fields.forEach(field => {
      stats[field.type] = (stats[field.type] || 0) + 1;
    });
    return stats;
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    if (!text) return "";
    return text
      .replace(/\s+/g, " ")
      .replace(/\n/g, " ")
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Debug method to log extracted data
   */
  debugPageData() {
    const pageData = this.extractPageData();
    console.log("=== PAGE ANALYSIS DEBUG ===");
    console.log("URL:", pageData.url);
    console.log("Title:", pageData.title);
    console.log("Total Fields:", pageData.totalFields);
    console.log("Field Types:", pageData.fieldTypes);

    pageData.fields.forEach((field, index) => {
      console.log(`\nField ${index + 1}:`, {
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        visible: field.visible,
      });
    });

    return pageData;
  }
}

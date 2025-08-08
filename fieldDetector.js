// Field Detector - Detect form fields by patterns
class FieldDetector {
  constructor() {
    // Common field patterns for job applications
    this.fieldPatterns = {
      firstName: [
        "first name",
        "given name",
        "forename",
        "name.*first",
        "first.*name",
      ],
      lastName: [
        "last name",
        "surname",
        "family name",
        "name.*last",
        "last.*name",
      ],
      fullName: ["full name", "name", "display name"],
      email: ["email", "e-mail", "email address"],
      phone: ["phone", "telephone", "mobile", "cell", "phone number"],
      linkedin: ["linkedin", "linkedin profile", "linkedin url"],
      location: ["location", "city", "address", "current location"],
      title: ["title", "current title", "job title", "position"],
      company: ["company", "current company", "employer"],
      experience: ["experience", "work experience", "years of experience"],
      skills: ["skills", "technical skills", "key skills"],
      education: ["education", "degree", "university", "school"],
    };
  }

  // Detect form fields on the current page
  detectFormFields() {
    const inputs = document.querySelectorAll("input, textarea, select");
    const detectedFields = [];

    inputs.forEach(input => {
      const fieldInfo = this.identifyField(input);
      if (fieldInfo) {
        detectedFields.push({
          element: input,
          ...fieldInfo,
        });
      }
    });

    return detectedFields;
  }

  // Identify a specific field based on its attributes
  identifyField(input) {
    // Get all possible labels for the input
    const labelText = this.getFieldLabel(input).toLowerCase();
    
    // Get contextual information
    const contextualInfo = this.getContextualInfo(input);

    // Skip hidden, submit, or button inputs
    if (["hidden", "submit", "button", "reset"].includes(input.type)) {
      return null;
    }

    // Enhanced field detection with context
    const fieldInfo = this.detectFieldWithContext(input, labelText, contextualInfo);
    if (fieldInfo) {
      return fieldInfo;
    }

    // Match against known patterns (existing logic)
    for (const [fieldType, patterns] of Object.entries(this.fieldPatterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, "i");
        if (regex.test(labelText)) {
          return {
            type: fieldType,
            label: labelText,
            confidence: "high",
            element: input,
            options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
          };
        }
      }
    }

    // Try to infer from input attributes
    const inferredType = this.inferFieldType(input, labelText);
    if (inferredType) {
      return {
        type: inferredType,
        label: labelText,
        confidence: "medium",
        element: input,
        options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
      };
    }

    // Return generic field if we can't identify it
    return {
      type: "unknown",
      label: labelText,
      confidence: "low",
      element: input,
      options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
    };
  }

  // Get the label text for an input field
  getFieldLabel(input) {
    return (
      input.placeholder ||
      input.getAttribute("aria-label") ||
      input.labels?.[0]?.textContent ||
      input.name ||
      input.id ||
      ""
    );
  }

  // Infer field type from attributes
  inferFieldType(input, labelText) {
    // Email inference
    if (input.type === "email" || labelText.includes("email")) {
      return "email";
    }

    // Phone inference
    if (
      input.type === "tel" ||
      labelText.includes("phone") ||
      labelText.includes("mobile")
    ) {
      return "phone";
    }

    // Text area is likely a summary or experience field
    if (input.tagName === "TEXTAREA") {
      return "summary";
    }

    // URL inputs
    if (input.type === "url") {
      return "linkedin";
    }

    return null;
  }

  // Get all form fields grouped by form
  getFormStructure() {
    const forms = document.querySelectorAll("form");
    const formStructure = [];

    forms.forEach((form, index) => {
      const formFields = [];
      const inputs = form.querySelectorAll("input, textarea, select");

      inputs.forEach(input => {
        const fieldInfo = this.identifyField(input);
        if (fieldInfo) {
          formFields.push({
            element: input,
            ...fieldInfo,
          });
        }
      });

      formStructure.push({
        form: form,
        fields: formFields,
      });
    });

    // Also check for fields outside forms
    const orphanedFields = this.detectFormFields().filter(field => {
      return !Array.from(forms).some(form => form.contains(field.element));
    });

    if (orphanedFields.length > 0) {
      formStructure.push({
        form: null,
        fields: orphanedFields,
      });
    }

    return formStructure;
  }

  // Get contextual information about a field
  getContextualInfo(input) {
    const context = {
      nearbyText: this.getNearbyText(input),
      parentText: this.getParentText(input),
      siblingFields: this.getSiblingFields(input),
      formTitle: this.getFormTitle(input),
    };
    
    return context;
  }

  // Enhanced field detection using context
  detectFieldWithContext(input, labelText, context) {
    // Experience field detection with dropdown support
    if (this.isExperienceField(labelText, context)) {
      if (input.tagName === "SELECT") {
        const options = this.getSelectOptions(input);
        
        // Check if it's years dropdown
        if (options.some(opt => /\d+/.test(opt.value))) {
          return {
            type: "experienceYears",
            label: labelText,
            confidence: "high",
            element: input,
            options: options,
          };
        }
        
        // Check if it's months dropdown
        if (options.some(opt => /month|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(opt.text))) {
          return {
            type: "experienceMonths", 
            label: labelText,
            confidence: "high",
            element: input,
            options: options,
          };
        }
      }
    }

    // Yes/No questions
    if (this.isYesNoField(labelText, context)) {
      return {
        type: "yesNo",
        label: labelText,
        confidence: "high",
        element: input,
        options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
        questionContext: labelText,
      };
    }

    // Authorization/Legal work questions  
    if (this.isAuthorizationField(labelText, context)) {
      return {
        type: "workAuthorization",
        label: labelText,
        confidence: "high", 
        element: input,
        options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
      };
    }

    // Role/Position interest fields
    if (this.isRoleInterestField(labelText, context)) {
      return {
        type: "roleInterest",
        label: labelText,
        confidence: "high",
        element: input,
        options: input.tagName === "SELECT" ? this.getSelectOptions(input) : null,
      };
    }

    return null;
  }

  // Check if field is about work experience
  isExperienceField(labelText, context) {
    const experienceKeywords = [
      'total experience', 'years of experience', 'work experience',
      'professional experience', 'experience', 'years', 'months'
    ];
    
    return experienceKeywords.some(keyword => 
      labelText.includes(keyword) || 
      context.nearbyText.includes(keyword) ||
      context.parentText.includes(keyword)
    );
  }

  // Check if field is a yes/no question
  isYesNoField(labelText, context) {
    const yesNoIndicators = [
      'have you', 'do you', 'are you', 'did you', 'will you', 'can you'
    ];
    
    const fullContext = `${labelText} ${context.nearbyText} ${context.parentText}`.toLowerCase();
    
    return yesNoIndicators.some(indicator => fullContext.includes(indicator));
  }

  // Check if field is about work authorization
  isAuthorizationField(labelText, context) {
    const authKeywords = [
      'legally authorized', 'work authorization', 'visa status',
      'authorized to work', 'work permit', 'legal status'
    ];
    
    const fullContext = `${labelText} ${context.nearbyText} ${context.parentText}`.toLowerCase();
    
    return authKeywords.some(keyword => fullContext.includes(keyword));
  }

  // Check if field is about role interest
  isRoleInterestField(labelText, context) {
    const roleKeywords = [
      'interested to join', 'role interest', 'position interest',
      'join as', 'apply for', 'interested in'
    ];
    
    const fullContext = `${labelText} ${context.nearbyText} ${context.parentText}`.toLowerCase();
    
    return roleKeywords.some(keyword => fullContext.includes(keyword));
  }

  // Get nearby text around an input field
  getNearbyText(input) {
    let text = '';
    
    // Check parent element text
    if (input.parentElement) {
      text += input.parentElement.textContent || '';
    }
    
    // Check previous sibling text
    let prev = input.previousSibling;
    while (prev && text.length < 100) {
      if (prev.nodeType === Node.TEXT_NODE) {
        text = (prev.textContent || '') + ' ' + text;
      } else if (prev.textContent) {
        text = (prev.textContent || '') + ' ' + text;
      }
      prev = prev.previousSibling;
    }
    
    return text.trim();
  }

  // Get parent container text
  getParentText(input) {
    let parent = input.parentElement;
    let depth = 0;
    
    while (parent && depth < 3) {
      const text = parent.textContent || '';
      if (text.length > 10 && text.length < 200) {
        return text;
      }
      parent = parent.parentElement;
      depth++;
    }
    
    return '';
  }

  // Get sibling form fields
  getSiblingFields(input) {
    if (!input.parentElement) return [];
    
    const siblings = Array.from(input.parentElement.querySelectorAll('input, select, textarea'));
    return siblings.filter(sibling => sibling !== input).slice(0, 3);
  }

  // Get form title or section heading
  getFormTitle(input) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let closestHeading = null;
    let minDistance = Infinity;
    
    const inputRect = input.getBoundingClientRect();
    
    headings.forEach(heading => {
      const headingRect = heading.getBoundingClientRect();
      const distance = Math.abs(inputRect.top - headingRect.bottom);
      
      if (distance < minDistance && headingRect.bottom < inputRect.top) {
        minDistance = distance;
        closestHeading = heading;
      }
    });
    
    return closestHeading ? closestHeading.textContent || '' : '';
  }

  // Get select dropdown options
  getSelectOptions(selectElement) {
    if (selectElement.tagName !== 'SELECT') return null;
    
    const options = Array.from(selectElement.options).map(option => ({
      value: option.value,
      text: option.textContent || option.innerText,
      selected: option.selected,
    }));
    
    return options;
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = FieldDetector;
} else {
  window.FieldDetector = FieldDetector;
}

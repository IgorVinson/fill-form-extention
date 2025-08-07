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

    // Skip hidden, submit, or button inputs
    if (["hidden", "submit", "button", "reset"].includes(input.type)) {
      return null;
    }

    // Match against known patterns
    for (const [fieldType, patterns] of Object.entries(this.fieldPatterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, "i");
        if (regex.test(labelText)) {
          return {
            type: fieldType,
            label: labelText,
            confidence: "high",
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
      };
    }

    // Return generic field if we can't identify it
    return {
      type: "unknown",
      label: labelText,
      confidence: "low",
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
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = FieldDetector;
} else {
  window.FieldDetector = FieldDetector;
}

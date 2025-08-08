// Field Mapper - Map CV data to detected form fields
class FieldMapper {
  constructor() {
    // Mapping rules from CV data fields to form fields
    this.mappingRules = {
      firstName: [
        "personal.name.first",
        "personal.name",
        "personal.name.split.0",
      ],
      lastName: [
        "personal.name.last",
        "personal.name",
        "personal.name.split.1",
      ],
      fullName: ["personal.name"],
      email: ["personal.email"],
      phone: ["personal.phone"],
      linkedin: ["personal.linkedin"],
      location: ["personal.location"],
      title: ["professional.title"],
      summary: ["professional.summary"],
      skills: ["professional.skills"],
      experience: ["professional.experience"],
      education: ["professional.education"],
      experienceYears: ["professional.experience.totalYears"],
      experienceMonths: ["professional.experience.totalMonths"],
      yesNo: ["professional.questions"],
      workAuthorization: ["personal.workAuthorization"],
      roleInterest: ["professional.roleInterest"],
    };
  }

  // Map CV data to detected fields
  mapFields(detectedFields, cvData) {
    return detectedFields.map(field => {
      const mappedValue = this.getMappedValue(field.type, cvData, field);
      return {
        ...field,
        mappedValue: mappedValue,
        mapped: !!mappedValue,
      };
    });
  }

  // Get mapped value for a specific field type
  getMappedValue(fieldType, cvData, field = null) {
    if (!cvData || !fieldType) return null;

    // Special handling for name fields
    if (fieldType === "firstName" || fieldType === "lastName") {
      const nameParts =
        this.getNestedValue(cvData, "personal.name")?.split(" ") || [];
      if (fieldType === "firstName") {
        return nameParts[0] || null;
      } else if (fieldType === "lastName") {
        return nameParts.slice(1).join(" ") || null;
      }
    }

    // Special handling for full name
    if (fieldType === "fullName") {
      return this.getNestedValue(cvData, "personal.name");
    }

    // Handle experience years/months for dropdowns
    if (fieldType === "experienceYears" && field && field.options) {
      const totalExperience = this.calculateTotalExperience(cvData);
      if (totalExperience && totalExperience.years !== null) {
        return this.findBestDropdownOption(field.options, totalExperience.years.toString());
      }
    }

    if (fieldType === "experienceMonths" && field && field.options) {
      const totalExperience = this.calculateTotalExperience(cvData);
      if (totalExperience && totalExperience.months !== null) {
        // Try to find month name or number
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[totalExperience.months] || totalExperience.months.toString();
        return this.findBestDropdownOption(field.options, monthName);
      }
    }

    // Handle Yes/No questions
    if (fieldType === "yesNo" && field && field.options) {
      // Default to "No" for safety, but could be made smarter based on question context
      const defaultAnswer = this.determineYesNoAnswer(field.questionContext || field.label, cvData);
      return this.findBestDropdownOption(field.options, defaultAnswer);
    }

    // Handle work authorization
    if (fieldType === "workAuthorization" && field && field.options) {
      // Check if user has work authorization info in CV
      const authStatus = this.getNestedValue(cvData, "personal.workAuthorization") || "Yes";
      return this.findBestDropdownOption(field.options, authStatus);
    }

    // Handle role interest 
    if (fieldType === "roleInterest" && field && field.options) {
      // Use current title or a default option
      const currentTitle = this.getNestedValue(cvData, "professional.title");
      if (currentTitle) {
        return this.findBestDropdownOption(field.options, currentTitle);
      }
      // Default to first non-empty option
      const firstOption = field.options.find(opt => opt.value && opt.value !== "");
      return firstOption ? firstOption.value : null;
    }

    // Handle array fields (skills)
    if (fieldType === "skills" && Array.isArray(cvData.professional?.skills)) {
      return cvData.professional.skills.join(", ");
    }

    // Handle array fields (experience, education)
    if (
      (fieldType === "experience" || fieldType === "education") &&
      Array.isArray(cvData.professional?.[fieldType])
    ) {
      return this.formatArrayData(cvData.professional[fieldType]);
    }

    // Direct mapping for other fields
    const paths = this.mappingRules[fieldType];
    if (paths) {
      for (const path of paths) {
        const value = this.getNestedValue(cvData, path);
        if (value) return value;
      }
    }

    return null;
  }

  // Get nested value from object using dot notation
  getNestedValue(obj, path) {
    if (!obj || !path) return null;

    // Handle special split paths
    if (path.includes(".split.")) {
      const [basePath, , index] = path.split(".");
      const baseValue = this.getNestedValue(obj, basePath);
      if (baseValue && typeof baseValue === "string") {
        return baseValue.split(" ")[parseInt(index)] || null;
      }
      return null;
    }

    // Regular dot notation path
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Format array data for form fields
  formatArrayData(arrayData) {
    if (!Array.isArray(arrayData) || arrayData.length === 0) return "";

    // If array contains objects, format them appropriately
    if (typeof arrayData[0] === "object") {
      return arrayData
        .map(item => {
          if (item.title && item.description) {
            return `${item.title}: ${item.description}`;
          } else if (item.title) {
            return item.title;
          } else if (item.name) {
            return item.name;
          } else {
            return JSON.stringify(item);
          }
        })
        .join("\n\n");
    }

    // If array contains strings, join them
    return arrayData.join(", ");
  }

  // Apply mapped values to form fields
  applyMappedValues(mappedFields) {
    mappedFields.forEach(field => {
      if (field.mapped && field.mappedValue && field.element) {
        // Don't overwrite fields that already have values (unless they're placeholder values)
        if (
          !field.element.value ||
          field.element.value === field.element.placeholder
        ) {
          field.element.value = field.mappedValue;

          // Trigger events to ensure the value is registered
          this.triggerInputEvents(field.element);
        }
      }
    });
  }

  // Trigger input events to ensure form validation works
  triggerInputEvents(element) {
    // Create and dispatch events
    const events = ["input", "change"];

    events.forEach(eventType => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
    });

    // For React applications, we might need to set the React-specific property
    if (element._valueTracker) {
      element._valueTracker.setValue(element.value);
    }
  }

  // Get unmapped fields for review
  getUnmappedFields(mappedFields) {
    return mappedFields.filter(field => !field.mapped);
  }

  // Get successfully mapped fields
  getMappedFields(mappedFields) {
    return mappedFields.filter(field => field.mapped);
  }

  // Calculate total experience from CV data
  calculateTotalExperience(cvData) {
    if (!cvData.professional?.experience || !Array.isArray(cvData.professional.experience)) {
      return null;
    }

    let totalMonths = 0;
    const currentDate = new Date();

    cvData.professional.experience.forEach(exp => {
      if (exp.startDate) {
        const startDate = new Date(exp.startDate);
        const endDate = exp.endDate ? new Date(exp.endDate) : currentDate;
        
        if (!isNaN(startDate) && !isNaN(endDate)) {
          const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
                        + (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, months);
        }
      }
    });

    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      totalMonths: totalMonths
    };
  }

  // Find the best matching option in a dropdown
  findBestDropdownOption(options, searchValue) {
    if (!options || !searchValue) return null;

    const searchLower = searchValue.toString().toLowerCase();
    
    // First try exact match (case insensitive)
    let exactMatch = options.find(opt => 
      opt.value.toLowerCase() === searchLower || 
      opt.text.toLowerCase() === searchLower
    );
    
    if (exactMatch) return exactMatch.value;

    // Try partial match in text or value
    let partialMatch = options.find(opt => 
      opt.text.toLowerCase().includes(searchLower) ||
      opt.value.toLowerCase().includes(searchLower) ||
      searchLower.includes(opt.text.toLowerCase()) ||
      searchLower.includes(opt.value.toLowerCase())
    );
    
    if (partialMatch) return partialMatch.value;

    // For numeric values, try to find closest match
    if (!isNaN(searchValue)) {
      const numericValue = parseInt(searchValue);
      let closestOption = null;
      let smallestDiff = Infinity;
      
      options.forEach(opt => {
        const optValue = parseInt(opt.value) || parseInt(opt.text);
        if (!isNaN(optValue)) {
          const diff = Math.abs(numericValue - optValue);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestOption = opt;
          }
        }
      });
      
      if (closestOption) return closestOption.value;
    }

    return null;
  }

  // Determine appropriate answer for yes/no questions
  determineYesNoAnswer(questionText, cvData) {
    const question = questionText.toLowerCase();
    
    // Questions that should typically be "Yes" for job applicants
    if (question.includes('legally authorized') || question.includes('authorized to work')) {
      return this.getNestedValue(cvData, "personal.workAuthorization") || "Yes";
    }
    
    // Questions about past company experience - check CV for company mentions
    if (question.includes('worked with') && cvData.professional?.experience) {
      // This would need company name extraction - for now default to "No"
      return "No";
    }
    
    // Default to "No" for safety unless we have specific logic
    return "No";
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = FieldMapper;
} else {
  window.FieldMapper = FieldMapper;
}

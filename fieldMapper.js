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
    };
  }

  // Map CV data to detected fields
  mapFields(detectedFields, cvData) {
    return detectedFields.map(field => {
      const mappedValue = this.getMappedValue(field.type, cvData);
      return {
        ...field,
        mappedValue: mappedValue,
        mapped: !!mappedValue,
      };
    });
  }

  // Get mapped value for a specific field type
  getMappedValue(fieldType, cvData) {
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
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = FieldMapper;
} else {
  window.FieldMapper = FieldMapper;
}

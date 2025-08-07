// Templates - Cover letter templates management
class Templates {
  constructor() {
    this.defaultTemplates = [
      {
        id: "professional",
        name: "Professional",
        description: "Standard professional cover letter template",
        template: `Dear Hiring Manager,

I am writing to express my interest in the {{jobTitle}} position at {{companyName}}. With my background in {{skills}}, I am confident in my ability to contribute effectively to your team.

{{experience}}

{{education}}

I am excited about the opportunity to bring my skills and passion to {{companyName}}. I would welcome the chance to discuss how I can contribute to your organization's success.

Thank you for your time and consideration. I look forward to hearing from you.

Sincerely,
{{candidateName}}`,
      },
      {
        id: "enthusiastic",
        name: "Enthusiastic",
        description: "Enthusiastic and energetic cover letter template",
        template: `Dear {{companyName}} Team,

I'm thrilled to apply for the {{jobTitle}} position at {{companyName}}! Your company's innovative approach and commitment to excellence align perfectly with my career goals and values.

{{experience}}

{{education}}

What excites me most about {{companyName}} is {{companyName}}'s reputation for fostering creativity and growth. I'm eager to contribute my {{skills}} to help drive your team's continued success.

I would love the opportunity to discuss how my background and enthusiasm can benefit {{companyName}}. Thank you for considering my application!

Best regards,
{{candidateName}}`,
      },
      {
        id: "career_change",
        name: "Career Change",
        description:
          "Template for career changers highlighting transferable skills",
        template: `Dear Hiring Manager,

As someone transitioning into a new field, I am excited to apply for the {{jobTitle}} position at {{companyName}}. While my background may be diverse, my {{skills}} and proven ability to learn quickly make me a strong candidate for this role.

{{experience}}

{{education}}

My diverse experience has equipped me with unique perspectives and transferable skills that I believe would benefit {{companyName}}. I am particularly drawn to this opportunity because {{companyName}} values innovation and growth.

I would welcome the chance to discuss how my unique background can add value to your team. Thank you for considering my application.

Warm regards,
{{candidateName}}`,
      },
      {
        id: "entry_level",
        name: "Entry Level",
        description: "Template for entry-level candidates",
        template: `Dear Hiring Manager,

As a recent graduate with a passion for {{skills}}, I am excited to apply for the {{jobTitle}} position at {{companyName}}. I am eager to begin my career with a company known for its excellence and innovation.

{{education}}

{{experience}}

While I may be new to the field, I bring enthusiasm, a strong work ethic, and a commitment to continuous learning. I am particularly impressed by {{companyName}}'s commitment to {{companyName}}'s mission and would be honored to contribute to your team.

Thank you for considering my application. I look forward to the opportunity to grow with {{companyName}}.

Sincerely,
{{candidateName}}`,
      },
    ];
  }

  // Get all templates
  getAllTemplates() {
    return this.defaultTemplates;
  }

  // Get template by ID
  getTemplateById(id) {
    return (
      this.defaultTemplates.find(template => template.id === id) ||
      this.defaultTemplates[0]
    );
  }

  // Get template by name
  getTemplateByName(name) {
    return (
      this.defaultTemplates.find(
        template => template.name.toLowerCase() === name.toLowerCase()
      ) || this.defaultTemplates[0]
    );
  }

  // Add new template
  addTemplate(template) {
    if (!template.id || !template.name || !template.template) {
      throw new Error("Template must include id, name, and template");
    }

    // Check if template already exists
    const existingIndex = this.defaultTemplates.findIndex(
      t => t.id === template.id
    );
    if (existingIndex >= 0) {
      this.defaultTemplates[existingIndex] = template;
    } else {
      this.defaultTemplates.push(template);
    }

    return template;
  }

  // Remove template by ID
  removeTemplate(id) {
    const index = this.defaultTemplates.findIndex(
      template => template.id === id
    );
    if (index >= 0) {
      const removed = this.defaultTemplates.splice(index, 1);
      return removed[0];
    }
    return null;
  }

  // Update template
  updateTemplate(id, updates) {
    const index = this.defaultTemplates.findIndex(
      template => template.id === id
    );
    if (index >= 0) {
      this.defaultTemplates[index] = {
        ...this.defaultTemplates[index],
        ...updates,
      };
      return this.defaultTemplates[index];
    }
    return null;
  }

  // Get template names for UI
  getTemplateNames() {
    return this.defaultTemplates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
    }));
  }

  // Validate template structure
  validateTemplate(template) {
    return (
      template &&
      typeof template.id === "string" &&
      typeof template.name === "string" &&
      typeof template.template === "string" &&
      template.id.length > 0 &&
      template.name.length > 0 &&
      template.template.length > 0
    );
  }

  // Format template with data
  formatTemplate(templateId, data) {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    let formatted = template.template;

    // Replace placeholders with data
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = data[key] || "";
      formatted = formatted.replace(new RegExp(placeholder, "g"), value);
    });

    return formatted;
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = Templates;
} else {
  window.Templates = Templates;
}

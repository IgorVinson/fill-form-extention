// Cover Letter Generator - Generate cover letters using OpenAI
class CoverLetterGenerator {
  constructor() {
    this.apiEndpoint = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.7;
  }

  // Generate cover letter using OpenAI API
  async generateCoverLetter(cvData, companyInfo, apiKey, template = null) {
    try {
      // Validate inputs
      if (!cvData || !companyInfo || !apiKey) {
        throw new Error(
          "Missing required parameters for cover letter generation"
        );
      }

      // Prepare the prompt
      const prompt = this.createPrompt(cvData, companyInfo, template);

      // Prepare the API request
      const requestBody = {
        model: this.defaultModel,
        messages: [
          {
            role: "system",
            content:
              "You are a professional career advisor helping job seekers create compelling cover letters.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: this.defaultTemperature,
        max_tokens: 1000,
      };

      // Make API request
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Check for API errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      // Parse response
      const data = await response.json();
      const coverLetter = data.choices?.[0]?.message?.content?.trim();

      if (!coverLetter) {
        throw new Error(
          "Failed to generate cover letter: Empty response from API"
        );
      }

      return {
        success: true,
        coverLetter: coverLetter,
        usage: data.usage,
      };
    } catch (error) {
      console.error("Error generating cover letter:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create prompt for OpenAI
  createPrompt(cvData, companyInfo, template = null) {
    // Use provided template or default
    const promptTemplate = template || this.getDefaultTemplate();

    // Replace placeholders with actual data
    return promptTemplate
      .replace("{{candidateName}}", cvData.personal.name || "Applicant")
      .replace(
        "{{candidateTitle}}",
        cvData.professional.title || "Professional"
      )
      .replace("{{companyName}}", companyInfo.companyName || "the company")
      .replace("{{jobTitle}}", companyInfo.jobTitle || "the position")
      .replace("{{skills}}", this.formatSkills(cvData.professional.skills))
      .replace(
        "{{experience}}",
        this.formatExperience(cvData.professional.experience)
      )
      .replace(
        "{{education}}",
        this.formatEducation(cvData.professional.education)
      );
  }

  // Get default prompt template
  getDefaultTemplate() {
    return `I am {{candidateName}}, a {{candidateTitle}} with experience in {{skills}}. I am writing to express my interest in {{jobTitle}} at {{companyName}}.

Based on my background and the job requirements, I believe I would be a strong fit for this position. Here's why:

{{experience}}

{{education}}

I am excited about the opportunity to contribute to {{companyName}} and would welcome the chance to discuss how my skills and experience align with your needs.

Thank you for your time and consideration.

Sincerely,
{{candidateName}}`;
  }

  // Format skills for the prompt
  formatSkills(skills) {
    if (!skills || skills.length === 0) return "various professional skills";
    if (skills.length === 1) return skills[0];
    if (skills.length === 2) return `${skills[0]} and ${skills[1]}`;
    return `${skills.slice(0, -1).join(", ")}, and ${
      skills[skills.length - 1]
    }`;
  }

  // Format experience for the prompt
  formatExperience(experience) {
    if (!experience || experience.length === 0)
      return "I have relevant professional experience that would benefit this role.";

    const expItems = experience.slice(0, 3).map(exp => {
      if (typeof exp === "string") {
        return `- ${exp}`;
      } else if (exp.title && exp.description) {
        return `- ${exp.title}: ${exp.description}`;
      } else if (exp.title) {
        return `- ${exp.title}`;
      } else {
        return `- Relevant experience`;
      }
    });

    return expItems.join("\n");
  }

  // Format education for the prompt
  formatEducation(education) {
    if (!education || education.length === 0) return "";

    const eduItems = education.map(edu => {
      if (typeof edu === "string") {
        return `- ${edu}`;
      } else if (edu.degree && edu.institution) {
        return `- ${edu.degree} from ${edu.institution}`;
      } else if (edu.degree) {
        return `- ${edu.degree}`;
      } else if (edu.institution) {
        return `- Studied at ${edu.institution}`;
      } else {
        return `- Relevant education`;
      }
    });

    return `Education:\n${eduItems.join("\n")}`;
  }

  // Validate API key
  async validateApiKey(apiKey) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 1,
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Estimate cost based on token usage
  estimateCost(usage) {
    // GPT-3.5-turbo pricing: ~$0.002 / 1K tokens
    const inputCost = ((usage?.prompt_tokens || 0) * 0.002) / 1000;
    const outputCost = ((usage?.completion_tokens || 0) * 0.002) / 1000;
    return inputCost + outputCost;
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = CoverLetterGenerator;
} else {
  window.CoverLetterGenerator = CoverLetterGenerator;
}

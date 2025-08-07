// Company Extractor - Extract company info from job pages
class CompanyExtractor {
  constructor() {
    // Common selectors for company information
    this.companySelectors = [
      "[data-company]",
      '[class*="company"]',
      '[class*="employer"]',
      '[class*="organization"]',
      '[aria-label*="company" i]',
      '[aria-label*="employer" i]',
      'h1[class*="company" i]',
      'h2[class*="company" i]',
      'h3[class*="company" i]',
      ".company-name",
      ".employer-name",
      ".organization-name",
    ];

    // Common selectors for job title
    this.jobTitleSelectors = [
      "h1",
      "h2",
      "[data-job-title]",
      '[class*="title"]',
      '[class*="position"]',
      '[class*="job-title"]',
      '[aria-label*="title" i]',
      '[aria-label*="position" i]',
      ".job-title",
      ".position-title",
    ];

    // Common selectors for job description
    this.descriptionSelectors = [
      "[data-description]",
      '[class*="description"]',
      '[class*="job-description"]',
      '[class*="posting-description"]',
      ".job-posting-description",
      ".job-description",
      ".posting-description",
      '[aria-label*="description" i]',
    ];
  }

  // Extract company information from the current page
  extractCompanyInfo() {
    const companyInfo = {
      companyName: this.extractCompanyName(),
      jobTitle: this.extractJobTitle(),
      jobDescription: this.extractJobDescription(),
      location: this.extractLocation(),
      url: window.location.href,
    };

    return companyInfo;
  }

  // Extract company name
  extractCompanyName() {
    // Try meta tags first
    let companyName =
      this.extractFromMetaTags("og:site_name") ||
      this.extractFromMetaTags("twitter:site") ||
      this.extractFromMetaTags("application-name");

    if (companyName) {
      return companyName.replace("@", ""); // Remove @ from social media handles
    }

    // Try common selectors
    for (const selector of this.companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to get from page title
    const title = document.title;
    if (title) {
      // Common patterns: "Job Title at Company Name" or "Company Name - Job Title"
      const patterns = [
        /at\s+([^-–|]+?)(?:\s*-|\s*–|\s*\|)/i,
        /([^-–|]+?)\s*-.*job/i,
        /([^-–|]+?)\s*–.*job/i,
      ];

      for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }

    // Fallback to domain name
    return this.extractDomainName();
  }

  // Extract job title
  extractJobTitle() {
    // Try meta tags
    let jobTitle =
      this.extractFromMetaTags("og:title") ||
      this.extractFromMetaTags("twitter:title");

    if (jobTitle) {
      return jobTitle;
    }

    // Try common selectors
    for (const selector of this.jobTitleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const text = element.textContent.trim();
        // Filter out generic terms
        if (!this.isGenericTitle(text)) {
          return text;
        }
      }
    }

    // Try page title
    const title = document.title;
    if (title) {
      // Common patterns: "Job Title at Company Name" or "Company Name - Job Title"
      const patterns = [
        /^([^-–|]+?)\s*(?:at\s+|-|–)\s*.+/i,
        /.*(?:job|position):\s*([^-–|]+)/i,
      ];

      for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }

      return title;
    }

    return "Unknown Position";
  }

  // Extract job description
  extractJobDescription() {
    // Try common selectors
    for (const selector of this.descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim().substring(0, 2000); // Limit length
      }
    }

    // Try meta description
    const metaDescription = this.extractFromMetaTags("description");
    if (metaDescription) {
      return metaDescription.substring(0, 2000);
    }

    return "No description available";
  }

  // Extract location
  extractLocation() {
    // Common selectors for location
    const locationSelectors = [
      "[data-location]",
      '[class*="location"]',
      '[aria-label*="location" i]',
      ".job-location",
      ".location",
    ];

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return "Location not specified";
  }

  // Extract information from meta tags
  extractFromMetaTags(name) {
    const selector = `meta[name="${name}"], meta[property="${name}"]`;
    const element = document.querySelector(selector);
    return element ? element.getAttribute("content") : null;
  }

  // Extract domain name as fallback
  extractDomainName() {
    try {
      const url = new URL(window.location.href);
      const domain = url.hostname.replace("www.", "");
      // Remove common job site prefixes
      return domain.replace(/^(jobs\.|careers\.|careers-)/, "");
    } catch (error) {
      return "Unknown Company";
    }
  }

  // Check if title is generic
  isGenericTitle(title) {
    const genericTerms = [
      "job",
      "position",
      "career",
      "employment",
      "work",
      "apply",
      "opening",
      "opportunity",
      "role",
      "vacancy",
    ];

    const lowerTitle = title.toLowerCase();
    return genericTerms.some(term => lowerTitle.includes(term));
  }

  // Get all extracted information
  getAllInfo() {
    return {
      company: this.extractCompanyInfo(),
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = CompanyExtractor;
} else {
  window.CompanyExtractor = CompanyExtractor;
}

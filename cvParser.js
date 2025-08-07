// CV Parser - Extracts structured data from CV_default.html
class CVParser {
  constructor() {
    this.cvData = {
      personal: {
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        location: ''
      },
      professional: {
        title: '',
        summary: '',
        skills: [],
        experience: [],
        education: [],
        projects: []
      }
    };
  }

  async parseCVFromHTML() {
    try {
      // Fetch the CV HTML file
      const response = await fetch(chrome.runtime.getURL('CV_default.html'));
      const htmlText = await response.text();
      
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // Extract personal information
      this.extractPersonalInfo(doc);
      
      // Extract professional information
      this.extractProfessionalInfo(doc);
      
      return this.cvData;
    } catch (error) {
      console.error('Error parsing CV:', error);
      throw error;
    }
  }

  extractPersonalInfo(doc) {
    // Extract name
    const nameElement = doc.querySelector('.name');
    if (nameElement) {
      this.cvData.personal.name = nameElement.textContent.trim();
    }

    // Extract contact information
    const contactItems = doc.querySelectorAll('.contact-info span');
    contactItems.forEach(item => {
      const text = item.textContent.trim();
      
      // Phone number pattern
      if (text.match(/^\(\d{3}\)\s\d{3}-\d{4}$/)) {
        this.cvData.personal.phone = text;
      }
      // Email pattern
      else if (text.includes('@') && text.includes('.')) {
        this.cvData.personal.email = text;
      }
      // Location (last item without special patterns)
      else if (text.includes(',') && !text.includes('linkedin')) {
        this.cvData.personal.location = text;
      }
    });

    // Extract LinkedIn
    const linkedinLink = doc.querySelector('.contact-info a[href*="linkedin"]');
    if (linkedinLink) {
      this.cvData.personal.linkedin = linkedinLink.href;
    }
  }

  extractProfessionalInfo(doc) {
    // Extract professional title
    const titleElement = doc.querySelector('.professional-title');
    if (titleElement) {
      this.cvData.professional.title = titleElement.textContent.trim();
    }

    // Extract professional summary
    const summaryElement = doc.querySelector('.summary');
    if (summaryElement) {
      this.cvData.professional.summary = summaryElement.textContent.trim();
    }

    // Extract skills
    this.extractSkills(doc);

    // Extract experience
    this.extractExperience(doc);

    // Extract education
    this.extractEducation(doc);

    // Extract projects
    this.extractProjects(doc);
  }

  extractSkills(doc) {
    const skillLines = doc.querySelectorAll('.skill-line');
    const skillsMap = {};

    skillLines.forEach(line => {
      const label = line.querySelector('.skill-label');
      if (label) {
        const category = label.textContent.replace(':', '').trim();
        const skillsText = line.textContent.replace(label.textContent, '').trim();
        const skills = skillsText.split(',').map(s => s.trim()).filter(s => s);
        skillsMap[category] = skills;
      }
    });

    // Flatten all skills into a single array
    this.cvData.professional.skills = Object.values(skillsMap).flat();
    
    // Also keep categorized skills
    this.cvData.professional.skillsCategories = skillsMap;
  }

  extractExperience(doc) {
    const experienceItems = doc.querySelectorAll('.experience-item');
    
    experienceItems.forEach(item => {
      const jobTitle = item.querySelector('.job-title')?.textContent.trim();
      const company = item.querySelector('.company-name')?.textContent.replace('–', '').trim();
      const dateRange = item.querySelector('.job-date')?.textContent.trim();
      const location = item.querySelector('.job-location')?.textContent.trim();
      
      const achievements = [];
      const achievementItems = item.querySelectorAll('.achievement-item');
      achievementItems.forEach(achievement => {
        achievements.push(achievement.textContent.trim());
      });

      if (jobTitle && company) {
        this.cvData.professional.experience.push({
          title: jobTitle,
          company: company,
          dateRange: dateRange,
          location: location,
          achievements: achievements
        });
      }
    });
  }

  extractEducation(doc) {
    const educationItems = doc.querySelectorAll('.education-item');
    
    educationItems.forEach(item => {
      const degree = item.querySelector('.degree')?.textContent.trim();
      const institution = item.textContent.replace(degree, '').replace('–', '').trim();
      const dateRange = item.querySelector('.education-date')?.textContent.trim();
      
      if (degree) {
        this.cvData.professional.education.push({
          degree: degree,
          institution: institution.replace(dateRange, '').trim(),
          dateRange: dateRange
        });
      }
    });
  }

  extractProjects(doc) {
    const projectItems = doc.querySelectorAll('.project-item');
    
    projectItems.forEach(item => {
      const title = item.querySelector('.project-title')?.textContent.trim();
      const tech = item.querySelector('.project-tech')?.textContent.replace('–', '').trim();
      const description = item.querySelector('.project-description')?.textContent.trim();
      
      if (title) {
        this.cvData.professional.projects.push({
          title: title,
          technologies: tech,
          description: description
        });
      }
    });
  }

  // Helper method to format data for different use cases
  getFormattedData(format = 'standard') {
    switch (format) {
      case 'autofill':
        return {
          firstName: this.cvData.personal.name.split(' ')[0] || '',
          lastName: this.cvData.personal.name.split(' ').slice(1).join(' ') || '',
          fullName: this.cvData.personal.name,
          email: this.cvData.personal.email,
          phone: this.cvData.personal.phone,
          linkedin: this.cvData.personal.linkedin,
          location: this.cvData.personal.location,
          title: this.cvData.professional.title,
          summary: this.cvData.professional.summary,
          skills: this.cvData.professional.skills.join(', '),
          experience: this.cvData.professional.experience,
          education: this.cvData.professional.education,
          projects: this.cvData.professional.projects
        };
      default:
        return this.cvData;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CVParser;
} else {
  window.CVParser = CVParser;
}
// CV Data Structure Schema
const CVDataSchema = {
  personal: {
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    phone: { type: 'string', required: false },
    linkedin: { type: 'string', required: false },
    location: { type: 'string', required: false }
  },
  professional: {
    title: { type: 'string', required: false },
    summary: { type: 'string', required: false },
    skills: { type: 'array', required: false },
    skillsCategories: { type: 'object', required: false },
    experience: { type: 'array', required: false },
    education: { type: 'array', required: false },
    projects: { type: 'array', required: false }
  }
};

const SettingsSchema = {
  openaiApiKey: { type: 'string', required: false },
  autoFillEnabled: { type: 'boolean', default: true },
  coverLetterEnabled: { type: 'boolean', default: false }
};

const TemplatesSchema = {
  coverLetterTemplates: { type: 'array', default: [] }
};

// Default empty CV data structure
const getDefaultCVData = () => ({
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
    skillsCategories: {},
    experience: [],
    education: [],
    projects: []
  }
});

// Default settings
const getDefaultSettings = () => ({
  openaiApiKey: '',
  autoFillEnabled: true,
  coverLetterEnabled: false
});

// Default templates
const getDefaultTemplates = () => ({
  coverLetterTemplates: []
});

// Validation functions
const validateCVData = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (!data.personal || !data.professional) return false;
  if (!data.personal.name || !data.personal.email) return false;
  return true;
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CVDataSchema,
    SettingsSchema,
    TemplatesSchema,
    getDefaultCVData,
    getDefaultSettings,
    getDefaultTemplates,
    validateCVData
  };
} else {
  window.CVDataStructure = {
    CVDataSchema,
    SettingsSchema,
    TemplatesSchema,
    getDefaultCVData,
    getDefaultSettings,
    getDefaultTemplates,
    validateCVData
  };
}
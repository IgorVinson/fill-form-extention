// CV Data Structure Schema
const CVDataSchema = {
  personal: {
    name: { type: "string", required: true },
    email: { type: "string", required: true },
    phone: { type: "string", required: false },
    linkedin: { type: "string", required: false },
    location: { type: "string", required: false },
    workAuthorization: { type: "string", required: false },
  },
  professional: {
    title: { type: "string", required: false },
    summary: { type: "string", required: false },
    skills: { type: "array", required: false },
    skillsCategories: { type: "object", required: false },
    experience: { type: "array", required: false },
    education: { type: "array", required: false },
    projects: { type: "array", required: false },
    roleInterest: { type: "string", required: false },
    questions: { type: "object", required: false },
  },
};

const SettingsSchema = {
  openaiApiKey: { type: "string", required: false },
  autoFillEnabled: { type: "boolean", default: true },
  coverLetterEnabled: { type: "boolean", default: false },
  useLocalLLM: { type: "boolean", default: false },
  localURL: { type: "string", default: "http://localhost:11434/api/chat" },
  localModel: { type: "string", default: "deepseek-r1:latest" },
  aiProvider: { type: "string", default: "deepseek" },
  deepseekApiKey: { type: "string", required: false },
  deepseekModel: { type: "string", default: "deepseek-chat" },
  deepseekURL: { type: "string", default: "https://api.deepseek.com/v1/chat/completions" },
};

const TemplatesSchema = {
  coverLetterTemplates: { type: "array", default: [] },
};

// Default empty CV data structure
const getDefaultCVData = () => ({
  personal: {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
    workAuthorization: "Yes",
  },
  professional: {
    title: "",
    summary: "",
    skills: [],
    skillsCategories: {},
    experience: [],
    education: [],
    projects: [],
    roleInterest: "",
    questions: {},
  },
});

// Default settings
const getDefaultSettings = () => ({
  // AI Provider settings
  aiProvider: "deepseek", // "openai", "deepseek", or "local"
  
  // OpenAI settings
  openaiApiKey: "",
  
  // DeepSeek settings
  deepseekApiKey: "",
  deepseekURL: "https://api.deepseek.com/v1/chat/completions",
  deepseekModel: "deepseek-chat",
  
  // Local LLM settings
  localURL: "http://localhost:11434/api/chat",
  localModel: "llama3.1:8b",
  
  // General settings
  autoFillEnabled: true,
  coverLetterEnabled: false,
  
  // Legacy compatibility
  useLocalLLM: false,
});

// Default templates
const getDefaultTemplates = () => ({
  coverLetterTemplates: [],
});

// Validation functions
const validateCVData = data => {
  if (!data || typeof data !== "object") return false;
  if (!data.personal || !data.professional) return false;
  if (!data.personal.name || !data.personal.email) return false;
  return true;
};

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CVDataSchema,
    SettingsSchema,
    TemplatesSchema,
    getDefaultCVData,
    getDefaultSettings,
    getDefaultTemplates,
    validateCVData,
  };
} else {
  window.CVDataStructure = {
    CVDataSchema,
    SettingsSchema,
    TemplatesSchema,
    getDefaultCVData,
    getDefaultSettings,
    getDefaultTemplates,
    validateCVData,
  };
}

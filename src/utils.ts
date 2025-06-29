import { 
  OpenAISettingsFormState, 
  ValidationErrors, 
  OpenAISettings,
  FormField 
} from './types';

/**
 * Utility functions for OpenAI Settings plugin
 */

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate form data and return validation errors
 */
export function validateForm(formData: OpenAISettingsFormState): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate API Key
  if (!formData.apiKey.trim()) {
    errors.apiKey = 'API Key is required';
  } else if (!/^sk-[a-zA-Z0-9]{48}$/.test(formData.apiKey.trim())) {
    errors.apiKey = 'Invalid API Key format. Should start with "sk-" and be 51 characters long';
  }

  // Validate Organization ID (optional)
  if (formData.organizationId.trim() && !/^[a-zA-Z0-9]{20,}$/.test(formData.organizationId.trim())) {
    errors.organizationId = 'Invalid Organization ID format';
  }

  // Validate Model
  if (!formData.model) {
    errors.model = 'Model selection is required';
  }

  // Validate Max Tokens
  if (formData.maxTokens.trim()) {
    const maxTokens = parseInt(formData.maxTokens);
    if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 8192) {
      errors.maxTokens = 'Max tokens must be between 1 and 8192';
    }
  }

  // Validate Temperature
  if (formData.temperature.trim()) {
    const temperature = parseFloat(formData.temperature);
    if (isNaN(temperature) || temperature < 0 || temperature > 2) {
      errors.temperature = 'Temperature must be between 0 and 2';
    }
  }

  return errors;
}

/**
 * Convert form data to settings object
 */
export function formDataToSettings(formData: OpenAISettingsFormState): OpenAISettings {
  const settings: OpenAISettings = {
    apiKey: formData.apiKey.trim(),
    model: formData.model
  };

  if (formData.organizationId.trim()) {
    settings.organizationId = formData.organizationId.trim();
  }

  if (formData.maxTokens.trim()) {
    const maxTokens = parseInt(formData.maxTokens);
    if (!isNaN(maxTokens)) {
      settings.maxTokens = maxTokens;
    }
  }

  if (formData.temperature.trim()) {
    const temperature = parseFloat(formData.temperature);
    if (!isNaN(temperature)) {
      settings.temperature = temperature;
    }
  }

  return settings;
}

/**
 * Convert settings object to form data
 */
export function settingsToFormData(settings: OpenAISettings): OpenAISettingsFormState {
  return {
    apiKey: settings.apiKey || '',
    organizationId: settings.organizationId || '',
    model: settings.model || 'gpt-4o',
    maxTokens: settings.maxTokens?.toString() || '',
    temperature: settings.temperature?.toString() || ''
  };
}

/**
 * Get form field definitions
 */
export function getFormFields(): FormField[] {
  return [
    {
      name: 'apiKey',
      label: 'OpenAI API Key',
      type: 'password',
      placeholder: 'sk-...',
      required: true,
      helpText: 'Your OpenAI API key. You can find this in your OpenAI dashboard.'
    },
    {
      name: 'organizationId',
      label: 'Organization ID (Optional)',
      type: 'text',
      placeholder: 'org-...',
      required: false,
      helpText: 'Your OpenAI organization ID if you have one.'
    },
    {
      name: 'model',
      label: 'Default Model',
      type: 'select',
      required: true,
      options: [
        { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
      ],
      helpText: 'The default model to use for AI interactions.'
    },
    {
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      placeholder: '4096',
      min: 1,
      max: 8192,
      step: 1,
      helpText: 'Maximum number of tokens to generate (1-8192).'
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'number',
      placeholder: '0.7',
      min: 0,
      max: 2,
      step: 0.1,
      helpText: 'Controls randomness in responses (0-2). Lower values are more deterministic.'
    }
  ];
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error?.message) {
    return error.error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Generate a unique ID for alerts
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Check if form has any validation errors
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get CSS class for form field based on validation state
 */
export function getFieldClass(fieldName: keyof OpenAISettingsFormState, errors: ValidationErrors): string {
  const baseClass = 'form-field';
  const errorClass = errors[fieldName] ? 'form-field-error' : '';
  return `${baseClass} ${errorClass}`.trim();
}

/**
 * Sanitize API key for display (show only first and last few characters)
 */
export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return apiKey;
  }
  return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Check if the current environment supports localStorage
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get theme-aware CSS variables
 */
export function getThemeVariables(theme: string): Record<string, string> {
  if (theme === 'dark') {
    return {
      '--bg-color': '#0f172a',
      '--paper-bg': '#1e293b',
      '--text-color': '#f1f5f9',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--input-bg': '#334155',
      '--button-primary-bg': '#3b82f6',
      '--button-primary-text': '#ffffff',
      '--button-secondary-bg': '#475569',
      '--button-secondary-text': '#f1f5f9',
      '--success-color': '#10b981',
      '--error-color': '#ef4444',
      '--warning-color': '#f59e0b',
      '--info-color': '#3b82f6'
    };
  }

  return {
    '--bg-color': '#ffffff',
    '--paper-bg': '#ffffff',
    '--text-color': '#333333',
    '--text-secondary': '#666666',
    '--text-muted': '#999999',
    '--border-color': 'rgba(0, 0, 0, 0.1)',
    '--input-bg': '#ffffff',
    '--button-primary-bg': '#2196f3',
    '--button-primary-text': '#ffffff',
    '--button-secondary-bg': '#e0e0e0',
    '--button-secondary-text': '#333333',
    '--success-color': '#4caf50',
    '--error-color': '#f44336',
    '--warning-color': '#ff9800',
    '--info-color': '#2196f3'
  };
} 
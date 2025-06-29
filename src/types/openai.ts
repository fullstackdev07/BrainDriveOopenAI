/**
 * OpenAI API configuration types
 */

// OpenAI model options
export type OpenAIModel = 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-4-turbo' | 'gpt-4o-mini';

// OpenAI settings configuration
export interface OpenAISettings {
  apiKey: string;
  organizationId?: string;
  model: OpenAIModel;
  maxTokens?: number;
  temperature?: number;
}

// OpenAI API response types
export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface OpenAIModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
    permission: Array<any>;
    root: string;
    parent: string | null;
  }>;
}

// Form state types
export interface OpenAISettingsFormState {
  apiKey: string;
  organizationId: string;
  model: OpenAIModel;
  maxTokens: string;
  temperature: string;
}

// Validation types
export interface ValidationErrors {
  apiKey?: string;
  organizationId?: string;
  model?: string;
  maxTokens?: string;
  temperature?: string;
}

// Test connection response
export interface TestConnectionResult {
  success: boolean;
  message: string;
  error?: string;
  models?: string[];
}

// Service interfaces (following the same pattern as LITECOINWIDGET)
export interface ApiService {
  get: (url: string, options?: any) => Promise<any>;
  post: (url: string, data: any, options?: any) => Promise<any>;
  put: (url: string, data: any, options?: any) => Promise<any>;
  delete: (url: string, options?: any) => Promise<any>;
}

export interface EventService {
  sendMessage: (target: string, message: any, options?: any) => void;
  subscribeToMessages: (target: string, callback: (message: any) => void) => void;
  unsubscribeFromMessages: (target: string, callback: (message: any) => void) => void;
}

export interface ThemeService {
  getCurrentTheme: () => string;
  addThemeChangeListener: (callback: (theme: string) => void) => void;
  removeThemeChangeListener: (callback: (theme: string) => void) => void;
}

export interface SettingsService {
  get: (key: string) => any;
  set: (key: string, value: any) => Promise<void>;
  getSetting?: (id: string) => Promise<any>;
  setSetting?: (id: string, value: any) => Promise<any>;
  getSettingDefinitions?: () => Promise<any>;
}

export interface Services {
  api?: ApiService;
  event?: EventService;
  theme?: ThemeService;
  settings?: SettingsService;
}

// Component props
export interface OpenAISettingsProps {
  moduleId?: string;
  services: Services;
}

// Component state
export interface OpenAISettingsState {
  formData: OpenAISettingsFormState;
  validationErrors: ValidationErrors;
  isLoading: boolean;
  isSaving: boolean;
  isTestingConnection: boolean;
  currentTheme: string;
  testResult: TestConnectionResult | null;
  saveResult: { success: boolean; message: string } | null;
  isInitializing: boolean;
}

// Alert types
export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  title?: string;
}

// Form field types
export interface FormField {
  name: keyof OpenAISettingsFormState;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
} 
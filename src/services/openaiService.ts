import { 
  OpenAISettings, 
  OpenAIModelResponse, 
  OpenAIError, 
  TestConnectionResult,
  Services 
} from '../types';

/**
 * Service for handling OpenAI API operations
 */
export class OpenAIService {
  private services: Services;
  private readonly OPENAI_API_BASE = 'https://api.openai.com/v1';
  private readonly MODELS_ENDPOINT = '/models';
  private readonly SETTINGS_KEY_PREFIX = 'openai_settings_';

  constructor(services: Services) {
    this.services = services;
  }

  /**
   * Test the OpenAI API connection
   */
  async testConnection(apiKey: string, organizationId?: string): Promise<TestConnectionResult> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (organizationId) {
        headers['OpenAI-Organization'] = organizationId;
      }

      const response = await fetch(`${this.OPENAI_API_BASE}${this.MODELS_ENDPOINT}`, {
        method: 'GET',
        headers,
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        const errorData: OpenAIError = await response.json();
        return {
          success: false,
          message: 'Connection failed',
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data: OpenAIModelResponse = await response.json();
      const availableModels = data.data.map(model => model.id);

      return {
        success: true,
        message: 'Connection successful',
        models: availableModels
      };

    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      return {
        success: false,
        message: 'Connection failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save settings to BrainDrive backend
   */
  async saveSettings(settings: OpenAISettings): Promise<{ success: boolean; message: string }> {
    try {
      // Try to use BrainDrive API service first
      if (this.services.api) {
        try {
          await this.services.api.post('/api/settings/openai', settings);
          return {
            success: true,
            message: 'Settings saved successfully'
          };
        } catch (apiError) {
          console.warn('BrainDrive API failed, falling back to localStorage:', apiError);
        }
      }

      // Fallback to localStorage
      await this.saveToLocalStorage(settings);
      return {
        success: true,
        message: 'Settings saved to local storage'
      };

    } catch (error) {
      console.error('Error saving OpenAI settings:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save settings'
      };
    }
  }

  /**
   * Load settings from BrainDrive backend or localStorage
   */
  async loadSettings(): Promise<OpenAISettings | null> {
    try {
      // Try to use BrainDrive API service first
      if (this.services.api) {
        try {
          const response = await this.services.api.get('/api/settings/openai');
          if (response && response.data) {
            return this.validateSettings(response.data);
          }
        } catch (apiError) {
          console.warn('BrainDrive API failed, trying localStorage:', apiError);
        }
      }

      // Fallback to localStorage
      return await this.loadFromLocalStorage();

    } catch (error) {
      console.error('Error loading OpenAI settings:', error);
      return null;
    }
  }

  /**
   * Save settings to localStorage
   */
  private async saveToLocalStorage(settings: OpenAISettings): Promise<void> {
    const settingsKey = `${this.SETTINGS_KEY_PREFIX}config`;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  /**
   * Load settings from localStorage
   */
  private async loadFromLocalStorage(): Promise<OpenAISettings | null> {
    try {
      const settingsKey = `${this.SETTINGS_KEY_PREFIX}config`;
      const stored = localStorage.getItem(settingsKey);
      
      if (!stored) {
        return null;
      }

      const settings = JSON.parse(stored);
      return this.validateSettings(settings);

    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Validate settings data
   */
  private validateSettings(data: any): OpenAISettings | null {
    try {
      // Check required fields
      if (!data.apiKey || typeof data.apiKey !== 'string') {
        throw new Error('Invalid API key');
      }

      if (!data.model || typeof data.model !== 'string') {
        throw new Error('Invalid model selection');
      }

      // Validate model is in allowed list
      const allowedModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4o-mini'];
      if (!allowedModels.includes(data.model)) {
        throw new Error('Invalid model selection');
      }

      // Validate optional fields
      const settings: OpenAISettings = {
        apiKey: data.apiKey,
        model: data.model as any
      };

      if (data.organizationId && typeof data.organizationId === 'string') {
        settings.organizationId = data.organizationId;
      }

      if (data.maxTokens && typeof data.maxTokens === 'number') {
        settings.maxTokens = data.maxTokens;
      }

      if (data.temperature && typeof data.temperature === 'number') {
        settings.temperature = data.temperature;
      }

      return settings;

    } catch (error) {
      console.error('Settings validation failed:', error);
      return null;
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings(): OpenAISettings {
    return {
      apiKey: '',
      organizationId: '',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7
    };
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return /^sk-[a-zA-Z0-9]{48}$/.test(apiKey);
  }

  /**
   * Validate organization ID format
   */
  validateOrganizationId(orgId: string): boolean {
    // OpenAI organization IDs are typically alphanumeric
    return /^[a-zA-Z0-9]{20,}$/.test(orgId);
  }

  /**
   * Broadcast settings update to other components
   */
  broadcastSettingsUpdate(settings: OpenAISettings): void {
    if (this.services.event) {
      this.services.event.sendMessage('openai-settings-updated', {
        settings,
        timestamp: new Date().toISOString()
      });
    }
  }
} 
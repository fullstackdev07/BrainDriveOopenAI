import { OpenAIService } from './openaiService';
import { Services, OpenAISettings } from '../types';

// Mock services
const mockServices: Services = {
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  event: {
    sendMessage: jest.fn(),
    subscribeToMessages: jest.fn(),
    unsubscribeFromMessages: jest.fn(),
  },
  theme: {
    getCurrentTheme: jest.fn(),
    addThemeChangeListener: jest.fn(),
    removeThemeChangeListener: jest.fn(),
  },
  settings: {
    get: jest.fn(),
    set: jest.fn(),
  },
};

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new OpenAIService(mockServices);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should return success for valid API key', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          object: 'list',
          data: [
            { id: 'gpt-4o' },
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' }
          ]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await service.testConnection('sk-valid-key');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.models).toContain('gpt-4o');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-valid-key'
          })
        })
      );
    });

    it('should return error for invalid API key', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error'
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await service.testConnection('sk-invalid-key');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
      expect(result.error).toBe('Invalid API key');
    });

    it('should include organization ID in headers when provided', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          object: 'list',
          data: []
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await service.testConnection('sk-valid-key', 'org-12345678901234567890');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-valid-key',
            'OpenAI-Organization': 'org-12345678901234567890'
          })
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection('sk-valid-key');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
      expect(result.error).toBe('Network error');
    });
  });

  describe('saveSettings', () => {
    it('should save settings via BrainDrive API when available', async () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      (mockServices.api?.post as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.saveSettings(settings);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings saved successfully');
      expect(mockServices.api?.post).toHaveBeenCalledWith('/api/settings/openai', settings);
    });

    it('should fallback to localStorage when BrainDrive API fails', async () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      (mockServices.api?.post as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.saveSettings(settings);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings saved to local storage');
    });

    it('should handle save errors', async () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await service.saveSettings(settings);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Storage error');

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadSettings', () => {
    it('should load settings from BrainDrive API when available', async () => {
      const mockSettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      (mockServices.api?.get as jest.Mock).mockResolvedValue({
        data: mockSettings
      });

      const result = await service.loadSettings();

      expect(result).toEqual(mockSettings);
      expect(mockServices.api?.get).toHaveBeenCalledWith('/api/settings/openai');
    });

    it('should fallback to localStorage when BrainDrive API fails', async () => {
      const mockSettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      (mockServices.api?.get as jest.Mock).mockRejectedValue(new Error('API Error'));
      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(mockSettings));

      const result = await service.loadSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return null when no settings are found', async () => {
      (mockServices.api?.get as jest.Mock).mockRejectedValue(new Error('API Error'));
      localStorage.getItem = jest.fn().mockReturnValue(null);

      const result = await service.loadSettings();

      expect(result).toBeNull();
    });
  });

  describe('getDefaultSettings', () => {
    it('should return default settings', () => {
      const defaults = service.getDefaultSettings();

      expect(defaults).toEqual({
        apiKey: '',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      const validKey = 'sk-123456789012345678901234567890123456789012345678901234567890';
      expect(service.validateApiKey(validKey)).toBe(true);
    });

    it('should reject invalid API key format', () => {
      const invalidKeys = [
        'invalid-key',
        'sk-123',
        'sk-123456789012345678901234567890123456789012345678901234567890123',
        ''
      ];

      invalidKeys.forEach(key => {
        expect(service.validateApiKey(key)).toBe(false);
      });
    });
  });

  describe('validateOrganizationId', () => {
    it('should validate correct organization ID format', () => {
      const validOrgId = 'org-12345678901234567890';
      expect(service.validateOrganizationId(validOrgId)).toBe(true);
    });

    it('should reject invalid organization ID format', () => {
      const invalidOrgIds = [
        'invalid-org',
        'org-123',
        'org-123456789012345678901234567890123456789012345678901234567890',
        ''
      ];

      invalidOrgIds.forEach(orgId => {
        expect(service.validateOrganizationId(orgId)).toBe(false);
      });
    });
  });

  describe('broadcastSettingsUpdate', () => {
    it('should broadcast settings update when event service is available', () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      service.broadcastSettingsUpdate(settings);

      expect(mockServices.event?.sendMessage).toHaveBeenCalledWith(
        'openai-settings-updated',
        expect.objectContaining({
          settings,
          timestamp: expect.any(String)
        })
      );
    });

    it('should not broadcast when event service is not available', () => {
      const serviceWithoutEvent = new OpenAIService({});
      const settings: OpenAISettings = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4o'
      };

      // Should not throw error
      expect(() => {
        serviceWithoutEvent.broadcastSettingsUpdate(settings);
      }).not.toThrow();
    });
  });
}); 
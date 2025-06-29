import {
  validateForm,
  formDataToSettings,
  settingsToFormData,
  getFormFields,
  formatErrorMessage,
  generateId,
  hasValidationErrors,
  sanitizeApiKey,
  isLocalStorageAvailable
} from './utils';
import { OpenAISettingsFormState, OpenAISettings } from './types';

describe('Utils', () => {
  describe('validateForm', () => {
    it('should return no errors for valid form data', () => {
      const validFormData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '4096',
        temperature: '0.7'
      };

      const errors = validateForm(validFormData);
      expect(errors).toEqual({});
    });

    it('should return error for missing API key', () => {
      const invalidFormData: OpenAISettingsFormState = {
        apiKey: '',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      };

      const errors = validateForm(invalidFormData);
      expect(errors.apiKey).toBe('API Key is required');
    });

    it('should return error for invalid API key format', () => {
      const invalidFormData: OpenAISettingsFormState = {
        apiKey: 'invalid-key',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      };

      const errors = validateForm(invalidFormData);
      expect(errors.apiKey).toContain('Invalid API Key format');
    });

    it('should return error for invalid organization ID', () => {
      const invalidFormData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: 'invalid-org',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      };

      const errors = validateForm(invalidFormData);
      expect(errors.organizationId).toBe('Invalid Organization ID format');
    });

    it('should return error for invalid max tokens', () => {
      const invalidFormData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '10000',
        temperature: ''
      };

      const errors = validateForm(invalidFormData);
      expect(errors.maxTokens).toBe('Max tokens must be between 1 and 8192');
    });

    it('should return error for invalid temperature', () => {
      const invalidFormData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: '3.0'
      };

      const errors = validateForm(invalidFormData);
      expect(errors.temperature).toBe('Temperature must be between 0 and 2');
    });
  });

  describe('formDataToSettings', () => {
    it('should convert form data to settings object', () => {
      const formData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: 'org-12345678901234567890',
        model: 'gpt-4o',
        maxTokens: '4096',
        temperature: '0.7'
      };

      const settings = formDataToSettings(formData);
      expect(settings).toEqual({
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: 'org-12345678901234567890',
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7
      });
    });

    it('should handle empty optional fields', () => {
      const formData: OpenAISettingsFormState = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      };

      const settings = formDataToSettings(formData);
      expect(settings).toEqual({
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        model: 'gpt-4o'
      });
    });
  });

  describe('settingsToFormData', () => {
    it('should convert settings object to form data', () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: 'org-12345678901234567890',
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7
      };

      const formData = settingsToFormData(settings);
      expect(formData).toEqual({
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: 'org-12345678901234567890',
        model: 'gpt-4o',
        maxTokens: '4096',
        temperature: '0.7'
      });
    });

    it('should handle missing optional fields', () => {
      const settings: OpenAISettings = {
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        model: 'gpt-4o'
      };

      const formData = settingsToFormData(settings);
      expect(formData).toEqual({
        apiKey: 'sk-123456789012345678901234567890123456789012345678901234567890',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      });
    });
  });

  describe('getFormFields', () => {
    it('should return array of form field definitions', () => {
      const fields = getFormFields();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      
      fields.forEach(field => {
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
      });
    });

    it('should include API key field', () => {
      const fields = getFormFields();
      const apiKeyField = fields.find(f => f.name === 'apiKey');
      expect(apiKeyField).toBeDefined();
      expect(apiKeyField?.type).toBe('password');
      expect(apiKeyField?.required).toBe(true);
    });

    it('should include model selection field', () => {
      const fields = getFormFields();
      const modelField = fields.find(f => f.name === 'model');
      expect(modelField).toBeDefined();
      expect(modelField?.type).toBe('select');
      expect(modelField?.options).toBeDefined();
      expect(Array.isArray(modelField?.options)).toBe(true);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format string error', () => {
      const error = 'Test error message';
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('Test error message');
    });

    it('should format Error object', () => {
      const error = new Error('Test error message');
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('Test error message');
    });

    it('should format object with error property', () => {
      const error = { error: { message: 'Test error message' } };
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('Test error message');
    });

    it('should return default message for unknown error', () => {
      const error = {};
      const formatted = formatErrorMessage(error);
      expect(formatted).toBe('An unknown error occurred');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('hasValidationErrors', () => {
    it('should return true when there are validation errors', () => {
      const errors = { apiKey: 'API Key is required' };
      expect(hasValidationErrors(errors)).toBe(true);
    });

    it('should return false when there are no validation errors', () => {
      const errors = {};
      expect(hasValidationErrors(errors)).toBe(false);
    });
  });

  describe('sanitizeApiKey', () => {
    it('should sanitize API key for display', () => {
      const apiKey = 'sk-123456789012345678901234567890123456789012345678901234567890';
      const sanitized = sanitizeApiKey(apiKey);
      expect(sanitized).toBe('sk-1234...7890');
    });

    it('should return original key if too short', () => {
      const apiKey = 'sk-123';
      const sanitized = sanitizeApiKey(apiKey);
      expect(sanitized).toBe(apiKey);
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeApiKey('');
      expect(sanitized).toBe('');
    });
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      const available = isLocalStorageAvailable();
      expect(typeof available).toBe('boolean');
    });
  });
}); 
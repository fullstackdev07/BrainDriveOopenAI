import React from 'react';
import './OpenAISettings.css';
import {
  OpenAISettingsProps,
  OpenAISettingsState,
  OpenAISettingsFormState,
  ValidationErrors,
  Alert,
  AlertType
} from './types';
import {
  validateForm,
  formDataToSettings,
  settingsToFormData,
  getFormFields,
  formatErrorMessage,
  generateId,
  hasValidationErrors,
  sanitizeApiKey
} from './utils';
import { OpenAIService } from './services';
import { FormField, Alert as AlertComponent, TestConnectionResult } from './components';

/**
 * OpenAI Settings Plugin for BrainDrive
 * Allows users to configure OpenAI API settings
 */
class OpenAISettings extends React.Component<OpenAISettingsProps, OpenAISettingsState> {
  private openaiService: OpenAIService | null = null;
  private themeChangeListener: ((theme: string) => void) | null = null;
  private debouncedValidation: (formData: OpenAISettingsFormState) => void;

  constructor(props: OpenAISettingsProps) {
    super(props);
    
    this.state = {
      formData: {
        apiKey: '',
        organizationId: '',
        model: 'gpt-4o',
        maxTokens: '',
        temperature: ''
      },
      validationErrors: {},
      isLoading: false,
      isSaving: false,
      isTestingConnection: false,
      currentTheme: 'light',
      testResult: null,
      saveResult: null,
      isInitializing: true
    };
    
    // Initialize service
    this.openaiService = new OpenAIService(props.services);
    
    // Debounced validation
    this.debouncedValidation = this.debounceValidation.bind(this);
  }

  componentDidMount() {
    this.initializeThemeService();
    this.loadSettings();
    
    // Set initialization timeout
    setTimeout(() => {
      this.setState({ isInitializing: false });
    }, 1000);
  }

  componentWillUnmount() {
    // Clean up theme listener
    if (this.themeChangeListener && this.props.services?.theme) {
      this.props.services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
  }

  /**
   * Initialize the theme service to listen for theme changes
   */
  initializeThemeService = () => {
    if (this.props.services?.theme) {
      try {
        // Get the current theme
        const currentTheme = this.props.services.theme.getCurrentTheme();
        this.setState({ currentTheme });
        
        // Set up theme change listener
        this.themeChangeListener = (newTheme: string) => {
          this.setState({ currentTheme: newTheme });
        };
        
        // Add the listener to the theme service
        this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
      } catch (error) {
        console.warn('Error initializing theme service:', error);
      }
    }
  }

  /**
   * Load settings from storage
   */
  loadSettings = async () => {
    if (!this.openaiService) return;

    try {
      this.setState({ isLoading: true });
      
      const settings = await this.openaiService.loadSettings();
      if (settings) {
        const formData = settingsToFormData(settings);
        this.setState({ formData });
      } else {
        // Use default settings
        const defaultSettings = this.openaiService.getDefaultSettings();
        const formData = settingsToFormData(defaultSettings);
        this.setState({ formData });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showAlert('error', 'Failed to load settings', formatErrorMessage(error));
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Handle form field changes
   */
  handleFieldChange = (fieldName: keyof OpenAISettingsFormState, value: string) => {
    const newFormData = { ...this.state.formData, [fieldName]: value };
    
    this.setState({ formData: newFormData });
    
    // Clear test result when form changes
    if (this.state.testResult) {
      this.setState({ testResult: null });
    }
    
    // Debounced validation
    this.debouncedValidation(newFormData);
  }

  /**
   * Debounced validation to avoid excessive validation calls
   */
  debounceValidation = (() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (formData: OpenAISettingsFormState) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const errors = validateForm(formData);
        this.setState({ validationErrors: errors });
      }, 300);
    };
  })();

  /**
   * Test the OpenAI API connection
   */
  testConnection = async () => {
    if (!this.openaiService) return;

    const errors = validateForm(this.state.formData);
    if (hasValidationErrors(errors)) {
      this.setState({ validationErrors: errors });
      this.showAlert('error', 'Please fix validation errors before testing connection');
      return;
    }

    try {
      this.setState({ isTestingConnection: true, testResult: null });
      
      const settings = formDataToSettings(this.state.formData);
      const result = await this.openaiService.testConnection(
        settings.apiKey,
        settings.organizationId
      );
      
      this.setState({ testResult: result });
      
      if (result.success) {
        this.showAlert('success', 'Connection test successful', 'Your OpenAI API key is valid and working.');
      } else {
        this.showAlert('error', 'Connection test failed', result.error);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const errorResult = {
        success: false,
        message: 'Connection test failed',
        error: formatErrorMessage(error)
      };
      this.setState({ testResult: errorResult });
      this.showAlert('error', 'Connection test failed', formatErrorMessage(error));
    } finally {
      this.setState({ isTestingConnection: false });
    }
  }

  /**
   * Save settings
   */
  saveSettings = async () => {
    if (!this.openaiService) return;

    const errors = validateForm(this.state.formData);
    if (hasValidationErrors(errors)) {
      this.setState({ validationErrors: errors });
      this.showAlert('error', 'Please fix validation errors before saving');
      return;
    }

    try {
      this.setState({ isSaving: true, saveResult: null });
      
      const settings = formDataToSettings(this.state.formData);
      const result = await this.openaiService.saveSettings(settings);
      
      this.setState({ saveResult: result });
      
      if (result.success) {
        this.showAlert('success', 'Settings saved successfully', result.message);
        // Broadcast settings update
        this.openaiService.broadcastSettingsUpdate(settings);
      } else {
        this.showAlert('error', 'Failed to save settings', result.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorResult = {
        success: false,
        message: 'Failed to save settings',
        error: formatErrorMessage(error)
      };
      this.setState({ saveResult: errorResult });
      this.showAlert('error', 'Failed to save settings', formatErrorMessage(error));
    } finally {
      this.setState({ isSaving: false });
    }
  }

  /**
   * Show alert message
   */
  showAlert = (type: AlertType, title: string, message: string) => {
    const alert: Alert = {
      id: generateId(),
      type,
      title,
      message
    };
    
    // For now, we'll just log the alert
    // In a full implementation, you might want to add alerts to state
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  }

  /**
   * Render form field
   */
  renderFormField = (field: any) => {
    const value = this.state.formData[field.name];
    const error = this.state.validationErrors[field.name];
    
    return (
      <FormField
        key={field.name}
        field={field}
        value={value}
        onChange={(value) => this.handleFieldChange(field.name, value)}
        error={error}
        disabled={this.state.isSaving || this.state.isTestingConnection}
      />
    );
  }

  /**
   * Render loading state
   */
  renderLoadingState = () => (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <div className="loading-message">
        <h3>Loading Settings</h3>
        <p>Please wait while we load your OpenAI configuration...</p>
      </div>
    </div>
  );

  /**
   * Render the main form
   */
  renderForm = () => {
    const formFields = getFormFields();
    const hasErrors = hasValidationErrors(this.state.validationErrors);
    const hasApiKey = this.state.formData.apiKey.trim().length > 0;

    return (
      <div className="settings-form">
        <div className="form-section">
          <div className="form-section-title">
            API Configuration
          </div>
          
          {formFields.slice(0, 2).map(this.renderFormField)}
          
          {hasApiKey && (
            <div className="text-sm text-gray-600 mt-2">
              API Key: {sanitizeApiKey(this.state.formData.apiKey)}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section-title">
            Model Settings
          </div>
          
          {formFields.slice(2).map(this.renderFormField)}
        </div>

        {this.state.testResult && (
          <TestConnectionResult result={this.state.testResult} />
        )}

        <div className="button-group">
          <button
            type="button"
            className="button button-secondary"
            onClick={this.testConnection}
            disabled={this.state.isTestingConnection || this.state.isSaving || hasErrors || !hasApiKey}
          >
            {this.state.isTestingConnection ? (
              <>
                <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }}></div>
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          
          <button
            type="button"
            className="button button-primary"
            onClick={this.saveSettings}
            disabled={this.state.isSaving || this.state.isTestingConnection || hasErrors}
          >
            {this.state.isSaving ? (
              <>
                <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }}></div>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { currentTheme, isInitializing, isLoading } = this.state;
    const containerClass = `openai-settings-container ${currentTheme === 'dark' ? 'dark-theme' : ''}`;

    if (isInitializing || isLoading) {
      return (
        <div className={containerClass}>
          {this.renderLoadingState()}
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <div className="settings-header">
          <div className="settings-title">
            <h2>OpenAI Settings</h2>
            <span className="settings-subtitle">
              Configure your OpenAI API credentials and model preferences
            </span>
          </div>
        </div>
        
        <div className="settings-content">
          {this.renderForm()}
        </div>
      </div>
    );
  }
}

export default OpenAISettings; 
# BrainDrive OpenAI Settings Plugin

A professional OpenAI Settings plugin for the BrainDrive platform that allows users to configure and manage their OpenAI API credentials and model preferences.

## Features

- **API Key Management**: Secure input and validation of OpenAI API keys
- **Organization ID Support**: Optional organization ID configuration for enterprise users
- **Model Selection**: Choose from popular OpenAI models (GPT-4o, GPT-4, GPT-3.5-turbo, etc.)
- **Connection Testing**: Test API connectivity before saving settings
- **Advanced Configuration**: Configure max tokens and temperature settings
- **Theme Support**: Automatic light/dark theme switching
- **Responsive Design**: Mobile-first responsive design
- **Real-time Validation**: Form validation with helpful error messages
- **Settings Persistence**: Save settings to BrainDrive backend or localStorage fallback
- **Error Handling**: Comprehensive error handling and user feedback

## Technical Specifications

- **Framework**: React 18 with TypeScript
- **Build System**: Webpack 5 with Module Federation
- **Styling**: Custom CSS with CSS variables for theming
- **API**: OpenAI API v1 for connection testing
- **Services Used**: API, Theme, Event, and Settings services from BrainDrive
- **Architecture**: Modular component-based design with service layer

## Installation

1. **Build the Plugin**:
   ```bash
   cd plugins/BrainDriveOpenAISettings
   npm install
   npm run build
   ```

2. **Install via BrainDrive Plugin Manager**:
   - Use the remote installation URL: `https://github.com/your-org/BrainDriveOpenAISettings.git`
   - Or install locally by copying the built plugin to the plugins directory

## Configuration

The plugin supports the following configuration options:

- **API Key**: Your OpenAI API key (required)
- **Organization ID**: Your OpenAI organization ID (optional)
- **Default Model**: Primary model for AI interactions
- **Max Tokens**: Maximum token limit for responses (1-8192)
- **Temperature**: Response randomness control (0-2)

## API Usage

The plugin integrates with the OpenAI API:
```
https://api.openai.com/v1/models
```

For connection testing, the plugin sends a GET request to the models endpoint using the provided API key and organization ID.

## Component Structure

```
src/
├── components/
│   ├── FormField.tsx           # Reusable form field component
│   ├── Alert.tsx               # Alert/notification component
│   ├── TestConnectionResult.tsx # Connection test results display
│   └── index.ts                # Component exports
├── services/
│   ├── openaiService.ts        # OpenAI API service
│   └── index.ts                # Service exports
├── types/
│   ├── openai.ts               # TypeScript type definitions
│   └── index.ts                # Type exports
├── OpenAISettings.tsx          # Main settings component
├── OpenAISettings.css          # Styling with theme support
├── utils.ts                    # Utility functions
├── setupTests.ts               # Test setup
└── index.tsx                   # Entry point
```

## Data Structure

The plugin manages the following OpenAI settings:

- **API Key**: OpenAI API authentication key
- **Organization ID**: Optional organization identifier
- **Model**: Selected OpenAI model (gpt-4o, gpt-4, gpt-3.5-turbo, etc.)
- **Max Tokens**: Response length limit
- **Temperature**: Response creativity/randomness control

## Styling

The plugin uses a comprehensive CSS system with:

- **CSS Variables**: For theme-aware styling
- **Utility Classes**: Tailwind-like utilities for layout and spacing
- **Responsive Design**: Mobile-first responsive breakpoints
- **Dark/Light Themes**: Automatic theme switching
- **Loading States**: Spinners and loading indicators
- **Form Validation**: Visual feedback for validation errors

## Services Integration

### API Service
- Tests OpenAI API connectivity
- Saves settings to BrainDrive backend
- Handles CORS and authentication
- Error handling and retries

### Theme Service
- Automatic theme detection
- Theme change listeners
- CSS variable updates

### Settings Service
- User preference storage
- Configuration persistence
- Settings synchronization

### Event Service
- Settings update broadcasts
- Inter-component communication
- Plugin lifecycle events

## Error Handling

The plugin includes comprehensive error handling:

- **Network Errors**: Graceful fallback with retry options
- **API Errors**: User-friendly error messages
- **Validation Errors**: Real-time form validation
- **Storage Errors**: Fallback to alternative storage methods

## Performance

- **Debounced Validation**: Prevents excessive validation calls
- **Lazy Loading**: Components load only when needed
- **Memory Management**: Proper cleanup of listeners and intervals
- **Caching**: Intelligent caching of settings and validation results

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Prerequisites
- Node.js 16+
- npm 7+

### Setup
```bash
cd plugins/BrainDriveOpenAISettings
npm install
npm run dev    # Development mode with hot reload
npm run build  # Production build
npm run clean  # Clean build artifacts
```

### Testing
```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Code Coverage
The plugin maintains 80%+ code coverage across:
- Utility functions
- Service layer
- Component logic
- Form validation
- Error handling

## Security

- **API Key Protection**: Secure handling of sensitive credentials
- **Input Validation**: Comprehensive validation of all user inputs
- **CORS Handling**: Proper CORS configuration for API calls
- **Error Sanitization**: Safe error message display

## Accessibility

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: High contrast ratios for readability
- **Focus Management**: Proper focus handling and indicators

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Support

For issues and support:
- GitHub Issues: https://github.com/your-org/BrainDriveOpenAISettings/issues
- BrainDrive Documentation: [Plugin Development Guide]

## Changelog

### v1.0.0
- Initial release
- OpenAI API key management
- Model selection
- Connection testing
- Theme support
- Form validation
- Settings persistence
- Responsive design
- Comprehensive testing suite 
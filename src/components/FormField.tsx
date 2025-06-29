import React from 'react';
import { FormField as FormFieldType, ValidationErrors } from '../types';

interface FormFieldProps {
  field: FormFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Reusable form field component
 */
export const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const fieldClass = `form-field ${error ? 'form-field-error' : ''}`;

  return (
    <div className={fieldClass}>
      <label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      
      {field.type === 'select' ? (
        <select
          id={field.name}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={field.required}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          type={field.type}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          disabled={disabled}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {field.helpText && !error && (
        <div className="help-text">{field.helpText}</div>
      )}
    </div>
  );
}; 
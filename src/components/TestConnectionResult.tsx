import React from 'react';
import { TestConnectionResult as TestResult } from '../types';

interface TestConnectionResultProps {
  result: TestResult;
}

/**
 * Component to display test connection results
 */
export const TestConnectionResult: React.FC<TestConnectionResultProps> = ({ result }) => {
  const resultClass = `test-results ${result.success ? 'success' : 'error'} slide-in`;

  return (
    <div className={resultClass}>
      <div className="test-results-title">
        {result.success ? (
          <>
            <span className="text-green-600">✓</span>
            Connection Successful
          </>
        ) : (
          <>
            <span className="text-red-600">✗</span>
            Connection Failed
          </>
        )}
      </div>
      
      <div className="test-results-message">
        {result.message}
      </div>
      
      {result.error && (
        <div className="test-results-details">
          Error: {result.error}
        </div>
      )}
      
      {result.success && result.models && result.models.length > 0 && (
        <div className="available-models">
          <div className="available-models-title">
            Available Models ({result.models.length}):
          </div>
          <div className="models-list">
            {result.models.slice(0, 10).map((model) => (
              <span key={model} className="model-tag">
                {model}
              </span>
            ))}
            {result.models.length > 10 && (
              <span className="model-tag">
                +{result.models.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 
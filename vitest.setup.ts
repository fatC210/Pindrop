import '@testing-library/jest-dom/vitest';

// Vitest setup file for global test configuration
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

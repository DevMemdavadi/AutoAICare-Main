import api from '@/utils/api';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Replace localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('API Utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  test('creates axios instance with correct baseURL from environment', () => {
    // This test checks if the API is properly configured with the base URL
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
  });

  test('includes correct default headers', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  test('has request interceptor to add token', () => {
    localStorageMock.getItem.mockReturnValue('mock-access-token');
    
    // Create a mock request
    const mockConfig = { headers: {}, url: '/test' };
    
    // Apply the request interceptor
    const processedConfig = api.interceptors.request.handlers[0].fulfilled(mockConfig);
    
    expect(processedConfig.headers.Authorization).toBe('Bearer mock-access-token');
  });

  test('handles FormData by removing Content-Type header', () => {
    const formData = new FormData();
    formData.append('test', 'value');
    
    const mockConfig = { headers: { 'Content-Type': 'application/json' }, data: formData };
    
    // Apply the request interceptor
    const processedConfig = api.interceptors.request.handlers[0].fulfilled(mockConfig);
    
    // The Content-Type header should be removed for FormData
    expect(processedConfig.headers['Content-Type']).toBeUndefined();
  });

  test('does not add Authorization header when no token is present', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const mockConfig = { headers: {}, url: '/test' };
    
    const processedConfig = api.interceptors.request.handlers[0].fulfilled(mockConfig);
    
    expect(processedConfig.headers.Authorization).toBeUndefined();
  });
});
import { AppProvider, useApp } from '@/contexts/AppContext';
import { act, render, screen } from '@testing-library/react';

// Test component to consume the context
const TestComponent = ({ onContextValue }) => {
  const contextValue = useApp();
  
  if (onContextValue) {
    onContextValue(contextValue);
  }
  
  return (
    <div>
      <span data-testid="sidebar-state">{contextValue.sidebarOpen.toString()}</span>
      <span data-testid="notification-count">{contextValue.notifications.length}</span>
      <button onClick={() => contextValue.toggleSidebar()}>Toggle Sidebar</button>
      <button onClick={() => contextValue.addNotification({ message: 'Test notification' })}>Add Notification</button>
    </div>
  );
};

describe('AppContext', () => {
  test('provides initial context values', () => {
    const contextValues = {};
    
    render(
      <AppProvider>
        <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
      </AppProvider>
    );
    
    expect(contextValues.sidebarOpen).toBe(true);
    expect(contextValues.notifications).toEqual([]);
  });

  test('toggles sidebar state', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true');
    
    await act(async () => {
      screen.getByText('Toggle Sidebar').click();
    });
    
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false');
    
    await act(async () => {
      screen.getByText('Toggle Sidebar').click();
    });
    
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true');
  });

  test('adds notifications', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    
    await act(async () => {
      screen.getByText('Add Notification').click();
    });
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });
});
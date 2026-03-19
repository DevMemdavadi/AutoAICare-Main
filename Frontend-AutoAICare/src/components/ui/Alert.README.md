# Alert Component

A reusable, accessible, and visually appealing alert/toast notification component for the DetailEase application.

## Features

- Multiple alert types (success, error, warning, info)
- Auto-dismiss with progress bar
- Manual dismiss with close button
- Smooth animations
- Fully customizable
- Accessible

## Usage

### Basic Import

```javascript
import { Alert } from '@/components/ui';
```

### Basic Usage

```jsx
<Alert 
  type="success" 
  message="Operation completed successfully!" 
  onClose={() => setAlert({ show: false, type: '', message: '' })}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | string | 'info' | Alert type: 'success', 'error', 'warning', or 'info' |
| message | string | '' | The alert message to display |
| onClose | function | null | Callback function when alert is closed |
| duration | number | 5000 | Auto-dismiss duration in milliseconds (0 to disable) |
| showProgress | boolean | true | Show/hide the progress bar |

### Example Implementation

```jsx
import { Alert } from '@/components/ui';
import { useState } from 'react';

const MyComponent = () => {
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  return (
    <div>
      {/* Trigger buttons */}
      <button onClick={() => showAlert('success', 'Success message!')}>
        Show Success
      </button>
      <button onClick={() => showAlert('error', 'Error message!')}>
        Show Error
      </button>

      {/* Alert Component */}
      {alert.show && (
        <Alert 
          type={alert.type} 
          message={alert.message} 
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Rest of your component */}
    </div>
  );
};
```

## Styling

The Alert component uses Tailwind CSS classes and comes with predefined styles for each alert type:

- **Success**: Green background with green border and text
- **Error**: Red background with red border and text
- **Warning**: Yellow background with yellow border and text
- **Info**: Blue background with blue border and text

## Accessibility

- Proper ARIA roles and attributes
- Keyboard navigable close button
- Sufficient color contrast
- Animated entrance for visibility

## Customization

To customize the Alert component, you can modify the `Alert.jsx` file directly. The component is designed to be easily extendable for additional alert types or styling changes.
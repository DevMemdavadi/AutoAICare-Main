import React from 'react';

export const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
  const baseClass = 'btn';
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    destructive: 'btn-destructive',
    success: 'btn-success',
  };
  const sizeMap = {
    default: '',
    sm: 'btn-sm',
  };

  const variantClass = variantMap[variant] || variantMap.primary;
  const sizeClass = sizeMap[size] || '';

  return (
    <button className={`${baseClass} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input = ({ label, error, helperText, className = '', prefix, ...props }) => {
  const inputRef = React.useRef(null);

  const handleContainerClick = () => {
    // For datetime-local inputs, clicking anywhere on the container should open the picker
    if (props.type === 'datetime-local' || props.type === 'date' || props.type === 'time') {
      inputRef.current?.showPicker?.();
    }
  };

  return (
    <div className="">
      {label && <label className="label">{label}</label>}
      <div
        className="relative"
        onClick={handleContainerClick}
        style={{ cursor: (props.type === 'datetime-local' || props.type === 'date' || props.type === 'time') ? 'pointer' : 'default' }}
      >
        {prefix && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={inputRef}
          className={`input ${error ? 'border-red-500' : ''} ${prefix ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      {helperText && !error && <p className="text-gray-500 text-xs mt-1">{helperText}</p>}
    </div>
  );
};

export const Card = ({ title, children, className = '', actions, ...props }) => {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || actions) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="text-xl font-semibold">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

import { useAuth } from '@/contexts/AuthContext';

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', hideScrollbar = false, scrollbarClass }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  // Determine final scrollbar class based on role if not explicitly provided
  const isAdmin = ['super_admin', 'company_admin', 'branch_admin', 'admin'].includes(user?.role);
  const finalScrollbarClass = scrollbarClass || (isAdmin ? 'white-scrollbar' : 'custom-scrollbar');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl ${sizeClass} w-full mx-4 max-h-[90vh] flex flex-col`}>
        <div className="p-6 flex-grow flex flex-col overflow-hidden">
          {title && (
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-semibold">{title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
          )}
          <div className={`flex-grow overflow-y-auto pr-2 ${hideScrollbar ? 'no-scrollbar' : finalScrollbarClass}`}>{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2 flex-shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export const Loader = () => {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export const Table = ({ headers, data, renderRow, loading = false, emptyMessage = 'No data available' }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {headers.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-gray-200 rounded" style={{ width: `${60 + (j * 17 + i * 11) % 60}%` }} />
                      {j === 0 && <div className="h-2.5 bg-gray-200 rounded mt-1.5 w-2/3" />}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ) : data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    secondary: 'bg-gray-200 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export const Select = ({ label, options, error, className = '', children, ...props }) => {
  return (
    <div className="">
      {label && <label className="label">{label}</label>}
      <select className={`input ${error ? 'border-red-500' : ''} ${className}`} {...props}>
        {children || options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export const Textarea = ({ label, error, className = '', ...props }) => {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      <textarea
        className={`input resize-none ${error ? 'border-red-500' : ''} ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

// Alert component
export { default as Alert } from './Alert';

// SkeletonLoader component
export { default as SkeletonLoader } from './SkeletonLoader';

// Autocomplete component
export { default as Autocomplete } from './Autocomplete';


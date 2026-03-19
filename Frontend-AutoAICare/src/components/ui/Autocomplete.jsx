import { ChevronDown, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

/**
 * Autocomplete component with search and dropdown functionality
 * @param {Object} props
 * @param {string} props.label - Label for the input
 * @param {Array} props.options - Array of options to display
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Callback when value changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the input is disabled
 */
const Autocomplete = React.forwardRef(({
    label,
    options = [],
    value = '',
    onChange,
    placeholder = 'Search...',
    required = false,
    className = '',
    disabled = false,
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [activeIndex, setActiveIndex] = useState(-1); // Track active option for keyboard navigation
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const optionRefs = useRef([]); // Refs for each option

    // Update filtered options when search term or options change
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter((option) =>
                option.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        }
        setActiveIndex(-1); // Reset active index when options change
    }, [searchTerm, options]);

    // Sync search term with value when value changes externally
    useEffect(() => {
        if (value && !isOpen) {
            setSearchTerm(value);
        }
    }, [value, isOpen]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
                // Reset search term to selected value when closing
                if (value) {
                    setSearchTerm(value);
                } else {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        setIsOpen(true);
        setActiveIndex(-1);

        // If search term matches an option exactly, select it
        if (options.includes(newValue)) {
            onChange(newValue);
        } else if (newValue === '') {
            onChange('');
        }
    };

    const handleOptionClick = (option) => {
        setSearchTerm(option);
        onChange(option);
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => {
                    const newIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
                    scrollToOption(newIndex);
                    return newIndex;
                });
                break;

            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => {
                    const newIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
                    scrollToOption(newIndex);
                    return newIndex;
                });
                break;

            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && filteredOptions[activeIndex]) {
                    handleOptionClick(filteredOptions[activeIndex]);
                } else if (searchTerm && filteredOptions.includes(searchTerm)) {
                    handleOptionClick(searchTerm);
                }
                break;

            case 'Escape':
                setIsOpen(false);
                setActiveIndex(-1);
                inputRef.current?.blur();
                break;

            default:
                break;
        }
    };

    // Scroll to the active option
    const scrollToOption = (index) => {
        if (optionRefs.current[index]) {
            optionRefs.current[index].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    };

    // Reset refs array when filteredOptions change
    useEffect(() => {
        optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
    }, [filteredOptions]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="label">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className="input pr-10"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {isOpen ? (
                        <Search className="text-gray-400" size={18} />
                    ) : (
                        <ChevronDown className="text-gray-400" size={18} />
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
                        <ul className="py-1">
                            {filteredOptions.map((option, index) => (
                                <li
                                    key={index}
                                    ref={el => optionRefs.current[index] = el}
                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${activeIndex === index
                                            ? 'bg-blue-100 font-medium'
                                            : value === option
                                                ? 'bg-blue-50 font-medium'
                                                : ''
                                        }`}
                                    onClick={() => handleOptionClick(option)}
                                >
                                    {option}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                            No options found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default Autocomplete;
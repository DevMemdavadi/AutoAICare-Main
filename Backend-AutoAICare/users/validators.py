import re
from django.core.exceptions import ValidationError


def validate_phone_number(value):
    """
    Validate phone number format.
    Accepts only digits with optional + at the beginning.
    Length should be exactly 10 digits.
    Should not consist entirely of zeros.
    """
    if not value:
        return value
    
    # Remove any spaces or dashes
    clean_value = re.sub(r'[\s\-()]', '', value)
    
    # Check if it starts with +
    if clean_value.startswith('+'):
        # Remove the +
        phone_digits = clean_value[1:]
    else:
        phone_digits = clean_value
    
    # Check if all characters are digits
    if not phone_digits.isdigit():
        raise ValidationError('Please enter a valid phone number. Phone number should contain only digits.')
    
    # Check length (exactly 10 digits)
    if len(phone_digits) != 10:
        raise ValidationError('Please enter a valid phone number. Phone number should be exactly 10 digits.')
    
    # Check if phone number consists entirely of zeros
    if phone_digits.count('0') == len(phone_digits):
        raise ValidationError('Please enter a valid phone number. Phone number cannot consist entirely of zeros.')
    
    return value
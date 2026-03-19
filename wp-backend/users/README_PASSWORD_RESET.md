# Password Reset Functionality

This document describes the password reset functionality implemented in the Yogi Sarbat backend.

## Overview

The password reset system allows users to:
1. Request a password reset via email
2. Reset their password using a secure token
3. Change their password while logged in
4. Validate reset tokens

## API Endpoints

### 1. Forgot Password
**POST** `/api/users/password/forgot/`

Request a password reset email to be sent.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Password reset email sent successfully. Please check your email.",
    "data": {}
}
```

### 2. Reset Password
**POST** `/api/users/password/reset/`

Reset password using the token from the email.

**Request Body:**
```json
{
    "token": "reset_token_from_email",
    "uidb64": "user_id_base64_encoded",
    "new_password": "new_secure_password",
    "confirm_password": "new_secure_password"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Password reset successfully. You can now login with your new password.",
    "data": {}
}
```

### 3. Change Password (Authenticated)
**POST** `/api/users/password/change/`

Change password while logged in (requires authentication).

**Request Body:**
```json
{
    "old_password": "current_password",
    "new_password": "new_secure_password",
    "confirm_password": "new_secure_password"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Password changed successfully. Please login again with your new password.",
    "data": {}
}
```

### 4. Validate Reset Token
**POST** `/api/users/password/validate-token/`

Validate if a reset token is still valid (useful for frontend validation).

**Request Body:**
```json
{
    "token": "reset_token_from_email",
    "uidb64": "user_id_base64_encoded"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Token is valid.",
    "data": {}
}
```

## Email Template

The password reset emails use a custom HTML template located at:
`templates/password_reset_email.html`

The template includes:
- Yogi Sarbat branding
- Clear call-to-action button
- Fallback text link
- Security information
- Contact information

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
DEFAULT_FROM_EMAIL=Yogi Sarbat <noreply@yogisarbat.com>

# Frontend URL for password reset links
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Integration

The reset URL format is:
```
{FRONTEND_URL}/reset-password/{uidb64}/{token}
```

Example:
```
https://yogisarbat.com/reset-password/MjE/abc123def456
```

## Security Features

1. **Token Expiration**: Reset tokens expire after 24 hours
2. **One-time Use**: Tokens can only be used once
3. **Secure Token Generation**: Uses Django's built-in token generator
4. **Password Validation**: New passwords must meet Django's password requirements
5. **Email Verification**: Only sends reset emails to registered email addresses

## Error Handling

The API returns consistent error responses:

```json
{
    "status": "error",
    "message": "Error description",
    "error": {
        "field_name": ["specific error details"]
    }
}
```

Common error scenarios:
- Invalid email address
- User not found
- Invalid or expired token
- Password validation errors
- Email sending failures

## Testing

To test the password reset functionality:

1. **Request Reset:**
   ```bash
   curl -X POST http://localhost:8000/api/users/password/forgot/ \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Reset Password:**
   ```bash
   curl -X POST http://localhost:8000/api/users/password/reset/ \
     -H "Content-Type: application/json" \
     -d '{
       "token": "token_from_email",
       "uidb64": "uid_from_email",
       "new_password": "newpassword123",
       "confirm_password": "newpassword123"
     }'
   ```

## Notes

- Make sure your email server is properly configured
- Test the email functionality in development
- Consider rate limiting for the forgot password endpoint
- Monitor email delivery success rates
- Update the FRONTEND_URL in production settings 
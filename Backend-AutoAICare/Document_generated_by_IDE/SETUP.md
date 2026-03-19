# Quick Setup Guide

## 1. Install Dependencies

```bash
pip install -r requirements.txt
```

## 2. Setup Environment Variables

Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

Update `.env` with your settings:
- Database credentials
- Email settings (for OTP)
- Stripe keys (for payments)
- MSG91 keys (for SMS, optional)

## 3. Setup Database

Make sure PostgreSQL is running, then create the database:

```sql
CREATE DATABASE car_service_db;
```

## 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## 5. Create Superuser

```bash
python manage.py createsuperuser
```

## 6. Create Media Directory

```bash
mkdir media
```

## 7. Run Server

```bash
python manage.py runserver
```

The server will start at `http://127.0.0.1:8000/`

## 8. Access API Documentation

Open your browser and go to:
- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- Admin Panel: `http://127.0.0.1:8000/admin/`

## 9. Optional: Run Celery (for background tasks)

**Start Redis Server first**, then in separate terminals:

Terminal 1 - Celery Worker:
```bash
celery -A config worker -l info
```

Terminal 2 - Celery Beat (for scheduled tasks):
```bash
celery -A config beat -l info
```

## Testing the API

### 1. Register a Customer
```bash
POST http://127.0.0.1:8000/api/auth/register/
{
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "1234567890",
    "password": "securepass123",
    "password2": "securepass123",
    "role": "customer"
}
```

### 2. Login
```bash
POST http://127.0.0.1:8000/api/auth/login/
{
    "email": "customer@example.com",
    "password": "securepass123"
}
```

You'll receive access and refresh tokens. Use the access token in Authorization header:
```
Authorization: Bearer <your_access_token>
```

### 3. Create a Service Package (Admin only)

First login as admin, then:
```bash
POST http://127.0.0.1:8000/api/services/packages/
{
    "name": "Basic Service",
    "description": "Oil change and basic checkup",
    "price": "49.99",
    "duration": 60,
    "is_active": true
}
```

### 4. Add a Vehicle (Customer)
```bash
POST http://127.0.0.1:8000/api/customers/vehicles/
{
    "registration_number": "ABC123",
    "brand": "Toyota",
    "model": "Camry",
    "color": "Blue",
    "year": 2020
}
```

### 5. Create a Booking
```bash
POST http://127.0.0.1:8000/api/bookings/
{
    "vehicle": 1,
    "package": 1,
    "addon_ids": [],
    "booking_datetime": "2024-12-01T10:00:00Z",
    "pickup_required": false,
    "notes": "Need urgent service"
}
```

## Troubleshooting

### Port Already in Use
```bash
python manage.py runserver 8001
```

### Database Connection Error
- Check PostgreSQL is running
- Verify credentials in `.env`
- Check database exists

### Import Errors
```bash
pip install -r requirements.txt --force-reinstall
```

## Next Steps

1. Populate database with sample data via admin panel
2. Test all API endpoints using Swagger UI
3. Setup email/SMS services for notifications
4. Configure Stripe for payment processing
5. Deploy to production server

## Common Commands

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver

# Run tests (when tests are added)
python manage.py test

# Collect static files (for production)
python manage.py collectstatic
```

## Production Deployment

For production:
1. Set `DEBUG=False` in `.env`
2. Use proper PostgreSQL credentials
3. Configure email service (Gmail/SendGrid)
4. Setup Redis for Celery
5. Configure Stripe production keys
6. Use proper SECRET_KEY
7. Setup HTTPS
8. Use gunicorn/uwsgi for serving
9. Setup Nginx as reverse proxy
10. Configure proper CORS settings

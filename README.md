# Conference Room Booking System

A microservices-based web application for booking conference rooms across UK locations. Implements weather-based dynamic pricing where room costs adjust based on forecasted temperatures.

## Overview

This system allows registered users to browse available conference rooms in London, Manchester, Edinburgh, and Birmingham, then make bookings with prices that adjust based on weather conditions. The further the temperature deviates from 21°C, the higher the price adjustment.

### Features

- User registration and JWT authentication
- Browse rooms by location, capacity, and amenities
- Weather-based dynamic pricing
- Email notifications for bookings and cancellations
- Full-day booking model (one room per day)

## Architecture

The application follows a microservices architecture with six independent services:

```
                         +------------------+
                         |   API Gateway    |
                         |   (nginx:80)     |
                         +--------+---------+
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
   +----v----+  +----v----+  +----v----+  +----v----+  +----v----+
   |  Auth   |  |  Rooms  |  | Booking |  | Weather |  |  Email  |
   | Service |  | Service |  | Service |  | Service |  |  Worker |
   | (3001)  |  | (3002)  |  | (3003)  |  | (5000)  |  |  (SQS)  |
   +----+----+  +----+----+  +----+----+  +---------+  +---------+
        |            |            |
        v            v            v
   +----------+ +----------+ +----------+
   |PostgreSQL| |PostgreSQL| | MongoDB  |
   +----------+ +----------+ +----------+
```

### Service Details

| Service | Stack | Port | Database | Purpose |
|---------|-------|------|----------|---------|
| API Gateway | nginx | 80/8080 | - | Request routing |
| Auth Service | Node.js/Express | 3001 | PostgreSQL | User authentication |
| Rooms Service | Node.js/Express | 3002 | PostgreSQL | Room and location data |
| Booking Service | Node.js/Express | 3003 | MongoDB | Booking management |
| Weather Service | Python/Flask | 5000 | - | Weather forecasts |
| Email Worker | AWS Lambda | - | - | Notification processing |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for Weather Service)
- AWS account (for production deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd conference-room-booking
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Wait approximately 30 seconds for services to initialize.

4. Verify services are running:
   ```bash
   curl http://localhost:8080/api/auth/health
   curl http://localhost:8080/api/rooms/health
   curl http://localhost:8080/api/bookings/health
   curl http://localhost:8080/api/weather/health
   ```

## API Reference

### Authentication

**Register a new user:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@domain.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Smith"
}
```

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@domain.com",
  "password": "SecurePassword123"
}
```

### Rooms

**Get all locations:**
```http
GET /api/locations
```

**Search rooms:**
```http
GET /api/rooms/search?city=London&minCapacity=10
```

**Get room details:**
```http
GET /api/rooms/{roomId}
```

### Bookings

**Create booking:**
```http
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "roomId": "room-uuid",
  "bookingDate": "2025-01-15"
}
```

**Get user bookings:**
```http
GET /api/bookings
Authorization: Bearer {token}
```

**Cancel booking:**
```http
PUT /api/bookings/{bookingId}/cancel
Authorization: Bearer {token}
```

### Weather

**Get forecast:**
```http
GET /api/weather/forecast?locationId=loc_london&date=2025-01-15
```

## Dynamic Pricing

The final booking price is calculated using the formula:

```
finalPrice = basePrice + |forecastedTemp - 21| x 0.5
```

Example calculation:
- Base price: 100 GBP
- Forecasted temperature: 31C (10 degrees above optimal 21C)
- Weather adjustment: 10 x 0.5 = 5 GBP
- Final price: 105 GBP

If the Weather Service is unavailable, a 10% fallback surcharge is applied.

## Testing

Run all tests:
```bash
npm test
```

Run tests for a specific service:
```bash
cd services/auth-service && npm test
cd services/booking-service && npm test
cd services/weather-service && pytest --cov=src
```

## Deployment

### CI/CD Pipeline

The GitHub Actions workflow handles:
1. Running tests on all services
2. Building Docker images
3. Deploying to EC2 via SSH

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| AWS_ACCESS_KEY_ID | AWS access key |
| AWS_SECRET_ACCESS_KEY | AWS secret key |
| AWS_SESSION_TOKEN | AWS session token (Learner Lab) |
| EC2_HOST | EC2 instance public IP |
| EC2_SSH_KEY | SSH private key for EC2 |
| SQS_QUEUE_URL | SQS queue URL for notifications |

### AWS Resources

- EC2 t2.micro instance running Docker Compose
- SQS queue for email notification processing
- SNS topic for email delivery
- Lambda function for processing notifications
- CloudWatch for monitoring and logging

## Project Structure

```
conference-room-booking/
├── .github/workflows/      # CI/CD pipeline configuration
├── services/
│   ├── api-gateway/        # nginx configuration
│   ├── auth-service/       # Authentication service
│   ├── rooms-service/      # Room management service
│   ├── booking-service/    # Booking service
│   ├── weather-service/    # Weather forecast service
│   └── email-worker/       # Email notification worker
├── frontend/               # Web interface
├── lambda-email-worker/    # Lambda function for notifications
├── scripts/                # Database initialization
├── docker-compose.yml      # Development configuration
└── docker-compose.prod.yml # Production configuration
```

## Environment Variables

### Auth Service
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | JWT signing secret (min 32 characters) |
| JWT_EXPIRY | Token expiration time (default: 24h) |

### Booking Service
| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB connection string |
| WEATHER_SERVICE_URL | Weather API endpoint |
| ROOMS_SERVICE_URL | Rooms API endpoint |
| SQS_QUEUE_URL | SQS queue for notifications |

## License

This project was developed for educational purposes as part of university coursework.

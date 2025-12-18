# Conference Room Booking System

A cloud-native microservices application for booking conference rooms across UK locations with dynamic weather-based pricing.

## 🎯 Project Overview

This system allows users to book conference rooms in various UK locations (London, Manchester, Edinburgh, Birmingham). The pricing dynamically adjusts based on weather forecasts - the further the temperature deviates from the optimal 21°C, the higher the adjustment applied.

### Key Features

- **User Authentication** - JWT-based authentication with refresh tokens
- **Room Management** - Browse and search conference rooms by location, capacity, amenities
- **Dynamic Pricing** - Weather-based price adjustments
- **Email Notifications** - Booking confirmations and cancellations
- **Full-Day Bookings** - Simple one-room-per-day booking model

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (nginx)                       │
│                         Port 80                                  │
└─────────────┬─────────────┬─────────────┬─────────────┬─────────┘
              │             │             │             │
      ┌───────▼───────┐ ┌───▼───────┐ ┌───▼───────┐ ┌───▼─────────┐
      │ Auth Service  │ │  Rooms    │ │ Booking   │ │  Weather    │
      │   (Node.js)   │ │ Service   │ │ Service   │ │  Service    │
      │   Port 3001   │ │ Port 3002 │ │ Port 3003 │ │  Port 5000  │
      └───────┬───────┘ └─────┬─────┘ └─────┬─────┘ └─────────────┘
              │               │             │
      ┌───────▼───────────────▼─────┐ ┌─────▼─────┐
      │       PostgreSQL            │ │  MongoDB  │
      │   (users, rooms, locations) │ │ (bookings)│
      └─────────────────────────────┘ └───────────┘
```

### Services

| Service | Technology | Port | Database | Description |
|---------|------------|------|----------|-------------|
| API Gateway | nginx | 80 | - | Routes requests to services |
| Auth Service | Node.js/Express | 3001 | PostgreSQL | User authentication & JWT |
| Rooms Service | Node.js/Express | 3002 | PostgreSQL | Location & room management |
| Booking Service | Node.js/Express | 3003 | MongoDB | Booking with dynamic pricing |
| Weather Service | Python/Flask | 5000 | - | Weather forecasts (simulated) |
| Email Worker | Node.js | - | - | SQS-triggered notifications |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for Weather Service)

### Local Development

1. **Clone and start services:**
   ```bash
   cd conference-room-booking
   docker-compose up -d
   ```

2. **Wait for services to initialize** (~30 seconds)

3. **Verify services are running:**
   ```bash
   curl http://localhost/api/auth/health
   curl http://localhost/api/rooms/health
   curl http://localhost/api/bookings/health
   curl http://localhost/api/weather/health
   ```

### API Endpoints

#### Authentication
```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Rooms
```bash
# Get all locations
GET /api/locations

# Search rooms
GET /api/rooms/search?city=London&minCapacity=10

# Get room details
GET /api/rooms/{roomId}
```

#### Bookings
```bash
# Create booking (requires auth token)
POST /api/bookings
Authorization: Bearer {token}
{
  "roomId": "uuid",
  "bookingDate": "2024-06-15"
}

# Get user's bookings
GET /api/bookings
Authorization: Bearer {token}

# Cancel booking
PUT /api/bookings/{bookingId}/cancel
Authorization: Bearer {token}
```

#### Weather
```bash
# Get forecast
GET /api/weather/forecast?locationId=loc_london&date=2024-06-15
```

## 💰 Dynamic Pricing Formula

```
finalPrice = basePrice + |forecastedTemp - 21| × 0.5

Example:
- Base price: £100
- Forecasted temp: 31°C (10° above optimal)
- Weather adjustment: 10 × 0.5 = £5
- Final price: £105
```

If the Weather Service is unavailable, a 10% fallback surcharge is applied.

## 🧪 Running Tests

```bash
# All services
npm test

# Specific service
cd services/auth-service && npm test
cd services/booking-service && npm test

# Weather service (Python)
cd services/weather-service && pytest --cov=src
```

## 📦 Deployment

### CI/CD Pipeline (GitHub Actions)

The pipeline automatically:
1. Runs tests on all services
2. Builds Docker images
3. Pushes to Amazon ECR
4. Deploys to EC2

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_ACCOUNT_ID` | AWS account ID |
| `EC2_HOST` | EC2 public IP/hostname |
| `EC2_SSH_KEY` | SSH private key for EC2 |
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |

### AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS us-east-1                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Route 53  │───▶│     ALB     │───▶│    EC2 (t2.micro)   │ │
│  └─────────────┘    └─────────────┘    │   Docker Compose    │ │
│                                         └─────────┬───────────┘ │
│                                                   │             │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                         VPC                                  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  │ RDS (Postgres)│  │   DocumentDB │   │   SQS Queue    │  │
│  │  └─────────────┘    └─────────────┘    └────────────────┘  │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
conference-room-booking/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions pipeline
├── services/
│   ├── api-gateway/
│   │   └── nginx.conf          # API routing
│   ├── auth-service/           # Authentication
│   ├── rooms-service/          # Room management
│   ├── booking-service/        # Booking with pricing
│   ├── weather-service/        # Python Flask service
│   └── email-worker/           # SQS notification worker
├── scripts/
│   └── init-db.sql             # Database initialization
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production deployment
└── README.md
```

## 🔧 Environment Variables

### Auth Service
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `JWT_SECRET` | - | JWT signing secret (min 32 chars) |
| `REFRESH_TOKEN_SECRET` | - | Refresh token secret |
| `JWT_EXPIRY` | 24h | Token expiration time |

### Booking Service
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | - | MongoDB connection string |
| `WEATHER_SERVICE_URL` | http://weather-service:5000 | Weather API URL |
| `ROOMS_SERVICE_URL` | http://rooms-service:3002 | Rooms API URL |

## 📝 Assignment Notes

This project was developed for DevOps Assignment 2 (December 2025) following the system design from Assignment 1.

### Budget Considerations (50 AWS Credits)

- Using single t2.micro EC2 instance
- RDS db.t3.micro for PostgreSQL
- Minimal use of managed services
- Docker Compose for simplified deployment

### Key Deliverables

1. ✅ Source code in GitHub repository
2. ✅ CI/CD pipeline with GitHub Actions
3. ✅ Docker containerization
4. ✅ Unit tests with coverage
5. ⬜ Video demonstration (5-8 minutes)
6. ⬜ Written report (6 pages)

## 📄 License

This project is for educational purposes as part of university coursework.
#   D e p l o y m e n t   t r i g g e r e d   2 0 2 5 - 1 2 - 1 8   1 5 : 4 7 : 2 9  
 
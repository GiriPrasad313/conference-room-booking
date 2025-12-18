# Conference Room Booking System - Next Steps Guide

## ✅ Completed So Far

| Task | Status |
|------|--------|
| All 5 microservices implemented | ✅ |
| Docker containerization | ✅ |
| API Gateway (nginx) | ✅ |
| 57 unit tests passing | ✅ |
| CI/CD pipeline (GitHub Actions) | ✅ |
| AWS EC2 deployment | ✅ |
| All health endpoints working | ✅ |
| User registration working | ✅ |
| External access via public IP | ✅ |

**Your EC2 Public IP:** `3.236.6.9` (may change after restart)
**API Gateway Port:** `8080`

---

## 🔄 How to Resume Work

### Step 1: Start AWS Learner Lab
1. Go to AWS Academy / Learner Lab
2. Click **Start Lab** (wait for green light)
3. Click **AWS** to open the console

### Step 2: Check EC2 Instance
1. Go to **EC2 Dashboard** → **Instances**
2. If instance is stopped, select it and click **Instance State** → **Start instance**
3. Wait for "Running" status
4. **Note the new Public IP** (it changes after restart!)

### Step 3: Connect via SSH
```bash
# Windows (PowerShell) - adjust the path to your key file
ssh -i "path/to/conference-booking-key.pem" ec2-user@NEW_PUBLIC_IP

# Or use EC2 Instance Connect from AWS Console
```

### Step 4: Start the Services
```bash
cd /home/ec2-user/conference-room-booking/conference-room-booking
git pull origin main
docker-compose up -d

# Wait 30 seconds, then verify
docker-compose ps
```

### Step 5: Test
```bash
curl http://localhost:8080/api/auth/health
```

---

## 📋 Remaining Tasks for Assignment

### 1. Test Complete Booking Flow (15 mins)
Run these commands on EC2 to test the full system:

```bash
# Already done: Register user
# Response included a token - save it!

# Login (if needed)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Get locations
curl http://localhost:8080/api/locations

# Get rooms
curl http://localhost:8080/api/rooms

# Create a booking (replace TOKEN with your actual token)
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"roomId":"ROOM_ID_FROM_ROOMS_LIST","bookingDate":"2025-12-15"}'

# View your bookings
curl http://localhost:8080/api/bookings \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Test Weather-Based Dynamic Pricing (10 mins)
```bash
# Get weather forecast (shows temperature)
curl "http://localhost:8080/api/weather/forecast?locationId=loc_london&date=2025-12-15"

# The booking price calculation:
# finalPrice = basePrice + |temperature - 21| × 0.5
```

### 3. Record Video Demonstration (30 mins)
**Tools:** OBS Studio, Loom, or Windows Game Bar (Win+G)

**Video Script (5-7 minutes):**

1. **Introduction (30 sec)**
   - "This is the Conference Room Booking System with weather-based dynamic pricing"
   - Show architecture diagram

2. **Show Running Services (1 min)**
   - SSH into EC2
   - Run `docker-compose ps` to show all containers
   - Show health endpoints in browser

3. **Demonstrate User Flow (2 min)**
   - Register a new user (use Postman or curl)
   - Login and get token
   - Show token in response

4. **Demonstrate Booking Flow (2 min)**
   - Get locations list
   - Get rooms list
   - Create a booking
   - Show the calculated price with weather factor
   - View bookings list

5. **Show CI/CD Pipeline (1 min)**
   - Go to GitHub → Actions tab
   - Show passing tests
   - Explain the workflow

6. **Conclusion (30 sec)**
   - Recap the microservices architecture
   - Mention AWS deployment

### 4. Write 6-Page Report (2-3 hours)

**Report Structure:**

**Page 1: Title & Introduction**
- Project title, your name, date
- Executive summary
- Project objectives

**Page 2: System Architecture**
- Microservices diagram
- Service descriptions
- Technology stack table

**Page 3: Implementation Details**
- Database design (PostgreSQL for users/rooms, MongoDB for bookings)
- API endpoints table
- Authentication flow (JWT)

**Page 4: Dynamic Pricing Algorithm**
- Weather service integration
- Price calculation formula: `finalPrice = basePrice + |temp - 21| × 0.5`
- Example calculations

**Page 5: Deployment & DevOps**
- AWS architecture (EC2, security groups)
- Docker containerization
- CI/CD pipeline with GitHub Actions
- Cost analysis (within 50 credit budget)

**Page 6: Testing & Conclusion**
- Unit test coverage (57 tests)
- API testing results
- Challenges faced and solutions
- Future improvements

---

## 🔗 Quick Reference

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, get JWT token |
| GET | /api/locations | List all locations |
| GET | /api/rooms | List all rooms |
| GET | /api/rooms/:id | Get room details |
| POST | /api/bookings | Create booking (auth required) |
| GET | /api/bookings | Get user's bookings (auth required) |
| GET | /api/weather/forecast | Get weather forecast |

### Test URLs (Browser)
- Health Check: `http://YOUR_EC2_IP:8080/api/auth/health`
- Locations: `http://YOUR_EC2_IP:8080/api/locations`
- Rooms: `http://YOUR_EC2_IP:8080/api/rooms`
- Weather: `http://YOUR_EC2_IP:8080/api/weather/forecast?locationId=loc_london&date=2025-12-15`

### GitHub Repository
- URL: https://github.com/GiriPrasad313/conference-room-booking
- CI/CD: Check Actions tab for test results

### Important Files
- `docker-compose.yml` - Container orchestration
- `services/*/Dockerfile` - Service containers
- `.github/workflows/ci.yml` - CI/CD pipeline
- `services/api-gateway/nginx.conf` - API routing

---

## ⚠️ AWS Learner Lab Tips

1. **Session Time Limit**: Labs expire after ~4 hours. Save your work!
2. **Credits**: You have 50 credits. t3.micro is ~$0.01/hour - plenty of budget
3. **IP Changes**: Public IP changes when instance restarts. Always check!
4. **Data Persistence**: Docker volumes preserve database data between container restarts
5. **Before Session Ends**: Run `docker-compose down` to cleanly stop services

---

## 🎯 Assignment Checklist

- [x] Microservices implementation (5 services)
- [x] Weather-based dynamic pricing
- [x] RESTful APIs with proper error handling
- [x] JWT authentication
- [x] Database integration (PostgreSQL + MongoDB)
- [x] Docker containerization
- [x] CI/CD pipeline with automated tests
- [x] AWS cloud deployment
- [x] External access via public IP
- [ ] Complete booking flow test
- [ ] Video demonstration (5-7 mins)
- [ ] Written report (6 pages)

**Due Date:** December 21, 2025

Good luck! 🚀

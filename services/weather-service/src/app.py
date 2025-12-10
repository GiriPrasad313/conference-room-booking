"""
Weather Service - Conference Room Booking System
Provides weather forecasts for dynamic pricing calculations.
Uses simulated weather data based on UK climate patterns.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import math
import os

app = Flask(__name__)
CORS(app)

# UK location data with typical climate patterns
UK_LOCATIONS = {
    # London
    'loc_london': {
        'name': 'London',
        'latitude': 51.5074,
        'longitude': -0.1278,
        'avg_temps': {
            1: 5, 2: 6, 3: 8, 4: 11, 5: 14, 6: 17,
            7: 19, 8: 19, 9: 16, 10: 12, 11: 8, 12: 6
        }
    },
    # Manchester
    'loc_manchester': {
        'name': 'Manchester',
        'latitude': 53.4808,
        'longitude': -2.2426,
        'avg_temps': {
            1: 4, 2: 5, 3: 7, 4: 9, 5: 12, 6: 15,
            7: 17, 8: 17, 9: 14, 10: 10, 11: 7, 12: 5
        }
    },
    # Edinburgh
    'loc_edinburgh': {
        'name': 'Edinburgh',
        'latitude': 55.9533,
        'longitude': -3.1883,
        'avg_temps': {
            1: 3, 2: 4, 3: 6, 4: 8, 5: 11, 6: 14,
            7: 15, 8: 15, 9: 13, 10: 9, 11: 6, 12: 4
        }
    },
    # Birmingham
    'loc_birmingham': {
        'name': 'Birmingham',
        'latitude': 52.4862,
        'longitude': -1.8904,
        'avg_temps': {
            1: 4, 2: 5, 3: 7, 4: 10, 5: 13, 6: 16,
            7: 18, 8: 18, 9: 15, 10: 11, 11: 7, 12: 5
        }
    }
}

WEATHER_CONDITIONS = ['sunny', 'partly_cloudy', 'cloudy', 'rainy', 'overcast', 'clear']


def get_simulated_forecast(location_id, date):
    """
    Generate simulated weather forecast based on UK climate patterns.
    Uses month-based average temperatures with random variation.
    """
    location = UK_LOCATIONS.get(location_id)
    
    if not location:
        return None
    
    # Parse date
    try:
        if isinstance(date, str):
            forecast_date = datetime.strptime(date, '%Y-%m-%d')
        else:
            forecast_date = date
    except ValueError:
        return None
    
    month = forecast_date.month
    base_temp = location['avg_temps'].get(month, 12)
    
    # Add random variation (-5 to +5 degrees)
    # Use date as seed for consistent results for the same date
    seed = int(forecast_date.strftime('%Y%m%d')) + hash(location_id)
    random.seed(seed)
    
    variation = random.uniform(-5, 5)
    temperature = round(base_temp + variation, 1)
    
    # Determine weather condition based on temperature and randomness
    if temperature > 18:
        condition_weights = ['sunny', 'partly_cloudy', 'clear']
    elif temperature > 10:
        condition_weights = ['partly_cloudy', 'cloudy', 'overcast']
    else:
        condition_weights = ['cloudy', 'rainy', 'overcast']
    
    condition = random.choice(condition_weights)
    
    # Calculate humidity based on condition
    humidity_base = {'sunny': 45, 'partly_cloudy': 55, 'cloudy': 65, 
                     'rainy': 80, 'overcast': 70, 'clear': 40}
    humidity = humidity_base.get(condition, 60) + random.randint(-10, 10)
    humidity = max(30, min(95, humidity))
    
    return {
        'locationId': location_id,
        'locationName': location['name'],
        'date': forecast_date.strftime('%Y-%m-%d'),
        'temperature': temperature,
        'temperatureUnit': 'celsius',
        'condition': condition,
        'humidity': humidity,
        'coordinates': {
            'latitude': location['latitude'],
            'longitude': location['longitude']
        }
    }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancer and Docker."""
    return jsonify({
        'status': 'healthy',
        'service': 'weather-service',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200


@app.route('/api/weather/health', methods=['GET'])
def api_health_check():
    """Health check endpoint accessible via API gateway."""
    return jsonify({
        'status': 'healthy',
        'service': 'weather-service',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200


@app.route('/api/weather/forecast', methods=['GET'])
def get_forecast():
    """
    Get weather forecast for a specific location and date.
    Query params:
        - locationId: Location identifier (required)
        - date: Forecast date in YYYY-MM-DD format (required)
    """
    location_id = request.args.get('locationId')
    date = request.args.get('date')
    
    if not location_id:
        return jsonify({
            'error': {'message': 'locationId is required'}
        }), 400
    
    if not date:
        return jsonify({
            'error': {'message': 'date is required (YYYY-MM-DD format)'}
        }), 400
    
    # Validate date format
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return jsonify({
            'error': {'message': 'Invalid date format. Use YYYY-MM-DD'}
        }), 400
    
    forecast = get_simulated_forecast(location_id, date)
    
    if not forecast:
        return jsonify({
            'error': {'message': f'Location not found: {location_id}'}
        }), 404
    
    return jsonify(forecast), 200


@app.route('/api/weather/forecast/range', methods=['GET'])
def get_forecast_range():
    """
    Get weather forecast for a location over a date range.
    Query params:
        - locationId: Location identifier (required)
        - startDate: Start date in YYYY-MM-DD format (required)
        - endDate: End date in YYYY-MM-DD format (required)
    """
    location_id = request.args.get('locationId')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    if not all([location_id, start_date, end_date]):
        return jsonify({
            'error': {'message': 'locationId, startDate, and endDate are required'}
        }), 400
    
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({
            'error': {'message': 'Invalid date format. Use YYYY-MM-DD'}
        }), 400
    
    if end < start:
        return jsonify({
            'error': {'message': 'endDate must be after startDate'}
        }), 400
    
    # Limit range to 30 days
    if (end - start).days > 30:
        return jsonify({
            'error': {'message': 'Date range cannot exceed 30 days'}
        }), 400
    
    forecasts = []
    current = start
    while current <= end:
        forecast = get_simulated_forecast(location_id, current)
        if forecast:
            forecasts.append(forecast)
        current += timedelta(days=1)
    
    if not forecasts:
        return jsonify({
            'error': {'message': f'Location not found: {location_id}'}
        }), 404
    
    return jsonify({
        'locationId': location_id,
        'startDate': start_date,
        'endDate': end_date,
        'count': len(forecasts),
        'forecasts': forecasts
    }), 200


@app.route('/api/weather/locations', methods=['GET'])
def get_locations():
    """Get list of supported locations for weather forecasts."""
    locations = [
        {
            'id': loc_id,
            'name': loc_data['name'],
            'coordinates': {
                'latitude': loc_data['latitude'],
                'longitude': loc_data['longitude']
            }
        }
        for loc_id, loc_data in UK_LOCATIONS.items()
    ]
    return jsonify({
        'count': len(locations),
        'locations': locations
    }), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': {'message': 'Resource not found'}
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': {'message': 'Internal server error'}
    }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

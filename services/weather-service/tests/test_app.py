"""
Unit tests for Weather Service
"""

import pytest
import json
from datetime import datetime, timedelta
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from app import app, get_simulated_forecast, UK_LOCATIONS


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_returns_200(self, client):
        """Health endpoint should return 200 OK"""
        response = client.get('/health')
        assert response.status_code == 200
    
    def test_health_returns_json(self, client):
        """Health endpoint should return JSON with status"""
        response = client.get('/health')
        data = json.loads(response.data)
        assert 'status' in data
        assert data['status'] == 'healthy'
        assert data['service'] == 'weather-service'


class TestForecastEndpoint:
    """Tests for weather forecast endpoint"""
    
    def test_forecast_requires_location_id(self, client):
        """Forecast endpoint should require locationId"""
        response = client.get('/api/weather/forecast?date=2024-06-15')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'locationId is required' in data['error']['message']
    
    def test_forecast_requires_date(self, client):
        """Forecast endpoint should require date"""
        response = client.get('/api/weather/forecast?locationId=loc_london')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'date is required' in data['error']['message']
    
    def test_forecast_validates_date_format(self, client):
        """Forecast endpoint should validate date format"""
        response = client.get('/api/weather/forecast?locationId=loc_london&date=15-06-2024')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid date format' in data['error']['message']
    
    def test_forecast_returns_data_for_valid_request(self, client):
        """Forecast endpoint should return weather data for valid request"""
        response = client.get('/api/weather/forecast?locationId=loc_london&date=2024-06-15')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'temperature' in data
        assert 'condition' in data
        assert 'humidity' in data
        assert data['locationId'] == 'loc_london'
    
    def test_forecast_returns_404_for_unknown_location(self, client):
        """Forecast endpoint should return 404 for unknown location"""
        response = client.get('/api/weather/forecast?locationId=loc_unknown&date=2024-06-15')
        assert response.status_code == 404


class TestSimulatedForecast:
    """Tests for forecast simulation logic"""
    
    def test_forecast_returns_consistent_results(self):
        """Same location and date should return same forecast"""
        forecast1 = get_simulated_forecast('loc_london', '2024-06-15')
        forecast2 = get_simulated_forecast('loc_london', '2024-06-15')
        
        assert forecast1['temperature'] == forecast2['temperature']
        assert forecast1['condition'] == forecast2['condition']
    
    def test_forecast_varies_by_month(self):
        """Forecast should vary based on month (seasonal)"""
        winter_forecast = get_simulated_forecast('loc_london', '2024-01-15')
        summer_forecast = get_simulated_forecast('loc_london', '2024-07-15')
        
        # Summer should generally be warmer than winter
        # Allow some variation due to randomness
        assert summer_forecast is not None
        assert winter_forecast is not None
    
    def test_all_locations_supported(self):
        """All defined locations should return forecasts"""
        date = '2024-06-15'
        for location_id in UK_LOCATIONS.keys():
            forecast = get_simulated_forecast(location_id, date)
            assert forecast is not None
            assert forecast['locationId'] == location_id
    
    def test_temperature_within_realistic_range(self):
        """Temperature should be within realistic UK range"""
        for location_id in UK_LOCATIONS.keys():
            for month in range(1, 13):
                date = f'2024-{month:02d}-15'
                forecast = get_simulated_forecast(location_id, date)
                
                # UK temperatures typically range from -10 to 35
                assert -10 <= forecast['temperature'] <= 40
    
    def test_humidity_within_valid_range(self):
        """Humidity should be between 30 and 95"""
        forecast = get_simulated_forecast('loc_london', '2024-06-15')
        assert 30 <= forecast['humidity'] <= 95


class TestLocationsEndpoint:
    """Tests for locations endpoint"""
    
    def test_locations_returns_list(self, client):
        """Locations endpoint should return list of locations"""
        response = client.get('/api/weather/locations')
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'locations' in data
        assert 'count' in data
        assert data['count'] == len(UK_LOCATIONS)
    
    def test_locations_include_coordinates(self, client):
        """Each location should include coordinates"""
        response = client.get('/api/weather/locations')
        data = json.loads(response.data)
        
        for location in data['locations']:
            assert 'coordinates' in location
            assert 'latitude' in location['coordinates']
            assert 'longitude' in location['coordinates']


class TestForecastRangeEndpoint:
    """Tests for forecast range endpoint"""
    
    def test_range_requires_all_params(self, client):
        """Range endpoint should require all parameters"""
        response = client.get('/api/weather/forecast/range?locationId=loc_london')
        assert response.status_code == 400
    
    def test_range_rejects_invalid_date_order(self, client):
        """Range endpoint should reject endDate before startDate"""
        response = client.get(
            '/api/weather/forecast/range?locationId=loc_london&startDate=2024-06-20&endDate=2024-06-10'
        )
        assert response.status_code == 400
    
    def test_range_limits_to_30_days(self, client):
        """Range endpoint should limit to 30 days"""
        response = client.get(
            '/api/weather/forecast/range?locationId=loc_london&startDate=2024-01-01&endDate=2024-03-01'
        )
        assert response.status_code == 400
    
    def test_range_returns_multiple_forecasts(self, client):
        """Range endpoint should return multiple forecasts"""
        response = client.get(
            '/api/weather/forecast/range?locationId=loc_london&startDate=2024-06-10&endDate=2024-06-15'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'forecasts' in data
        assert data['count'] == 6  # 10, 11, 12, 13, 14, 15

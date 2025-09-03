# Waste Management System Upgrade

## Overview
This document outlines the comprehensive upgrades made to the waste management and simulation systems in the National Space Hackathon backend. The system now includes advanced waste prediction, analytics, volume calculations, and enhanced simulation capabilities.

## 🚀 New Features

### 1. Enhanced Waste Identification
- **Multi-status Support**: Now handles `WASTE_EXPIRED`, `WASTE_DEPLETED`, and `BROKEN` items
- **Proactive Management**: Includes items expiring soon (configurable threshold, default 30 days)
- **Rich Information**: Returns category, subcategory, remaining usage, and expiry dates
- **Smart Recommendations**: Suggests consuming expiring items first

#### API Endpoint
```
GET /api/waste/identify?include_expiring_soon=true&expiring_days_threshold=30
```

#### Response Fields
- `item_id`, `name`, `category`, `subcategory`
- `reason` (e.g., "Expires in 15 days", "Out of Uses", "Broken")
- `container_id`, `position`, `expiry_date`
- `current_uses`, `maximum_uses`

### 2. Volume-Based Waste Planning
- **Dual Constraints**: Now considers both weight AND volume limits
- **Smart Selection**: Optimizes waste item selection based on available space
- **Volume Calculation**: Uses geometry utilities for accurate volume computation
- **Flexible Limits**: Optional volume constraints with weight fallback

#### API Endpoint
```
POST /api/waste/return-plan
```

#### Request Fields
- `maxWeight`: Maximum weight in kg
- `maxVolume`: Optional maximum volume in cm³
- `undockingContainerId`, `undockingDate`

### 3. Waste Prediction & Forecasting
- **Expiry Prediction**: Calculates days until items expire
- **Usage Depletion**: Predicts when items will run out based on frequency
- **Resupply Recommendations**: Prioritized by urgency (CRITICAL, HIGH, MEDIUM)
- **Configurable Timeframes**: 1-365 days ahead

#### API Endpoints
```
GET /api/waste/predict?days_ahead=30
GET /api/waste/resupply-forecast?days_ahead=30&category=Food&urgency=CRITICAL
```

#### Prediction Features
- Items expiring within specified timeframe
- Items depleting based on usage frequency
- Smart resupply recommendations
- Category and urgency filtering

### 4. Waste Analytics
- **Historical Analysis**: Waste generation patterns over time
- **Categorization**: Waste by reason, category, and container
- **Trend Analysis**: Daily waste generation trends
- **Top Generators**: Containers with highest waste output

#### API Endpoint
```
GET /api/waste/analytics?days_back=30
```

#### Analytics Data
- Total waste items in period
- Waste breakdown by reason and category
- Daily waste generation trends
- Top waste-generating containers

### 5. Enhanced Simulation System
- **Frequency-Based Usage**: Realistic simulation using `usage_frequency` field
- **Prediction Mode**: See simulation outcomes without running
- **Smart Item Selection**: Automatic selection based on usage patterns
- **Current Time Tracking**: Global simulation time management

#### API Endpoints
```
POST /api/simulate/day
GET /api/simulate/predict?days_ahead=30
GET /api/simulate/current-time
```

#### Simulation Features
- Frequency-based item usage simulation
- Automatic expiry and depletion detection
- Prediction of simulation outcomes
- Global time management

## 🔧 Technical Improvements

### Database Schema Updates
- Uses `maximum_uses` instead of `usage_limit`
- Leverages `usage_frequency` for realistic simulation
- Enhanced logging with detailed context

### Service Architecture
- Modular waste service with specialized functions
- Integrated simulation and waste prediction
- Comprehensive error handling and logging
- Database transaction management

### API Design
- RESTful endpoints with query parameters
- Consistent response formats
- Proper HTTP status codes
- Comprehensive error messages

## 📊 Usage Examples

### 1. Identify Waste with Custom Threshold
```bash
curl "http://localhost:5000/api/waste/identify?expiring_days_threshold=7" \
  -H "X-User-ID: astronaut_001"
```

### 2. Get 30-Day Waste Prediction
```bash
curl "http://localhost:5000/api/waste/predict?days_ahead=30" \
  -H "X-User-ID: astronaut_001"
```

### 3. Category-Specific Resupply Forecast
```bash
curl "http://localhost:5000/api/waste/resupply-forecast?days_ahead=30&category=Food&urgency=CRITICAL" \
  -H "X-User-ID: astronaut_001"
```

### 4. Run 7-Day Simulation
```bash
curl -X POST "http://localhost:5000/api/simulate/day" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: astronaut_001" \
  -d '{
    "num_of_days": 7,
    "user_id": "astronaut_001",
    "items_to_be_used_per_day": [
      {"name": "Food_Packet_001"},
      {"name": "Medical_Supply_001"}
    ]
  }'
```

## 🧪 Testing

### Test Script
Run the comprehensive test script to verify all new APIs:

```bash
cd National_space_hackathon/backend
python test_waste_apis.py
```

### Manual Testing
1. Start the backend server:
   ```bash
   conda activate space_env
   cd National_space_hackathon/backend
   python -m app.main
   ```

2. Test individual endpoints using the examples above

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning**: Predictive analytics for waste patterns
- **Optimization Algorithms**: Better waste selection algorithms
- **Real-time Monitoring**: Live waste generation tracking
- **Integration**: Connect with external supply chain systems

### Potential Improvements
- **Batch Operations**: Process multiple waste items simultaneously
- **Advanced Filtering**: More sophisticated waste categorization
- **Performance Optimization**: Database query optimization
- **Caching**: Cache frequently accessed waste data

## 📝 Notes

### Breaking Changes
- `usage_limit` field renamed to `maximum_uses`
- Updated log entry function signatures
- Enhanced API response structures

### Dependencies
- Requires updated database schema with new fields
- Depends on geometry utilities for volume calculations
- Uses enhanced logging service

### Performance Considerations
- Large datasets may require pagination
- Complex predictions may be resource-intensive
- Consider caching for frequently accessed data

## 🎯 Summary

The waste management system has been significantly enhanced with:
- **Smart waste identification** including expiring items
- **Volume-based planning** for better space utilization
- **Advanced prediction** for proactive management
- **Comprehensive analytics** for operational insights
- **Enhanced simulation** with frequency-based usage

These improvements provide astronauts and mission control with better tools for managing limited resources in space, reducing waste, and optimizing resupply operations.

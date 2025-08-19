# Genre Analytics API Documentation

This document describes the API endpoints for accessing genre analytics and monitoring data in the reading app.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Base URL

All endpoints are prefixed with `/api/plans/`

## Endpoints

### 1. Student Genre History

**GET** `/api/plans/:studentId/genre-history`

Retrieves genre history and analytics for a specific student.

#### Parameters
- `studentId` (path): The student's ID

#### Response Format
```json
{
  "studentId": 123,
  "studentName": "John Doe",
  "genreHistory": [
    {
      "genreCombination": "Futuristic Mystery",
      "usedAt": "2025-08-19T10:30:00.000Z"
    }
  ],
  "analytics": {
    "totalCombinations": 15,
    "uniqueCombinations": 12,
    "varietyScore": 80,
    "mostUsedGenres": [
      {
        "genre": "Futuristic Mystery",
        "count": 3,
        "percentage": 20
      }
    ],
    "leastUsedGenres": [
      {
        "genre": "Whimsical Adventure",
        "count": 1,
        "percentage": 7
      }
    ],
    "recentActivity": {
      "lastUsed": "2025-08-19T10:30:00.000Z",
      "lastGenre": "Futuristic Mystery"
    }
  }
}
```

### 2. Admin Dashboard Analytics

**GET** `/api/plans/admin/genre-analytics`

Retrieves comprehensive analytics across all students and the system.

#### Query Parameters
- `daysBack` (optional): Number of days to look back (default: 30)

#### Response Format
```json
{
  "timestamp": "2025-08-19T10:30:00.000Z",
  "period": "30 days",
  "systemPerformance": {
    "systemMetrics": {
      "totalStudents": 50,
      "totalGenreWords": 40,
      "activeGenreWords": 38,
      "inactiveGenreWords": 2,
      "totalGenreHistory": 150,
      "totalWeeklyPlans": 120,
      "recentPlans": 15,
      "recentHistory": 15
    },
    "recentActivity": {
      "period": "7 days",
      "plansGenerated": 15,
      "genreCombinationsUsed": 15
    },
    "topUsedGenres": [
      {
        "genre": "Futuristic Mystery",
        "usageCount": 25
      }
    ],
    "systemHealth": {
      "genreWordUtilization": 95,
      "averagePlansPerStudent": 2.4,
      "averageHistoryPerStudent": 3.0
    }
  },
  "overallPerformance": {
    "period": "30 days",
    "summary": {
      "totalPlans": 120,
      "totalGenres": 25,
      "totalStudents": 50,
      "averagePlanCompletionRate": 75
    },
    "topGenres": [
      {
        "genre": "Whimsical Adventure",
        "planCompletionRate": 85,
        "totalPlans": 20,
        "uniqueStudents": 15
      }
    ],
    "topStudents": [
      {
        "studentId": 123,
        "studentName": "John Doe",
        "gradeLevel": 5,
        "planCompletionRate": 90,
        "totalPlans": 5,
        "uniqueGenres": 4
      }
    ]
  },
  "summary": {
    "totalStudents": 50,
    "totalPlans": 120,
    "averageCompletionRate": 75,
    "topPerformingGenre": "Whimsical Adventure",
    "topPerformingStudent": "John Doe"
  }
}
```

### 3. Student-Specific Analytics

**GET** `/api/plans/admin/student/:studentId/genre-analytics`

Retrieves detailed analytics for a specific student.

#### Parameters
- `studentId` (path): The student's ID
- `daysBack` (query, optional): Number of days to look back (default: 30)

#### Response Format
```json
{
  "timestamp": "2025-08-19T10:30:00.000Z",
  "student": {
    "id": 123,
    "name": "John Doe",
    "gradeLevel": 5
  },
  "period": "30 days",
  "completionRates": {
    "studentId": 123,
    "period": "30 days",
    "genreStats": {
      "Futuristic Mystery": {
        "totalPlans": 3,
        "completedPlans": 2,
        "totalActivities": 21,
        "completedActivities": 18,
        "planCompletionRate": 67,
        "activityCompletionRate": 86
      }
    },
    "summary": {
      "totalPlans": 5,
      "totalGenres": 3,
      "averagePlanCompletionRate": 80
    }
  },
  "engagementMetrics": {
    "studentId": 123,
    "period": "30 days",
    "genreEngagement": {
      "Futuristic Mystery": {
        "totalPlans": 3,
        "totalActivities": 21,
        "completedActivities": 18,
        "completionRate": 86,
        "activityTypes": {
          "Story Kickoff": 3,
          "Building Connections": 3
        },
        "completionPatterns": {
          "day1": 3,
          "day2": 2,
          "day3": 3
        },
        "mostEngagedDay": {
          "day": "day1",
          "completions": 3
        },
        "mostPopularActivity": {
          "type": "Story Kickoff",
          "count": 3
        },
        "averageCompletionTime": 1.5
      }
    },
    "summary": {
      "totalPlans": 5,
      "totalGenres": 3,
      "averageCompletionRate": 82
    }
  },
  "varietyStats": {
    "totalCombinations": 5,
    "uniqueCombinations": 4,
    "varietyScore": 80
  },
  "summary": {
    "totalPlans": 5,
    "averageCompletionRate": 80,
    "varietyScore": 80,
    "mostEngagedGenre": "Futuristic Mystery"
  }
}
```

### 4. Genre Performance Comparison

**GET** `/api/plans/admin/genre-performance`

Retrieves performance comparison data for all genres.

#### Query Parameters
- `daysBack` (optional): Number of days to look back (default: 30)
- `limit` (optional): Number of top/bottom genres to return (default: 10)

#### Response Format
```json
{
  "timestamp": "2025-08-19T10:30:00.000Z",
  "period": "30 days",
  "topGenres": [
    {
      "genre": "Whimsical Adventure",
      "planCompletionRate": 85,
      "activityCompletionRate": 88,
      "totalPlans": 20,
      "uniqueStudents": 15,
      "gradeLevels": [3, 4, 5, 6]
    }
  ],
  "bottomGenres": [
    {
      "genre": "Dark Horror",
      "planCompletionRate": 45,
      "activityCompletionRate": 52,
      "totalPlans": 8,
      "uniqueStudents": 6,
      "gradeLevels": [7, 8, 9]
    }
  ],
  "summary": {
    "totalGenres": 25,
    "averageCompletionRate": 75,
    "bestPerformingGenre": "Whimsical Adventure",
    "worstPerformingGenre": "Dark Horror"
  }
}
```

## Data Types

### Genre Combination
A string representing a combination of two genre words (e.g., "Futuristic Mystery")

### Completion Rate
A percentage (0-100) representing the completion rate of plans or activities

### Variety Score
A percentage (0-100) representing the diversity of genre combinations used by a student

### System Health Metrics
- **genreWordUtilization**: Percentage of active genre words
- **averagePlansPerStudent**: Average number of plans per student
- **averageHistoryPerStudent**: Average number of genre combinations per student

## Error Responses

All endpoints return standard HTTP error codes:

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Student or resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Usage Examples

### Get student genre history
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/plans/123/genre-history"
```

### Get admin analytics for last 7 days
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/plans/admin/genre-analytics?daysBack=7"
```

### Get student-specific analytics
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/plans/admin/student/123/genre-analytics?daysBack=14"
```

### Get top 5 performing genres
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/plans/admin/genre-performance?limit=5"
```

## Analytics Functions

The analytics system provides several core functions:

### 1. `getGenreCompletionRates(studentId, daysBack)`
Calculates completion rates by genre combination for a specific student.

### 2. `getOverallGenrePerformance(daysBack)`
Analyzes genre performance across all students in the system.

### 3. `getGenreEngagementMetrics(studentId, daysBack)`
Tracks engagement patterns including completion times and activity preferences.

### 4. `getGenreSystemPerformance()`
Provides system-wide metrics and health indicators.

### 5. `getGenreVarietyStats(studentId)`
Calculates variety scores and combination diversity for a student.

## Performance Considerations

- Analytics queries are optimized with database indexes
- Results are cached where appropriate
- Large datasets are paginated automatically
- Time-based queries use efficient date filtering

## Monitoring and Logging

The analytics system includes comprehensive logging:
- Genre selection decisions and outcomes
- Performance metrics and system health
- Error tracking and recovery
- Usage patterns and trends

All analytics operations are logged with structured data for monitoring and debugging.

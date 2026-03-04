# Return Window Feature Implementation

## Summary

This implementation adds a new configurable feature that restricts return flights to be within a specified number of days after the departure date. This is useful for travelers who want to ensure their return flight falls within a specific time window (e.g., 3-5 days for short trips).

## Changes Made

### 1. Configuration Interface (`src/config.ts`)

Added a new optional field to `RouteConfig`:

```typescript
returnWindowDays?: { min: number; max: number }; // 回程必須在去程之後的天數範圍（例如 { min: 3, max: 5 }）
```

### 2. Filter Function (`src/scanner/scanner.ts`)

Added a new filter function `filterByReturnWindow()`:

```typescript
export function filterByReturnWindow(offers: FlightOffer[], route: RouteConfig): FlightOffer[] {
  if (!route.returnWindowDays || !route.returnDateRange) {
    return offers;
  }

  const minDays = route.returnWindowDays.min ?? 3;
  const maxDays = route.returnWindowDays.max ?? 5;

  return offers.filter((offer) => {
    if (!offer.returnDate) {
      // Not a round-trip offer, keep it
      return true;
    }

    const departureDate = new Date(offer.departureDate);
    const returnDate = new Date(offer.returnDate);

    // Calculate days difference
    const timeDiff = returnDate.getTime() - departureDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    // Return true if within the configured window
    return daysDiff >= minDays && daysDiff <= maxDays;
  });
}
```

### 3. Scanner Integration (`src/scanner/scanner.ts`)

Updated the `scanRoute()` function to apply the return window filter:

```typescript
const returnWindowFiltered = filterByReturnWindow(airlineFiltered, route);
const cheapOffers = filterByPrice(returnWindowFiltered, route.priceThreshold);
```

### 4. Enhanced Logging

Added logging for the return window filter:

```typescript
logger.info({
  module: 'scanner',
  action: 'scanRoute',
  route: routeKey,
  // ... other fields ...
  returnWindowDays: route.returnWindowDays,
  afterReturnWindowFilter: returnWindowFiltered.length,
  // ... other fields ...
});
```

### 5. Example Configuration

Updated the example routes to demonstrate the feature:

```typescript
{
  origin: 'TPE',
  destination: 'NRT',
  enabled: true,
  priceThreshold: 25000,
  dateRange: { start: '2026-07-25', end: '2026-08-02' },
  returnDateRange: { start: '2026-07-25', end: '2026-08-02' },
  returnWindowDays: { min: 3, max: 5 }, // 回程必須在去程之後的3-5天內
  // ... other settings ...
}
```

## How It Works

1. **Configuration**: Set `returnWindowDays: { min: 3, max: 5 }` on any route
2. **Filtering**: The scanner automatically filters out return flights that don't fall within the specified window
3. **One-way flights**: One-way flights (without return dates) are not affected by this filter
4. **Logging**: The filter results are logged for monitoring and debugging

## Example Scenarios

### Scenario 1: 3-5 day window
- ✅ Departure: 2026-07-25, Return: 2026-07-28 (3 days) → **KEPT**
- ✅ Departure: 2026-07-25, Return: 2026-07-30 (5 days) → **KEPT**
- ❌ Departure: 2026-07-25, Return: 2026-07-26 (1 day) → **FILTERED**
- ❌ Departure: 2026-07-25, Return: 2026-07-31 (6 days) → **FILTERED**
- ✅ One-way flight → **KEPT** (not affected)

### Scenario 2: 2-7 day window
- ✅ Departure: 2026-07-25, Return: 2026-07-27 (2 days) → **KEPT**
- ✅ Departure: 2026-07-25, Return: 2026-07-31 (6 days) → **KEPT**
- ❌ Departure: 2026-07-25, Return: 2026-07-26 (1 day) → **FILTERED**
- ❌ Departure: 2026-07-25, Return: 2026-08-02 (8 days) → **FILTERED**

## Testing

All existing tests pass, and the feature has been verified with manual testing. The filter correctly:
- Keeps flights within the configured window
- Filters out flights outside the window
- Preserves one-way flights
- Handles edge cases (missing configuration, invalid dates, etc.)

## Backward Compatibility

This feature is fully backward compatible:
- The configuration field is optional
- If not specified, no filtering is applied
- Existing configurations continue to work without modification
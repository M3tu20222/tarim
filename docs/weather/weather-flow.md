# Weather Integration Flow

## Timeline
- T0 (every 3 hours): Cron job `api/cron/weather-sync` is triggered by scheduler.
- T0 + 1s: Cron handler loads field coordinates and active crops, chunks requests, and calls Open-Meteo.
- T0 + 5s: Open-Meteo responses are parsed; hourly snapshots and daily summaries are upserted; agronomic metrics are recomputed.
- T0 + 6s: Weather cache is refreshed; notifications are queued if thresholds are crossed.
- User request time: Dashboard widgets call `/api/weather/fields/[fieldId]` (and `/api/water-consumption/...`) to render the latest state.

## Sequence Diagram
```mermaid
sequenceDiagram
    participant Cron
    participant SyncService
    participant OpenMeteo
    participant Prisma
    participant Cache
    participant UI

    Cron->>SyncService: POST /api/cron/weather-sync
    SyncService->>Prisma: Load fields & crop context
    SyncService->>OpenMeteo: Batched forecast request
    OpenMeteo-->>SyncService: Hourly + daily payloads
    SyncService->>Prisma: Upsert weather snapshots & summaries
    SyncService->>Prisma: Upsert agro metrics (GDD, ETc, balance)
    SyncService->>Cache: Write latest weather & water summaries
    UI->>Prisma: Read field + crop metadata (on demand)
    UI->>Cache: Try cached weather/water payloads
    UI->>Prisma: Fallback queries for fresh data
    UI-->>User: Render weather + irrigation insights
```

## Data Flow Diagram
```mermaid
flowchart TD
    subgraph External
      OM[Open-Meteo API]
    end

    CronJob[Cron Trigger]
    Fetch[Weather Sync Service]
    Parser[Parser & Metric Engine]
    DB[(Postgres via Prisma)]
    Cache[(Weather Cache)]
    API[App Router APIs]
    UI[Dashboard Widgets]

    CronJob --> Fetch --> OM
    OM --> Parser
    Parser --> DB
    Parser --> Cache
    API --> DB
    API --> Cache
    UI --> API
```

## Notes
- Weather snapshots keep hourly observations for the last 24-48 hours; daily summaries and agro metrics persist long term.
- Water consumption heuristics fall back to generic crop coefficients when field crop status is missing.
- Widget clients prefer cached responses but gracefully fall back to live Prisma queries when cache misses occur.

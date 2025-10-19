# Architecture Documentation

**Last Updated:** 2025-10-19
**Version:** 1.0.0

## System Overview

The PocketBase Demo is a modern web application consisting of three main components:

1. **Frontend** - Static HTML/JS/CSS served via Nginx
2. **Express API** - Node.js REST API with validation and security
3. **PocketBase** - Backend database with real-time subscriptions

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        UI[Frontend UI]
    end

    subgraph "Express API Server"
        API[Express API<br/>Port 3030]
        Auth[Auth Middleware]
        Valid[Validation]
        Sanit[Sanitization]
        Rate[Rate Limiter]
    end

    subgraph "PocketBase Backend"
        PB[PocketBase Server<br/>Port 8090]
        DB[(SQLite Database)]
    end

    UI -->|Mutations<br/>POST/PATCH| API
    UI -->|Queries/Realtime<br/>GET/Subscribe| PB

    API --> Auth
    Auth --> Valid
    Valid --> Sanit
    Sanit --> PB

    PB --> DB

    Rate -.->|Rate Limiting| API
```

## Request Flow

### 1. Write Operations (POST/PATCH/DELETE)

```mermaid
sequenceDiagram
    participant Browser
    participant CORS
    participant RateLimit
    participant Auth
    participant Sanitize
    participant Validate
    participant PocketBase
    participant Database

    Browser->>+CORS: POST /api/posts
    Note over Browser: Authorization: Bearer token

    CORS->>+RateLimit: Check origin
    RateLimit->>+Auth: Check rate limit

    Auth->>Auth: Validate token
    Auth->>PocketBase: Verify user
    PocketBase-->>Auth: User data

    Auth->>+Sanitize: Attach req.user
    Sanitize->>Sanitize: Sanitize HTML
    Sanitize->>+Validate: Clean data

    Validate->>Validate: Check schema

    alt Validation passed
        Validate->>+PocketBase: Create record
        PocketBase->>+Database: INSERT
        Database-->>-PocketBase: Record created
        PocketBase-->>-Validate: New record
        Validate-->>Browser: 201 Created
    else Validation failed
        Validate-->>Browser: 422 Validation Error
    end
```

### 2. Read Operations (GET)

```mermaid
sequenceDiagram
    participant Browser
    participant PocketBase
    participant Database

    Browser->>+PocketBase: GET /api/collections/posts/records
    Note over Browser: Direct SDK call

    PocketBase->>+Database: SELECT with expand
    Database-->>-PocketBase: Records with relations

    PocketBase-->>-Browser: JSON response
```

### 3. Real-time Updates (Subscribe)

```mermaid
sequenceDiagram
    participant Browser
    participant WebSocket
    participant PocketBase
    participant Database

    Browser->>+PocketBase: Subscribe('posts')
    PocketBase->>+WebSocket: Open connection

    Note over Browser,Database: Connection established

    loop Real-time updates
        Database->>PocketBase: Record changed
        PocketBase->>WebSocket: Send update
        WebSocket->>Browser: Event notification
        Browser->>Browser: Update UI
    end
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant PocketBase
    participant ExpressAPI

    User->>+Frontend: Enter credentials
    Frontend->>+PocketBase: authWithPassword()
    PocketBase->>PocketBase: Validate credentials
    PocketBase-->>-Frontend: JWT token + user data
    Frontend->>Frontend: Store token

    Note over Frontend: Token stored in PocketBase authStore

    User->>Frontend: Create post
    Frontend->>+ExpressAPI: POST /api/posts
    Note over Frontend,ExpressAPI: Authorization: Bearer <token>

    ExpressAPI->>+PocketBase: Validate token
    PocketBase-->>-ExpressAPI: User data

    ExpressAPI->>ExpressAPI: Attach user to request
    ExpressAPI->>+PocketBase: Create with user.id
    PocketBase-->>-ExpressAPI: Created record
    ExpressAPI-->>-Frontend: 201 Created
```

## Error Handling Flow

```mermaid
graph TD
    A[Request] --> B{Middleware}
    B -->|Error| C[Error Handler]
    B -->|Success| D[Route Handler]
    D -->|Error| C
    D -->|Success| E[Response]

    C --> F{Error Type}
    F -->|ValidationError| G[422 Response]
    F -->|HttpError| H[4xx Response]
    F -->|Unknown| I[500 Response]

    F -.->|5xx| J[Sentry]
    F -.->|All| K[Logs]

    G --> L[JSON Error]
    H --> L
    I --> L
```

## Deployment Architecture

### Docker Compose Stack

```mermaid
graph TB
    subgraph "Docker Network"
        subgraph "Frontend Container"
            NGINX[Nginx<br/>Port 4173]
            Static[Static Files]
        end

        subgraph "API Container"
            Express[Express API<br/>Port 3030]
            Node[Node.js 20]
        end

        subgraph "PocketBase Container"
            PB[PocketBase<br/>Port 8090]
            SQLite[(SQLite DB)]
        end
    end

    Internet[Internet] --> NGINX
    NGINX --> Express
    Express --> PB
    PB --> SQLite

    NGINX -.->|Volume Mount| Static
    PB -.->|Volume Mount| SQLite
```

### Container Details

```mermaid
graph LR
    subgraph "express-api"
        E1[Node.js 20 Alpine]
        E2[Express App]
        E3[Health Check]
    end

    subgraph "pocketbase-demo"
        P1[Alpine Linux]
        P2[PocketBase Binary]
        P3[Health Check]
    end

    subgraph "frontend-demo"
        N1[Nginx Alpine]
        N2[Static Files]
        N3[Health Check]
    end

    E1 --> E2
    E2 --> E3
    P1 --> P2
    P2 --> P3
    N1 --> N2
    N2 --> N3
```

## Data Flow Patterns

### Optimistic UI Updates

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant LocalState
    participant ExpressAPI
    participant PocketBase

    User->>+UI: Click "Post"

    UI->>+LocalState: Add optimistic post
    LocalState-->>-UI: Update immediately
    UI-->>User: Show post (optimistic)

    par Background save
        UI->>+ExpressAPI: POST /api/posts
        ExpressAPI->>ExpressAPI: Validate & sanitize
        ExpressAPI->>+PocketBase: Create record
        PocketBase-->>-ExpressAPI: Real record
        ExpressAPI-->>-UI: Success

        UI->>LocalState: Replace optimistic with real
        LocalState-->>UI: Update with real ID
    end

    alt Save failed
        UI->>LocalState: Remove optimistic post
        UI-->>User: Show error
    end
```

### Hybrid Read Pattern

```mermaid
graph LR
    subgraph "Read Operations"
        A[List Posts] -->|Direct| PB[PocketBase SDK]
        B[Get Post] -->|Direct| PB
        C[Subscribe] -->|WebSocket| PB
    end

    subgraph "Write Operations"
        D[Create Post] -->|Via API| API[Express API]
        E[Update Post] -->|Via API| API
        F[Delete Post] -->|Via API| API
    end

    API --> PB
    PB --> DB[(Database)]
```

## Middleware Stack

```mermaid
graph TB
    Req[Incoming Request] --> Sentry1[Sentry Request Handler]
    Sentry1 --> Timing[Request Timing]
    Timing --> Metrics[Metrics Collection]
    Metrics --> CORS[CORS Headers]
    CORS --> Helmet[Security Headers]
    Helmet --> RateLimit[Rate Limiting]
    RateLimit --> JSON[JSON Body Parser]
    JSON --> Routes[Route Handlers]

    Routes --> Auth[Auth Middleware]
    Auth --> Sanitize[Input Sanitization]
    Sanitize --> Handler[Business Logic]

    Handler --> Resp[Response]
    Handler --> Err[Error]

    Err --> SentryErr[Sentry Error Handler]
    SentryErr --> ErrMiddleware[Error Middleware]
    ErrMiddleware --> ErrResp[Error Response]
```

## Monitoring & Observability

```mermaid
graph TB
    subgraph "Application"
        API[Express API]
        PB[PocketBase]
    end

    subgraph "Metrics"
        Prom[Prometheus<br/>/metrics]
        Grafana[Grafana<br/>Dashboards]
    end

    subgraph "Errors"
        Sentry[Sentry<br/>Error Tracking]
    end

    subgraph "Logs"
        JSON[JSON Logs]
        CloudWatch[Log Aggregation]
    end

    API -->|Metrics| Prom
    API -->|Errors| Sentry
    API -->|Logs| JSON

    PB -->|Health| API

    Prom --> Grafana
    JSON --> CloudWatch
```

## Security Layers

```mermaid
graph TB
    Internet[Internet] -->|HTTPS| Firewall[Firewall/WAF]
    Firewall --> LB[Load Balancer]
    LB --> RateLimit[Rate Limiting]

    RateLimit --> CORS[CORS Check]
    CORS --> Headers[Security Headers]
    Headers --> Auth[Authentication]

    Auth --> Sanitize[Input Sanitization]
    Sanitize --> Validate[Schema Validation]
    Validate --> PB[PocketBase SDK]

    PB --> Prepared[Prepared Statements]
    Prepared --> DB[(Database)]

    style Auth fill:#f9f,stroke:#333
    style Sanitize fill:#f9f,stroke:#333
    style Validate fill:#f9f,stroke:#333
    style Prepared fill:#f9f,stroke:#333
```

## Database Schema (PocketBase Collections)

```mermaid
erDiagram
    users ||--o{ posts : creates
    users ||--o{ comments : writes
    posts ||--o{ comments : has
    posts }o--o{ categories : tagged_with

    users {
        string id PK
        string email
        string displayName
        string bio
        datetime created
        datetime updated
    }

    posts {
        string id PK
        string title
        string slug
        text content
        string status
        string author FK
        boolean featured
        boolean aiGenerated
        int upvotes
        int downvotes
        array upvotedBy
        array downvotedBy
        datetime created
        datetime updated
    }

    categories {
        string id PK
        string name
        string slug
        text description
        datetime created
        datetime updated
    }

    comments {
        string id PK
        string post FK
        string author FK
        text content
        datetime created
        datetime updated
    }
```

## File Structure

```
pocketbase-demo/
├── server/                    # Express API
│   ├── index.mjs             # Main server file
│   ├── config.mjs            # Configuration & validation
│   ├── middleware/           # Express middleware
│   │   ├── auth.mjs          # Authentication
│   │   ├── timing.mjs        # Request timing
│   │   └── metrics.mjs       # Prometheus metrics
│   ├── routes/               # API routes
│   │   ├── posts.mjs         # Posts endpoints
│   │   └── health.mjs        # Health checks
│   ├── services/             # Business logic
│   │   ├── pocketbaseClient.mjs  # PB client
│   │   ├── postService.mjs       # Post operations
│   │   └── errorTracking.mjs     # Sentry integration
│   ├── utils/                # Utilities
│   │   ├── errors.mjs        # Error classes
│   │   ├── logger.mjs        # Logging
│   │   └── sanitize.mjs      # Input sanitization
│   ├── docs/                 # API documentation
│   │   ├── openapi.yml       # OpenAPI spec
│   │   └── swagger.mjs       # Swagger setup
│   └── tests/                # Tests
│       ├── integration.test.mjs
│       ├── error-scenarios.test.mjs
│       └── load/             # Load tests
│
├── public/                   # Frontend
│   ├── index.html           # Main HTML
│   ├── app.js               # Main app logic
│   ├── components/          # UI components
│   ├── services/            # API & data services
│   ├── schemas/             # Zod validation schemas
│   └── utils/               # Utilities
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # This file
│   ├── CONFIGURATION.md     # Config guide
│   ├── SECURITY.md          # Security docs
│   ├── LOAD_TESTING.md      # Load test guide
│   └── GAP_ANALYSIS.md      # Requirements analysis
│
├── pb_data/                 # PocketBase data
├── pb_migrations/           # Database migrations
├── Dockerfile              # API container
├── docker-compose.yml      # Full stack
├── nginx.conf             # Frontend server config
└── env.template           # Environment template
```

## Technology Stack

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **PocketBase SDK** - Real-time subscriptions
- **Fetch API** - HTTP requests to Express API

### Backend API
- **Node.js 20** - Runtime
- **Express 4** - Web framework
- **PocketBase SDK** - Database client
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

### Database
- **PocketBase** - Backend as a service
- **SQLite** - Embedded database
- **Real-time subscriptions** - WebSocket updates

### Security
- **isomorphic-dompurify** - HTML sanitization
- **Zod** - Schema validation
- **JWT** - Authentication tokens

### Monitoring
- **Sentry** - Error tracking
- **Prometheus** - Metrics
- **prom-client** - Metrics collection

### Development
- **Node.js native test runner** - Unit tests
- **k6** - Load testing
- **Docker Compose** - Local development
- **Swagger** - API documentation

## Deployment Options

### 1. Local Development
```bash
npm run start
```
- All services run locally
- Hot reload enabled
- Debug logging

### 2. Docker Compose
```bash
docker-compose up -d
```
- All services containerized
- Production-like environment
- Volume mounts for data persistence

### 3. Production Deployment
- Kubernetes/Docker Swarm
- Separate scaling of services
- Load balancing
- Health checks
- Auto-restart policies

## Performance Characteristics

### Response Times (Baseline)
- Health check: <50ms
- List posts: <200ms
- Get single post: <100ms
- Create post: <300ms
- Update post: <250ms

### Throughput
- Sustained: ~1000 req/s
- Peak: ~2000 req/s (with rate limiting)
- Concurrent connections: ~1000

### Resource Usage
- Express API: ~100MB RAM
- PocketBase: ~50MB RAM
- Frontend: ~10MB (Nginx)

## Scalability

### Horizontal Scaling
- Multiple API instances behind load balancer
- Shared PocketBase instance
- Stateless API design

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Add caching layer

## Related Documentation

- [Security](./SECURITY.md) - Security architecture and measures
- [Configuration](./CONFIGURATION.md) - Environment configuration
- [Load Testing](./LOAD_TESTING.md) - Performance testing
- [GAP Analysis](./GAP_ANALYSIS.md) - Requirements and gaps


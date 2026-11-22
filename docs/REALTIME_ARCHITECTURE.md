# CivicPulse: Realtime Architecture Blueprint (Phase 17)

> **Document Version**: 1.0.0  
> **Status**: Verified & Integrated  
> **Backend Branch**: `backend`  

---

## 1. High-Level Architecture Overview

CivicPulse decouples state mutations from live client notifications. PostgreSQL is the single source of authoritative truth, while Supabase Realtime delivers lightweight, non-blocking refresh signals to authorized web clients.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Route as Next.js Route Handler
    participant DB as PostgreSQL (RPC)
    participant RTService as Realtime Service
    participant SupaRT as Supabase Realtime Server
    actor Citizen as Citizen (Owner)

    Note over Citizen, SupaRT: Citizen subscribes to report:UUID (Private Channel)
    SupaRT->>DB: Check RLS on realtime.messages
    DB-->>SupaRT: Authorized (Owner/Listed)
    SupaRT-->>Citizen: SUBSCRIBED

    Admin->>Route: PATCH /api/reports/:id/status (resolve)
    Route->>DB: civicpulse_transition_report_status()
    Note over DB: Atomically verifies after-image,<br/>updates status & records history
    DB-->>Route: 200 OK (Committed State)

    Route->>RTService: emitRealtimeReportEvent()
    RTService->>SupaRT: broadcast('report_updated', 'resolution_completed')
    SupaRT-->>Citizen: Push broadcast payload

    Note over Citizen: Invalidation Signal Received
    Citizen->>Route: GET /api/reports/:id/evidence
    Route->>DB: Query reports & report_images
    DB-->>Route: Role-projected evidence + signed URLs
    Route-->>Citizen: 200 OK (Fresh Authoritative Data)
```

---

## 2. Decoupled Signaling Pattern vs. Direct Replication

| Architecture Aspect | CivicPulse Private Broadcast (Implemented) | Traditional Postgres Changes (Avoided) |
| :--- | :--- | :--- |
| **Data Leakage Risk** | **Zero**. Carries only event type and report ID. | **High**. Replicates database row columns over WebSocket. |
| **Authorization Model** | Strict channel-level RLS on `realtime.messages`. | Table-level RLS evaluated across all replication streams. |
| **Payload Size** | Minimal ($\sim 120$ bytes JSON). | Variable, potentially large with multiple columns. |
| **Database Transaction Coupling** | **Decoupled**. WebSocket failures never fail DB mutations. | Coupled to Postgres logical replication slot throughput. |
| **State Authority** | Advisory invalidation signal; triggers secure HTTP refetch. | Clients often treat WebSocket row payload as authoritative state. |

---

## 3. Resilience to Realtime Failure

```mermaid
flowchart TD
    A[Administrative Action] --> B[Execute Atomic PostgreSQL RPC]
    B -->|Transaction Fails| C[Rollback & Return Error to Caller]
    B -->|Transaction Succeeds| D[Commit State in Database]
    D --> E[Call emitRealtimeReportEvent]
    E -->|WebSocket Connection OK| F[Broadcast Delivered to Subscribers]
    E -->|WebSocket Connection Fails| G[Log Warning 'realtime.broadcast_failed']
    G --> H[Return Success to Caller]
    F --> H
    H --> I[Database Remains Consistent & Authoritative]
```

If Supabase Realtime or the client's WebSocket connection is unavailable:
1. The database transaction **remains committed**.
2. The route handler returns HTTP 200 to the caller.
3. The client falls back to standard HTTP fetching on next interaction or manual refresh.

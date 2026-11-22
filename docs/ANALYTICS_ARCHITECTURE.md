# CivicPulse – Analytics Architecture

## 1. Architectural Principles
1. **Server-Side Aggregation**: All counting, grouping, duration analysis, percentile interpolation, and backlog calculations execute inside PostgreSQL. No massive datasets are transferred over the network to application memory.
2. **Deterministic Time Handling**:
   - All analytics parameters and internal timestamps are evaluated in UTC.
   - Date ranges represent half-open intervals: $[T_{\text{start}}, T_{\text{end\_exclusive}})$, where $T_{\text{start}}$ is UTC `00:00:00.000Z` of the start date and $T_{\text{end\_exclusive}}$ is UTC `00:00:00.000Z` of `(end + 1 day)`.
   - Prevents missing records created during the final hours of the end day.
3. **Continuous Zero-Filled Series**:
   - Time-series trend queries return every date in the requested range.
   - Intervals without recorded events return zero counts rather than skipping dates, ensuring chart components render unbroken timelines without frontend workarounds.
4. **Division-by-Zero Safety**:
   - Metric formulas (cohort resolution rate, average resolution hours, median resolution hours) safely return `null` when their sample size or denominator is zero.
   - Categorical percentages return `0`.
   - Never returns `NaN` or `Infinity`.

---

## 2. PostgreSQL Stored Procedures & Indexing Strategy

### 2.1 Stored Procedures
- `public.civicpulse_get_analytics_overview(p_start timestamptz, p_end timestamptz)`
  - Single database round-trip that executes conditional counts for all-time totals, period creation/resolution, current snapshot counts, and creation-cohort resolution.
- `public.civicpulse_get_analytics_performance(p_start timestamptz, p_end timestamptz)`
  - Evaluates resolution durations with `EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0`.
  - Computes continuous median via `percentile_cont(0.5) WITHIN GROUP (ORDER BY duration)`.
  - Evaluates aging backlog with `created_at <= (clock_timestamp() - INTERVAL '7 days')`.
- `public.civicpulse_get_department_workload()`
  - Joins the `departments` catalog with active reports (`status IN ('pending', 'in_progress')`) to provide an instantaneous departmental distribution plus unassigned complaint count.

### 2.2 Composite & Partial Indexes
```sql
-- Range scan and status distribution
CREATE INDEX reports_analytics_created_at_idx ON public.reports (created_at DESC, status);

-- Resolution performance range scan
CREATE INDEX reports_analytics_resolved_at_idx ON public.reports (resolved_at DESC, created_at) WHERE resolved_at IS NOT NULL;

-- Active backlog and department workload partial index
CREATE INDEX reports_analytics_active_backlog_idx ON public.reports (department_id, status) WHERE status IN ('pending', 'in_progress');

-- Fast priority dispatch ranking
CREATE INDEX reports_analytics_priority_active_idx ON public.reports (priority_score DESC, created_at ASC) WHERE status IN ('pending', 'in_progress');

-- Category distribution within time ranges
CREATE INDEX reports_analytics_category_created_idx ON public.reports (category, created_at DESC);
```

---

## 3. High-Reliability Dual Execution Path
`src/services/analytics.service.ts` features a dual execution path:
1. **Primary**: High-speed, atomic PostgreSQL Stored Procedure call via `supabase.rpc(...)`.
2. **Fallback**: Supabase Client Query Builder aggregation.
If an RPC is temporarily unmigrated or when executing against testing stubs, the service automatically falls back to standard queries without service disruption.

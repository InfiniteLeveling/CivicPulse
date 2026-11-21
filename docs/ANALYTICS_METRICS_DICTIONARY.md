# CivicPulse – Analytics Metrics Dictionary

This document defines the mathematical formulas, data sources, and operational interpretations for all metrics exposed by the CivicPulse Administrative Analytics Engine.

---

## 1. Overview & Volume Metrics

### 1.1 All-Time Total Reports (`all_time_total_reports`)
- **Formula**: $\text{COUNT}(*)$ across `public.reports`.
- **Source**: `reports` table.
- **Interpretation**: Cumulative count of all complaints ever submitted to CivicPulse since system inception.

### 1.2 Created in Period (`created_in_period`)
- **Formula**: $\text{COUNT}(*)$ where $\text{created\_at} \ge T_{\text{start}} \land \text{created\_at} < T_{\text{end\_exclusive}}$.
- **Interval**: Half-open UTC window $[T_{\text{start}}, T_{\text{end\_exclusive}})$.
- **Interpretation**: Intake rate of civic complaints over the selected time horizon.

### 1.3 Resolved in Period (`resolved_in_period`)
- **Formula**: $\text{COUNT}(*)$ where $\text{resolved\_at} \ge T_{\text{start}} \land \text{resolved\_at} < T_{\text{end\_exclusive}} \land \text{status} = \text{'resolved'}$.
- **Interpretation**: Municipal resolution throughput during the selected time period.

### 1.4 Creation-Cohort Resolution Rate (`creation_cohort_resolution_rate_percent`)
- **Formula**:
  $$\text{CohortRate} = \begin{cases} \text{round}\left(100 \times \frac{\text{reports created in period with status = 'resolved'}}{\text{created\_in\_period}}, 2\right) & \text{if } \text{created\_in\_period} > 0 \\ \text{null} & \text{if } \text{created\_in\_period} = 0 \end{cases}$$
- **Interpretation**: Measures the percentage of complaints created during the specific period that have been brought to completion. Returns `null` when no complaints were created in the period.

---

## 2. Status & Backlog Metrics

### 2.1 Current Pending (`current_pending`)
- **Formula**: $\text{COUNT}(*)$ where $\text{status} = \text{'pending'}$.
- **Interpretation**: Unverified or newly reported complaints awaiting active dispatch or investigation.

### 2.2 Current In Progress (`current_in_progress`)
- **Formula**: $\text{COUNT}(*)$ where $\text{status} = \text{'in\_progress'}$.
- **Interpretation**: Complaints currently assigned to an operational department and undergoing active municipal remediation.

### 2.3 Current Resolved (`current_resolved`)
- **Formula**: $\text{COUNT}(*)$ where $\text{status} = \text{'resolved'}$.
- **Interpretation**: Total complaints currently marked resolved with administrative resolution evidence.

### 2.4 Active Backlog (`current_active_backlog`)
- **Formula**: $\text{current\_pending} + \text{current\_in\_progress}$.
- **Interpretation**: Total pending civic issues currently demanding administrative attention and resolution.

### 2.5 Unassigned Active Complaints (`current_unassigned_active`)
- **Formula**: $\text{COUNT}(*)$ where $\text{status} \in \{\text{'pending'}, \text{'in\_progress'}\} \land \text{department\_id IS NULL}$.
- **Interpretation**: High-risk unassigned complaints requiring immediate administrative routing.

---

## 3. Resolution Performance & Aging

### 3.1 Resolution Duration (Hours)
- **Formula**: $\frac{\text{EXTRACT(EPOCH FROM (resolved\_at - created\_at))}}{3600.0}$.
- **Eligibility**: Reports where $\text{status} = \text{'resolved'} \land \text{resolved\_at} \ge \text{created\_at}$. Invalid negative durations are excluded.

### 3.2 Average Resolution Hours (`average_resolution_hours`)
- **Formula**: Arithmetic mean of valid durations for reports resolved in the period:
  $$\text{round}\left(\frac{1}{N} \sum_{i=1}^N \text{duration}_i, 2\right)$$
- **Interpretation**: Average turnaround time in hours for resolved complaints. Returns `null` if $N = 0$.

### 3.3 Median Resolution Hours (`median_resolution_hours`)
- **Formula**: PostgreSQL continuous 50th percentile:
  $$\text{percentile\_cont}(0.5) \text{ WITHIN GROUP (ORDER BY duration)}$$
- **Interpretation**: Robust median turnaround time unaffected by extreme outliers. Returns `null` if $N = 0$.

### 3.4 Aging Active Backlog > 7 Days (`active_reports_older_than_7_days`)
- **Formula**: $\text{COUNT}(*)$ where $\text{status} \in \{\text{'pending'}, \text{'in\_progress'}\} \land \text{created\_at} \le (\text{clock\_timestamp}() - \text{INTERVAL '7 days'})$.
- **Interpretation**: Critical indicator of stagnant civic issues that have lingered unresolved for more than a week.

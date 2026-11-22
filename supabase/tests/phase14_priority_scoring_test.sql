-- Phase 14: SQL Verification Test Suite for Priority Scoring Engine
-- File: supabase/tests/phase14_priority_scoring_test.sql
begin;

-- Verify Test Cases A through J from Section 61 of Phase 14 Specification

-- Test A: Severity low (15), votes 0 (0), days 0 (0) -> 15
do $$
begin
  assert public.civicpulse_calculate_priority('low', 0, 0) = 15, 'Test A failed: low, 0 votes, 0 days should be 15';
end $$;

-- Test B: Severity medium (30), votes 0 (0), days 0 (0) -> 30
do $$
begin
  assert public.civicpulse_calculate_priority('medium', 0, 0) = 30, 'Test B failed: medium, 0 votes, 0 days should be 30';
end $$;

-- Test C: Severity high (50), votes 4 (12), days 3 (6) -> 68
do $$
begin
  assert public.civicpulse_calculate_priority('high', 4, 3) = 68, 'Test C failed: high, 4 votes, 3 days should be 68';
end $$;

-- Test D: Severity critical (70), votes 7 (20), days 5 (10) -> 100
do $$
begin
  assert public.civicpulse_calculate_priority('critical', 7, 5) = 100, 'Test D failed: critical, 7 votes, 5 days should be 100';
end $$;

-- Test E: Severity low (15), votes 100 (20 capped), days 100 (10 capped) -> 45
do $$
begin
  assert public.civicpulse_calculate_priority('low', 100, 100) = 45, 'Test E failed: low, 100 votes, 100 days should be 45';
end $$;

-- Test F: Severity medium (30), votes 1 (3), days 1 (2) -> 35
do $$
begin
  assert public.civicpulse_calculate_priority('medium', 1, 1) = 35, 'Test F failed: medium, 1 vote, 1 day should be 35';
end $$;

-- Test G: Severity high (50), votes 7 (20), days 5 (10) -> 80
do $$
begin
  assert public.civicpulse_calculate_priority('high', 7, 5) = 80, 'Test G failed: high, 7 votes, 5 days should be 80';
end $$;

-- Test H: Severity critical (70), votes 0 (0), days 0 (0) -> 70
do $$
begin
  assert public.civicpulse_calculate_priority('critical', 0, 0) = 70, 'Test H failed: critical, 0 votes, 0 days should be 70';
end $$;

-- Test I: Severity medium (30), votes 10 (20 capped), days 10 (10 capped) -> 60
do $$
begin
  assert public.civicpulse_calculate_priority('medium', 10, 10) = 60, 'Test I failed: medium, 10 votes, 10 days should be 60';
end $$;

-- Test J: Severity low (15), votes 0 (0), days 5 (10) -> 25
do $$
begin
  assert public.civicpulse_calculate_priority('low', 0, 5) = 25, 'Test J failed: low, 0 votes, 5 days should be 25';
end $$;

-- Test Boundary & Safeguard Conditions
do $$
begin
  -- Vote cap at 20
  assert public.civicpulse_calculate_priority('medium', 6, 0) = 48, '6 votes should add 18 points';
  assert public.civicpulse_calculate_priority('medium', 7, 0) = 50, '7 votes should add 20 points (capped)';
  assert public.civicpulse_calculate_priority('medium', 10, 0) = 50, '10 votes should add 20 points (capped)';

  -- Age cap at 10
  assert public.civicpulse_calculate_priority('low', 0, 4) = 23, '4 days should add 8 points';
  assert public.civicpulse_calculate_priority('low', 0, 5) = 25, '5 days should add 10 points (capped)';
  assert public.civicpulse_calculate_priority('low', 0, 10) = 25, '10 days should add 10 points (capped)';

  -- Total score cap at 100
  assert public.civicpulse_calculate_priority('critical', 20, 20) = 100, 'Score cannot exceed 100';

  -- Clamping negative inputs
  assert public.civicpulse_calculate_priority('low', -5, -2) = 15, 'Negative inputs clamped to 0';

  -- Unknown severity fallback to medium
  assert public.civicpulse_calculate_priority('unknown_severity', 0, 0) = 30, 'Unknown severity falls back to medium (30)';
end $$;

-- Test Days Pending Elapsed Calculation
do $$
declare
  v_base timestamptz := timestamptz '2026-11-20 10:00:00+00';
  v_sub_24h timestamptz := timestamptz '2026-11-21 09:59:59+00';
  v_exact_24h timestamptz := timestamptz '2026-11-21 10:00:00+00';
  v_exact_48h timestamptz := timestamptz '2026-11-22 10:00:00+00';
  v_future timestamptz := timestamptz '2026-11-20 09:00:00+00';
begin
  assert public.civicpulse_calculate_days_pending(v_base, null, v_sub_24h) = 0, '23h59m should be 0 full days';
  assert public.civicpulse_calculate_days_pending(v_base, null, v_exact_24h) = 1, 'Exactly 24h should be 1 full day';
  assert public.civicpulse_calculate_days_pending(v_base, null, v_exact_48h) = 2, 'Exactly 48h should be 2 full days';
  assert public.civicpulse_calculate_days_pending(v_base, null, v_future) = 0, 'Future timestamp should yield 0 days';
end $$;

rollback;

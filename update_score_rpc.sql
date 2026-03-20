-- AND CREATE OR REPLACE FUNCTION get_productivity_score
-- This script creates a function to calculate the productivity score for a user.
-- Run this in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION get_productivity_score(
    p_user_id text,
    p_day_name text,
    p_today_str text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges to bypass RLS for aggregation if needed, or keeping it strictly bound to p_user_id
AS $$
DECLARE
    v_tasks_total int := 0;
    v_tasks_comp int := 0;
    v_tasks_prog int := 0;
    
    v_routines_total int := 0;
    v_routines_comp int := 0;
    v_routines_prog int := 0;
    
    v_goals_total int := 0;
    v_goals_sum_prog int := 0;
    v_goals_prog int := 0;
    
    v_overall_score int := 0;
BEGIN
    -- 1. Tasks Progress
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_tasks_total, v_tasks_comp
    FROM tasks
    WHERE "userId" = p_user_id; -- Match exact case from frontend queries
    
    IF v_tasks_total > 0 THEN
        v_tasks_prog := ROUND((v_tasks_comp::float / v_tasks_total) * 100);
    END IF;

    -- 2. Routines Progress
    -- Note: Assuming 'days' is a text[] or jsonb array.
    -- We use standard array containment or `any()` based on likely schema.
    -- If 'days' is jsonb, use `days @> jsonb_build_array(p_day_name)`
    -- If 'days' is text[], use `p_day_name = ANY(days)`
    SELECT COUNT(*)
    INTO v_routines_total
    FROM routines
    WHERE user_id = p_user_id AND (
        -- Try text array containment
        (p_day_name = ANY(days)) OR 
        -- Fallback if stored as string inside JSONB (unlikely in pure Array mapping but possible)
        (days::text LIKE '%' || p_day_name || '%')
    );
    
    -- Count logs for today
    SELECT COUNT(*)
    INTO v_routines_comp
    FROM routine_logs
    WHERE user_id = p_user_id AND completed_at = p_today_str;
    
    IF v_routines_total > 0 THEN
        v_routines_prog := ROUND((v_routines_comp::float / v_routines_total) * 100);
    END IF;

    -- 3. Goals Progress
    SELECT COUNT(*), SUM(CASE WHEN status = 'completed' THEN 100 ELSE COALESCE(progress, 0) END)
    INTO v_goals_total, v_goals_sum_prog
    FROM goals
    WHERE "userId" = p_user_id;
    
    IF v_goals_total > 0 THEN
        v_goals_prog := ROUND(v_goals_sum_prog::float / v_goals_total);
    END IF;

    -- 4. Overall Score
    -- Weights: Routines (60%), Tasks (20%), Goals (20%)
    v_overall_score := ROUND((v_routines_prog * 0.6) + (v_tasks_prog * 0.2) + (v_goals_prog * 0.2));

    RETURN jsonb_build_object(
        'tasks_progress', v_tasks_prog,
        'routines_progress', v_routines_prog,
        'goals_progress', v_goals_prog,
        'overall_score', v_overall_score,
        'tasks_total', v_tasks_total,
        'tasks_completed', v_tasks_comp,
        'routines_total', v_routines_total,
        'routines_completed', v_routines_comp,
        'goals_total', v_goals_total
    );
END;
$$;

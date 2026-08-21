import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/segmented_tabs.dart';
import '../goals/goal_editor.dart';
import '../goals/goals_screen.dart';
import '../tasks/task_editor.dart';
import '../settings/settings_screen.dart';
import '../shared/section_header.dart';
import '../tasks/tasks_screen.dart';

/// Tasks and Goals under one roof.
///
/// They were two bottom-tab destinations. They are the same thing at two
/// timescales — a goal is where you are going, a task is a step you take this
/// week — and splitting them across the bar cost a slot each while making
/// neither easier to find. One screen, one segmented control.
///
/// The two bodies keep their own scroll position: [IndexedStack] rather than a
/// swapped child, so flicking between them does not reset where you were.
class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(planTabProvider);
    final board = ref.watch(taskBoardProvider).value;
    final goals = ref.watch(goalsProvider).value ?? const [];

    final openTasks = board?.openCount ?? 0;
    final openGoals = goals.where((g) => !g.isComplete).length;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, 0),
          child: Column(
            children: [
              ScreenTitle(
                title: 'Plan',
                trailing: 'TASKS & GOALS',
                actions: [
                  // Create is the header's primary action, matched to the open
                  // tab. It lived at the very bottom of each list, which meant
                  // scrolling past everything you already have to add the next
                  // thing — backwards, since adding is why people open Plan.
                  HeaderAction(
                    icon: Icons.add_rounded,
                    tooltip: index == 0 ? 'New task' : 'New goal',
                    onTap: () => index == 0
                        ? TaskEditor.open(context)
                        : GoalEditor.open(context),
                  ),
                  HeaderAction(
                    icon: Icons.settings_outlined,
                    tooltip: 'Settings',
                    onTap: () => SettingsScreen.open(context),
                  ),
                ],
              ),
              const SizedBox(height: Space.lg),
              SegmentedTabs(
                labels: const ['Tasks', 'Goals'],
                counts: [openTasks, openGoals],
                index: index,
                onSelect: (i) => ref.read(planTabProvider.notifier).state = i,
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        Expanded(
          child: IndexedStack(
            index: index,
            children: const [
              TasksScreen(embedded: true),
              GoalsScreen(embedded: true),
            ],
          ),
        ),
      ],
    );
  }
}

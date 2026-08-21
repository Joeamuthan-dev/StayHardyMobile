import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/providers.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/state_views.dart';
import '../shared/section_header.dart';
import 'habit_editor.dart';

/// Drag habits into the order they should appear in.
///
/// A separate screen rather than drag-on-the-list, for two reasons that both
/// cost real users data if ignored:
///
/// * The Habits screen shows **today's** habits, which is a filtered subset.
///   Dragging row 2 above row 1 there would reorder two habits with three
///   others invisibly between them, and the result would look random.
/// * That list already spends tap on check-off and long-press on edit. Adding
///   long-press-drag would mean every attempt to edit a habit risks moving it
///   instead — and a mis-drag is silent, so nobody would report it.
///
/// The order is saved on every drop. A "save" button on a screen whose entire
/// content is a direct manipulation is a step users skip and then lose.
class HabitOrderScreen extends ConsumerStatefulWidget {
  const HabitOrderScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const HabitOrderScreen()),
    );
  }

  @override
  ConsumerState<HabitOrderScreen> createState() => _HabitOrderScreenState();
}

class _HabitOrderScreenState extends ConsumerState<HabitOrderScreen> {
  /// Loaded once, then owned by this screen.
  ///
  /// Deliberately not a live stream: every write on this screen comes from this
  /// screen, so a stream would push our own saves back and fight the drag
  /// animation mid-gesture.
  List<Habit>? _habits;
  Object? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final habits = await ref.read(habitRepositoryProvider).activeHabits();
      if (mounted) setState(() => _habits = habits);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  void _move(int from, int to) {
    final habits = _habits;
    if (habits == null) return;

    // ReorderableListView reports the destination index in the *pre-removal*
    // list, so dragging downward is off by one without this.
    final target = to > from ? to - 1 : to;
    if (target == from) return;

    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    setState(() {
      final moved = habits.removeAt(from);
      habits.insert(target, moved);
    });
    unawaited(
      ref.read(habitRepositoryProvider).reorder([for (final h in habits) h.id]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final habits = _habits;

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch ((habits, _error)) {
          (_, final Object e) => ErrorView(
              message: "Couldn't load your habits.",
              detail: e.toString(),
              onRetry: () {
                setState(() => _error = null);
                unawaited(_load());
              },
            ),
          (null, _) => const LoadingView(),
          (final List<Habit> list, _) when list.isEmpty => const Padding(
              padding: EdgeInsets.all(Space.lg),
              child: EmptyView(
                title: 'Nothing to arrange',
                message: 'Create a habit first and it will appear here.',
              ),
            ),
          (final List<Habit> list, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                      Space.lg, 0, Space.lg, Space.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ScreenTitle(
                        title: 'Arrange',
                        trailing: '${list.length} HABITS',
                      ),
                      const SizedBox(height: Space.md),
                      Text(
                        'Hold the handle and drag. This is the order habits '
                        'appear everywhere — including the home-screen widget.',
                        style: text.bodySmall?.copyWith(color: t.textMuted),
                      ),
                    ],
                  ),
                ),
                Divider(
                  color: t.border,
                  height: Dimens.hairline,
                  thickness: Dimens.hairline,
                ),
                Expanded(
                  child: ReorderableListView.builder(
                    padding: const EdgeInsets.only(bottom: Space.xxl),
                    buildDefaultDragHandles: false,
                    onReorder: _move,
                    proxyDecorator: _lift,
                    itemCount: list.length,
                    itemBuilder: (context, i) => _OrderRow(
                      key: ValueKey(list[i].id),
                      habit: list[i],
                      index: i,
                    ),
                  ),
                ),
              ],
            ),
        },
      ),
    );
  }

  /// The dragged row while it is in the air.
  ///
  /// Flutter's default wraps the row in an elevated [Material], which paints its
  /// own light surface and a drop shadow — on a near-black ground that reads as
  /// a white card tearing out of the page. Aura lifts with a border and the
  /// app's own surface instead.
  Widget _lift(Widget child, int index, Animation<double> animation) {
    final t = context.aura;
    return Material(
      color: t.surface,
      borderRadius: BorderRadius.circular(Radii.sm),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: t.accent, width: Dimens.hairline),
          borderRadius: BorderRadius.circular(Radii.sm),
        ),
        child: child,
      ),
    );
  }
}

class _OrderRow extends ConsumerWidget {
  const _OrderRow({super.key, required this.habit, required this.index});

  final Habit habit;
  final int index;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final category = HabitCategories.resolve(habit.category);

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: t.border, width: Dimens.hairline),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.sm, Space.md),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              '${index + 1}',
              style: text.labelMedium?.copyWith(color: t.textMuted),
            ),
          ),
          category.glyph(size: Dimens.iconSm, color: category.colorOf(context)),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              habit.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: text.bodyLarge,
            ),
          ),
          // Editing and deleting live here, not on every card in the daily
          // list — arranging, editing and pruning are the same "manage my
          // habits" errand, and the daily page stays about doing.
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => HabitEditor.open(context, habit: habit),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.sm, vertical: Space.md),
              child: Icon(Icons.edit_outlined,
                  size: Dimens.iconMd, color: t.textMuted),
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => _confirmDelete(context, ref),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.sm, vertical: Space.md),
              child: Icon(Icons.delete_outline_rounded,
                  size: Dimens.iconMd, color: t.danger),
            ),
          ),
          // The whole row is not draggable: a full-width drag target on a
          // scrollable list means every attempted scroll starts a drag.
          ReorderableDragStartListener(
            index: index,
            child: Container(
              // Padded to the accessibility floor — the icon alone is 20pt.
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.md, vertical: Space.md),
              child: Icon(Icons.drag_handle_rounded,
                  size: Dimens.iconMd, color: t.textMuted),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text('Delete ${habit.title}?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'The habit and its check-in history are removed. Archiving keeps '
          'the history if you only want it out of the way.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Cancel',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text('Delete', style: TextStyle(color: c.aura.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(habitRepositoryProvider).deleteHabit(habit.id);
  }
}

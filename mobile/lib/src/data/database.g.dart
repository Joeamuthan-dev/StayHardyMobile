// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $HabitsTable extends Habits with TableInfo<$HabitsTable, Habit> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HabitsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(
      minTextLength: 1,
      maxTextLength: 200,
    ),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('General'),
  );
  static const VerificationMeta _habitTypeMeta = const VerificationMeta(
    'habitType',
  );
  @override
  late final GeneratedColumn<int> habitType = GeneratedColumn<int>(
    'habit_type',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _targetValueMeta = const VerificationMeta(
    'targetValue',
  );
  @override
  late final GeneratedColumn<double> targetValue = GeneratedColumn<double>(
    'target_value',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _unitMeta = const VerificationMeta('unit');
  @override
  late final GeneratedColumn<String> unit = GeneratedColumn<String>(
    'unit',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _targetDirectionMeta = const VerificationMeta(
    'targetDirection',
  );
  @override
  late final GeneratedColumn<int> targetDirection = GeneratedColumn<int>(
    'target_direction',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _scheduleKindMeta = const VerificationMeta(
    'scheduleKind',
  );
  @override
  late final GeneratedColumn<int> scheduleKind = GeneratedColumn<int>(
    'schedule_kind',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _weekdayMaskMeta = const VerificationMeta(
    'weekdayMask',
  );
  @override
  late final GeneratedColumn<int> weekdayMask = GeneratedColumn<int>(
    'weekday_mask',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(127),
  );
  static const VerificationMeta _targetPerPeriodMeta = const VerificationMeta(
    'targetPerPeriod',
  );
  @override
  late final GeneratedColumn<int> targetPerPeriod = GeneratedColumn<int>(
    'target_per_period',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _periodKindMeta = const VerificationMeta(
    'periodKind',
  );
  @override
  late final GeneratedColumn<int> periodKind = GeneratedColumn<int>(
    'period_kind',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _intervalDaysMeta = const VerificationMeta(
    'intervalDays',
  );
  @override
  late final GeneratedColumn<int> intervalDays = GeneratedColumn<int>(
    'interval_days',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _anchorDateMeta = const VerificationMeta(
    'anchorDate',
  );
  @override
  late final GeneratedColumn<String> anchorDate = GeneratedColumn<String>(
    'anchor_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _weekStartDowMeta = const VerificationMeta(
    'weekStartDow',
  );
  @override
  late final GeneratedColumn<int> weekStartDow = GeneratedColumn<int>(
    'week_start_dow',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _reminderTimeMeta = const VerificationMeta(
    'reminderTime',
  );
  @override
  late final GeneratedColumn<String> reminderTime = GeneratedColumn<String>(
    'reminder_time',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _reminderDaysMaskMeta = const VerificationMeta(
    'reminderDaysMask',
  );
  @override
  late final GeneratedColumn<int> reminderDaysMask = GeneratedColumn<int>(
    'reminder_days_mask',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _stackIdMeta = const VerificationMeta(
    'stackId',
  );
  @override
  late final GeneratedColumn<String> stackId = GeneratedColumn<String>(
    'stack_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _stackPositionMeta = const VerificationMeta(
    'stackPosition',
  );
  @override
  late final GeneratedColumn<int> stackPosition = GeneratedColumn<int>(
    'stack_position',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _startDateMeta = const VerificationMeta(
    'startDate',
  );
  @override
  late final GeneratedColumn<String> startDate = GeneratedColumn<String>(
    'start_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _endDateMeta = const VerificationMeta(
    'endDate',
  );
  @override
  late final GeneratedColumn<String> endDate = GeneratedColumn<String>(
    'end_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _archivedAtMeta = const VerificationMeta(
    'archivedAt',
  );
  @override
  late final GeneratedColumn<int> archivedAt = GeneratedColumn<int>(
    'archived_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _grandfatheredMeta = const VerificationMeta(
    'grandfathered',
  );
  @override
  late final GeneratedColumn<bool> grandfathered = GeneratedColumn<bool>(
    'grandfathered',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("grandfathered" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    title,
    note,
    category,
    habitType,
    targetValue,
    unit,
    targetDirection,
    scheduleKind,
    weekdayMask,
    targetPerPeriod,
    periodKind,
    intervalDays,
    anchorDate,
    weekStartDow,
    reminderTime,
    reminderDaysMask,
    sortIndex,
    stackId,
    stackPosition,
    startDate,
    endDate,
    archivedAt,
    grandfathered,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'habits';
  @override
  VerificationContext validateIntegrity(
    Insertable<Habit> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    if (data.containsKey('habit_type')) {
      context.handle(
        _habitTypeMeta,
        habitType.isAcceptableOrUnknown(data['habit_type']!, _habitTypeMeta),
      );
    }
    if (data.containsKey('target_value')) {
      context.handle(
        _targetValueMeta,
        targetValue.isAcceptableOrUnknown(
          data['target_value']!,
          _targetValueMeta,
        ),
      );
    }
    if (data.containsKey('unit')) {
      context.handle(
        _unitMeta,
        unit.isAcceptableOrUnknown(data['unit']!, _unitMeta),
      );
    }
    if (data.containsKey('target_direction')) {
      context.handle(
        _targetDirectionMeta,
        targetDirection.isAcceptableOrUnknown(
          data['target_direction']!,
          _targetDirectionMeta,
        ),
      );
    }
    if (data.containsKey('schedule_kind')) {
      context.handle(
        _scheduleKindMeta,
        scheduleKind.isAcceptableOrUnknown(
          data['schedule_kind']!,
          _scheduleKindMeta,
        ),
      );
    }
    if (data.containsKey('weekday_mask')) {
      context.handle(
        _weekdayMaskMeta,
        weekdayMask.isAcceptableOrUnknown(
          data['weekday_mask']!,
          _weekdayMaskMeta,
        ),
      );
    }
    if (data.containsKey('target_per_period')) {
      context.handle(
        _targetPerPeriodMeta,
        targetPerPeriod.isAcceptableOrUnknown(
          data['target_per_period']!,
          _targetPerPeriodMeta,
        ),
      );
    }
    if (data.containsKey('period_kind')) {
      context.handle(
        _periodKindMeta,
        periodKind.isAcceptableOrUnknown(data['period_kind']!, _periodKindMeta),
      );
    }
    if (data.containsKey('interval_days')) {
      context.handle(
        _intervalDaysMeta,
        intervalDays.isAcceptableOrUnknown(
          data['interval_days']!,
          _intervalDaysMeta,
        ),
      );
    }
    if (data.containsKey('anchor_date')) {
      context.handle(
        _anchorDateMeta,
        anchorDate.isAcceptableOrUnknown(data['anchor_date']!, _anchorDateMeta),
      );
    }
    if (data.containsKey('week_start_dow')) {
      context.handle(
        _weekStartDowMeta,
        weekStartDow.isAcceptableOrUnknown(
          data['week_start_dow']!,
          _weekStartDowMeta,
        ),
      );
    }
    if (data.containsKey('reminder_time')) {
      context.handle(
        _reminderTimeMeta,
        reminderTime.isAcceptableOrUnknown(
          data['reminder_time']!,
          _reminderTimeMeta,
        ),
      );
    }
    if (data.containsKey('reminder_days_mask')) {
      context.handle(
        _reminderDaysMaskMeta,
        reminderDaysMask.isAcceptableOrUnknown(
          data['reminder_days_mask']!,
          _reminderDaysMaskMeta,
        ),
      );
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    if (data.containsKey('stack_id')) {
      context.handle(
        _stackIdMeta,
        stackId.isAcceptableOrUnknown(data['stack_id']!, _stackIdMeta),
      );
    }
    if (data.containsKey('stack_position')) {
      context.handle(
        _stackPositionMeta,
        stackPosition.isAcceptableOrUnknown(
          data['stack_position']!,
          _stackPositionMeta,
        ),
      );
    }
    if (data.containsKey('start_date')) {
      context.handle(
        _startDateMeta,
        startDate.isAcceptableOrUnknown(data['start_date']!, _startDateMeta),
      );
    } else if (isInserting) {
      context.missing(_startDateMeta);
    }
    if (data.containsKey('end_date')) {
      context.handle(
        _endDateMeta,
        endDate.isAcceptableOrUnknown(data['end_date']!, _endDateMeta),
      );
    }
    if (data.containsKey('archived_at')) {
      context.handle(
        _archivedAtMeta,
        archivedAt.isAcceptableOrUnknown(data['archived_at']!, _archivedAtMeta),
      );
    }
    if (data.containsKey('grandfathered')) {
      context.handle(
        _grandfatheredMeta,
        grandfathered.isAcceptableOrUnknown(
          data['grandfathered']!,
          _grandfatheredMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Habit map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Habit(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      )!,
      habitType: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}habit_type'],
      )!,
      targetValue: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}target_value'],
      ),
      unit: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unit'],
      ),
      targetDirection: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}target_direction'],
      )!,
      scheduleKind: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}schedule_kind'],
      )!,
      weekdayMask: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}weekday_mask'],
      )!,
      targetPerPeriod: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}target_per_period'],
      ),
      periodKind: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}period_kind'],
      )!,
      intervalDays: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}interval_days'],
      ),
      anchorDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}anchor_date'],
      ),
      weekStartDow: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}week_start_dow'],
      )!,
      reminderTime: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reminder_time'],
      ),
      reminderDaysMask: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}reminder_days_mask'],
      )!,
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
      stackId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}stack_id'],
      ),
      stackPosition: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}stack_position'],
      ),
      startDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}start_date'],
      )!,
      endDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}end_date'],
      ),
      archivedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}archived_at'],
      ),
      grandfathered: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}grandfathered'],
      )!,
    );
  }

  @override
  $HabitsTable createAlias(String alias) {
    return $HabitsTable(attachedDatabase, alias);
  }
}

class Habit extends DataClass implements Insertable<Habit> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String title;
  final String? note;

  /// Category *name* only. Color and icon are resolved at render time from
  /// HabitCategories — the legacy schema denormalized them onto each row, which
  /// meant a palette change never reached existing habits.
  final String category;

  /// [HabitType]
  final int habitType;

  /// Target per occurrence for quantity/duration habits. Null for binary.
  final double? targetValue;
  final String? unit;

  /// 0 = at least [targetValue] (build), 1 = at most (limit / negative habits).
  final int targetDirection;

  /// [ScheduleKind]
  final int scheduleKind;

  /// 7-bit mask, bit 0 = Sunday .. bit 6 = Saturday. 127 = every day.
  ///
  /// Replaces the legacy `days text[]`. A bitmask makes "which habits are due
  /// today" an indexed SQL predicate instead of per-row filtering in Dart,
  /// which is what makes the old Stats page slow.
  final int weekdayMask;

  /// For [ScheduleKind.timesPerPeriod].
  final int? targetPerPeriod;

  /// [PeriodKind]
  final int periodKind;

  /// For [ScheduleKind.everyNDays].
  final int? intervalDays;
  final String? anchorDate;

  /// Snapshotted at creation so changing the global week-start preference does
  /// not silently redraw historical week boundaries and rewrite streaks.
  final int weekStartDow;
  final String? reminderTime;
  final int reminderDaysMask;
  final int sortIndex;

  /// Routine Player membership. A habit belongs to at most one stack.
  final String? stackId;
  final int? stackPosition;
  final String startDate;
  final String? endDate;

  /// Archived habits keep their history and streak records but leave the
  /// active list. Preferred over deletion everywhere in the UI.
  final int? archivedAt;

  /// Exempt from the 7-habit free cap.
  ///
  /// Set during migration for habits beyond the 7th on a free account. Existing
  /// users keep everything they already had; nothing is ever hidden or locked.
  /// The flag is never re-granted once the habit is deleted.
  final bool grandfathered;
  const Habit({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.title,
    this.note,
    required this.category,
    required this.habitType,
    this.targetValue,
    this.unit,
    required this.targetDirection,
    required this.scheduleKind,
    required this.weekdayMask,
    this.targetPerPeriod,
    required this.periodKind,
    this.intervalDays,
    this.anchorDate,
    required this.weekStartDow,
    this.reminderTime,
    required this.reminderDaysMask,
    required this.sortIndex,
    this.stackId,
    this.stackPosition,
    required this.startDate,
    this.endDate,
    this.archivedAt,
    required this.grandfathered,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['title'] = Variable<String>(title);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['category'] = Variable<String>(category);
    map['habit_type'] = Variable<int>(habitType);
    if (!nullToAbsent || targetValue != null) {
      map['target_value'] = Variable<double>(targetValue);
    }
    if (!nullToAbsent || unit != null) {
      map['unit'] = Variable<String>(unit);
    }
    map['target_direction'] = Variable<int>(targetDirection);
    map['schedule_kind'] = Variable<int>(scheduleKind);
    map['weekday_mask'] = Variable<int>(weekdayMask);
    if (!nullToAbsent || targetPerPeriod != null) {
      map['target_per_period'] = Variable<int>(targetPerPeriod);
    }
    map['period_kind'] = Variable<int>(periodKind);
    if (!nullToAbsent || intervalDays != null) {
      map['interval_days'] = Variable<int>(intervalDays);
    }
    if (!nullToAbsent || anchorDate != null) {
      map['anchor_date'] = Variable<String>(anchorDate);
    }
    map['week_start_dow'] = Variable<int>(weekStartDow);
    if (!nullToAbsent || reminderTime != null) {
      map['reminder_time'] = Variable<String>(reminderTime);
    }
    map['reminder_days_mask'] = Variable<int>(reminderDaysMask);
    map['sort_index'] = Variable<int>(sortIndex);
    if (!nullToAbsent || stackId != null) {
      map['stack_id'] = Variable<String>(stackId);
    }
    if (!nullToAbsent || stackPosition != null) {
      map['stack_position'] = Variable<int>(stackPosition);
    }
    map['start_date'] = Variable<String>(startDate);
    if (!nullToAbsent || endDate != null) {
      map['end_date'] = Variable<String>(endDate);
    }
    if (!nullToAbsent || archivedAt != null) {
      map['archived_at'] = Variable<int>(archivedAt);
    }
    map['grandfathered'] = Variable<bool>(grandfathered);
    return map;
  }

  HabitsCompanion toCompanion(bool nullToAbsent) {
    return HabitsCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      title: Value(title),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      category: Value(category),
      habitType: Value(habitType),
      targetValue: targetValue == null && nullToAbsent
          ? const Value.absent()
          : Value(targetValue),
      unit: unit == null && nullToAbsent ? const Value.absent() : Value(unit),
      targetDirection: Value(targetDirection),
      scheduleKind: Value(scheduleKind),
      weekdayMask: Value(weekdayMask),
      targetPerPeriod: targetPerPeriod == null && nullToAbsent
          ? const Value.absent()
          : Value(targetPerPeriod),
      periodKind: Value(periodKind),
      intervalDays: intervalDays == null && nullToAbsent
          ? const Value.absent()
          : Value(intervalDays),
      anchorDate: anchorDate == null && nullToAbsent
          ? const Value.absent()
          : Value(anchorDate),
      weekStartDow: Value(weekStartDow),
      reminderTime: reminderTime == null && nullToAbsent
          ? const Value.absent()
          : Value(reminderTime),
      reminderDaysMask: Value(reminderDaysMask),
      sortIndex: Value(sortIndex),
      stackId: stackId == null && nullToAbsent
          ? const Value.absent()
          : Value(stackId),
      stackPosition: stackPosition == null && nullToAbsent
          ? const Value.absent()
          : Value(stackPosition),
      startDate: Value(startDate),
      endDate: endDate == null && nullToAbsent
          ? const Value.absent()
          : Value(endDate),
      archivedAt: archivedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(archivedAt),
      grandfathered: Value(grandfathered),
    );
  }

  factory Habit.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Habit(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      title: serializer.fromJson<String>(json['title']),
      note: serializer.fromJson<String?>(json['note']),
      category: serializer.fromJson<String>(json['category']),
      habitType: serializer.fromJson<int>(json['habitType']),
      targetValue: serializer.fromJson<double?>(json['targetValue']),
      unit: serializer.fromJson<String?>(json['unit']),
      targetDirection: serializer.fromJson<int>(json['targetDirection']),
      scheduleKind: serializer.fromJson<int>(json['scheduleKind']),
      weekdayMask: serializer.fromJson<int>(json['weekdayMask']),
      targetPerPeriod: serializer.fromJson<int?>(json['targetPerPeriod']),
      periodKind: serializer.fromJson<int>(json['periodKind']),
      intervalDays: serializer.fromJson<int?>(json['intervalDays']),
      anchorDate: serializer.fromJson<String?>(json['anchorDate']),
      weekStartDow: serializer.fromJson<int>(json['weekStartDow']),
      reminderTime: serializer.fromJson<String?>(json['reminderTime']),
      reminderDaysMask: serializer.fromJson<int>(json['reminderDaysMask']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
      stackId: serializer.fromJson<String?>(json['stackId']),
      stackPosition: serializer.fromJson<int?>(json['stackPosition']),
      startDate: serializer.fromJson<String>(json['startDate']),
      endDate: serializer.fromJson<String?>(json['endDate']),
      archivedAt: serializer.fromJson<int?>(json['archivedAt']),
      grandfathered: serializer.fromJson<bool>(json['grandfathered']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'title': serializer.toJson<String>(title),
      'note': serializer.toJson<String?>(note),
      'category': serializer.toJson<String>(category),
      'habitType': serializer.toJson<int>(habitType),
      'targetValue': serializer.toJson<double?>(targetValue),
      'unit': serializer.toJson<String?>(unit),
      'targetDirection': serializer.toJson<int>(targetDirection),
      'scheduleKind': serializer.toJson<int>(scheduleKind),
      'weekdayMask': serializer.toJson<int>(weekdayMask),
      'targetPerPeriod': serializer.toJson<int?>(targetPerPeriod),
      'periodKind': serializer.toJson<int>(periodKind),
      'intervalDays': serializer.toJson<int?>(intervalDays),
      'anchorDate': serializer.toJson<String?>(anchorDate),
      'weekStartDow': serializer.toJson<int>(weekStartDow),
      'reminderTime': serializer.toJson<String?>(reminderTime),
      'reminderDaysMask': serializer.toJson<int>(reminderDaysMask),
      'sortIndex': serializer.toJson<int>(sortIndex),
      'stackId': serializer.toJson<String?>(stackId),
      'stackPosition': serializer.toJson<int?>(stackPosition),
      'startDate': serializer.toJson<String>(startDate),
      'endDate': serializer.toJson<String?>(endDate),
      'archivedAt': serializer.toJson<int?>(archivedAt),
      'grandfathered': serializer.toJson<bool>(grandfathered),
    };
  }

  Habit copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? title,
    Value<String?> note = const Value.absent(),
    String? category,
    int? habitType,
    Value<double?> targetValue = const Value.absent(),
    Value<String?> unit = const Value.absent(),
    int? targetDirection,
    int? scheduleKind,
    int? weekdayMask,
    Value<int?> targetPerPeriod = const Value.absent(),
    int? periodKind,
    Value<int?> intervalDays = const Value.absent(),
    Value<String?> anchorDate = const Value.absent(),
    int? weekStartDow,
    Value<String?> reminderTime = const Value.absent(),
    int? reminderDaysMask,
    int? sortIndex,
    Value<String?> stackId = const Value.absent(),
    Value<int?> stackPosition = const Value.absent(),
    String? startDate,
    Value<String?> endDate = const Value.absent(),
    Value<int?> archivedAt = const Value.absent(),
    bool? grandfathered,
  }) => Habit(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    title: title ?? this.title,
    note: note.present ? note.value : this.note,
    category: category ?? this.category,
    habitType: habitType ?? this.habitType,
    targetValue: targetValue.present ? targetValue.value : this.targetValue,
    unit: unit.present ? unit.value : this.unit,
    targetDirection: targetDirection ?? this.targetDirection,
    scheduleKind: scheduleKind ?? this.scheduleKind,
    weekdayMask: weekdayMask ?? this.weekdayMask,
    targetPerPeriod: targetPerPeriod.present
        ? targetPerPeriod.value
        : this.targetPerPeriod,
    periodKind: periodKind ?? this.periodKind,
    intervalDays: intervalDays.present ? intervalDays.value : this.intervalDays,
    anchorDate: anchorDate.present ? anchorDate.value : this.anchorDate,
    weekStartDow: weekStartDow ?? this.weekStartDow,
    reminderTime: reminderTime.present ? reminderTime.value : this.reminderTime,
    reminderDaysMask: reminderDaysMask ?? this.reminderDaysMask,
    sortIndex: sortIndex ?? this.sortIndex,
    stackId: stackId.present ? stackId.value : this.stackId,
    stackPosition: stackPosition.present
        ? stackPosition.value
        : this.stackPosition,
    startDate: startDate ?? this.startDate,
    endDate: endDate.present ? endDate.value : this.endDate,
    archivedAt: archivedAt.present ? archivedAt.value : this.archivedAt,
    grandfathered: grandfathered ?? this.grandfathered,
  );
  Habit copyWithCompanion(HabitsCompanion data) {
    return Habit(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      title: data.title.present ? data.title.value : this.title,
      note: data.note.present ? data.note.value : this.note,
      category: data.category.present ? data.category.value : this.category,
      habitType: data.habitType.present ? data.habitType.value : this.habitType,
      targetValue: data.targetValue.present
          ? data.targetValue.value
          : this.targetValue,
      unit: data.unit.present ? data.unit.value : this.unit,
      targetDirection: data.targetDirection.present
          ? data.targetDirection.value
          : this.targetDirection,
      scheduleKind: data.scheduleKind.present
          ? data.scheduleKind.value
          : this.scheduleKind,
      weekdayMask: data.weekdayMask.present
          ? data.weekdayMask.value
          : this.weekdayMask,
      targetPerPeriod: data.targetPerPeriod.present
          ? data.targetPerPeriod.value
          : this.targetPerPeriod,
      periodKind: data.periodKind.present
          ? data.periodKind.value
          : this.periodKind,
      intervalDays: data.intervalDays.present
          ? data.intervalDays.value
          : this.intervalDays,
      anchorDate: data.anchorDate.present
          ? data.anchorDate.value
          : this.anchorDate,
      weekStartDow: data.weekStartDow.present
          ? data.weekStartDow.value
          : this.weekStartDow,
      reminderTime: data.reminderTime.present
          ? data.reminderTime.value
          : this.reminderTime,
      reminderDaysMask: data.reminderDaysMask.present
          ? data.reminderDaysMask.value
          : this.reminderDaysMask,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
      stackId: data.stackId.present ? data.stackId.value : this.stackId,
      stackPosition: data.stackPosition.present
          ? data.stackPosition.value
          : this.stackPosition,
      startDate: data.startDate.present ? data.startDate.value : this.startDate,
      endDate: data.endDate.present ? data.endDate.value : this.endDate,
      archivedAt: data.archivedAt.present
          ? data.archivedAt.value
          : this.archivedAt,
      grandfathered: data.grandfathered.present
          ? data.grandfathered.value
          : this.grandfathered,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Habit(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('title: $title, ')
          ..write('note: $note, ')
          ..write('category: $category, ')
          ..write('habitType: $habitType, ')
          ..write('targetValue: $targetValue, ')
          ..write('unit: $unit, ')
          ..write('targetDirection: $targetDirection, ')
          ..write('scheduleKind: $scheduleKind, ')
          ..write('weekdayMask: $weekdayMask, ')
          ..write('targetPerPeriod: $targetPerPeriod, ')
          ..write('periodKind: $periodKind, ')
          ..write('intervalDays: $intervalDays, ')
          ..write('anchorDate: $anchorDate, ')
          ..write('weekStartDow: $weekStartDow, ')
          ..write('reminderTime: $reminderTime, ')
          ..write('reminderDaysMask: $reminderDaysMask, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('stackId: $stackId, ')
          ..write('stackPosition: $stackPosition, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('archivedAt: $archivedAt, ')
          ..write('grandfathered: $grandfathered')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    title,
    note,
    category,
    habitType,
    targetValue,
    unit,
    targetDirection,
    scheduleKind,
    weekdayMask,
    targetPerPeriod,
    periodKind,
    intervalDays,
    anchorDate,
    weekStartDow,
    reminderTime,
    reminderDaysMask,
    sortIndex,
    stackId,
    stackPosition,
    startDate,
    endDate,
    archivedAt,
    grandfathered,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Habit &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.title == this.title &&
          other.note == this.note &&
          other.category == this.category &&
          other.habitType == this.habitType &&
          other.targetValue == this.targetValue &&
          other.unit == this.unit &&
          other.targetDirection == this.targetDirection &&
          other.scheduleKind == this.scheduleKind &&
          other.weekdayMask == this.weekdayMask &&
          other.targetPerPeriod == this.targetPerPeriod &&
          other.periodKind == this.periodKind &&
          other.intervalDays == this.intervalDays &&
          other.anchorDate == this.anchorDate &&
          other.weekStartDow == this.weekStartDow &&
          other.reminderTime == this.reminderTime &&
          other.reminderDaysMask == this.reminderDaysMask &&
          other.sortIndex == this.sortIndex &&
          other.stackId == this.stackId &&
          other.stackPosition == this.stackPosition &&
          other.startDate == this.startDate &&
          other.endDate == this.endDate &&
          other.archivedAt == this.archivedAt &&
          other.grandfathered == this.grandfathered);
}

class HabitsCompanion extends UpdateCompanion<Habit> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> title;
  final Value<String?> note;
  final Value<String> category;
  final Value<int> habitType;
  final Value<double?> targetValue;
  final Value<String?> unit;
  final Value<int> targetDirection;
  final Value<int> scheduleKind;
  final Value<int> weekdayMask;
  final Value<int?> targetPerPeriod;
  final Value<int> periodKind;
  final Value<int?> intervalDays;
  final Value<String?> anchorDate;
  final Value<int> weekStartDow;
  final Value<String?> reminderTime;
  final Value<int> reminderDaysMask;
  final Value<int> sortIndex;
  final Value<String?> stackId;
  final Value<int?> stackPosition;
  final Value<String> startDate;
  final Value<String?> endDate;
  final Value<int?> archivedAt;
  final Value<bool> grandfathered;
  final Value<int> rowid;
  const HabitsCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.title = const Value.absent(),
    this.note = const Value.absent(),
    this.category = const Value.absent(),
    this.habitType = const Value.absent(),
    this.targetValue = const Value.absent(),
    this.unit = const Value.absent(),
    this.targetDirection = const Value.absent(),
    this.scheduleKind = const Value.absent(),
    this.weekdayMask = const Value.absent(),
    this.targetPerPeriod = const Value.absent(),
    this.periodKind = const Value.absent(),
    this.intervalDays = const Value.absent(),
    this.anchorDate = const Value.absent(),
    this.weekStartDow = const Value.absent(),
    this.reminderTime = const Value.absent(),
    this.reminderDaysMask = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.stackId = const Value.absent(),
    this.stackPosition = const Value.absent(),
    this.startDate = const Value.absent(),
    this.endDate = const Value.absent(),
    this.archivedAt = const Value.absent(),
    this.grandfathered = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HabitsCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String title,
    this.note = const Value.absent(),
    this.category = const Value.absent(),
    this.habitType = const Value.absent(),
    this.targetValue = const Value.absent(),
    this.unit = const Value.absent(),
    this.targetDirection = const Value.absent(),
    this.scheduleKind = const Value.absent(),
    this.weekdayMask = const Value.absent(),
    this.targetPerPeriod = const Value.absent(),
    this.periodKind = const Value.absent(),
    this.intervalDays = const Value.absent(),
    this.anchorDate = const Value.absent(),
    this.weekStartDow = const Value.absent(),
    this.reminderTime = const Value.absent(),
    this.reminderDaysMask = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.stackId = const Value.absent(),
    this.stackPosition = const Value.absent(),
    required String startDate,
    this.endDate = const Value.absent(),
    this.archivedAt = const Value.absent(),
    this.grandfathered = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       title = Value(title),
       startDate = Value(startDate);
  static Insertable<Habit> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? title,
    Expression<String>? note,
    Expression<String>? category,
    Expression<int>? habitType,
    Expression<double>? targetValue,
    Expression<String>? unit,
    Expression<int>? targetDirection,
    Expression<int>? scheduleKind,
    Expression<int>? weekdayMask,
    Expression<int>? targetPerPeriod,
    Expression<int>? periodKind,
    Expression<int>? intervalDays,
    Expression<String>? anchorDate,
    Expression<int>? weekStartDow,
    Expression<String>? reminderTime,
    Expression<int>? reminderDaysMask,
    Expression<int>? sortIndex,
    Expression<String>? stackId,
    Expression<int>? stackPosition,
    Expression<String>? startDate,
    Expression<String>? endDate,
    Expression<int>? archivedAt,
    Expression<bool>? grandfathered,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (title != null) 'title': title,
      if (note != null) 'note': note,
      if (category != null) 'category': category,
      if (habitType != null) 'habit_type': habitType,
      if (targetValue != null) 'target_value': targetValue,
      if (unit != null) 'unit': unit,
      if (targetDirection != null) 'target_direction': targetDirection,
      if (scheduleKind != null) 'schedule_kind': scheduleKind,
      if (weekdayMask != null) 'weekday_mask': weekdayMask,
      if (targetPerPeriod != null) 'target_per_period': targetPerPeriod,
      if (periodKind != null) 'period_kind': periodKind,
      if (intervalDays != null) 'interval_days': intervalDays,
      if (anchorDate != null) 'anchor_date': anchorDate,
      if (weekStartDow != null) 'week_start_dow': weekStartDow,
      if (reminderTime != null) 'reminder_time': reminderTime,
      if (reminderDaysMask != null) 'reminder_days_mask': reminderDaysMask,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (stackId != null) 'stack_id': stackId,
      if (stackPosition != null) 'stack_position': stackPosition,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      if (archivedAt != null) 'archived_at': archivedAt,
      if (grandfathered != null) 'grandfathered': grandfathered,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HabitsCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? title,
    Value<String?>? note,
    Value<String>? category,
    Value<int>? habitType,
    Value<double?>? targetValue,
    Value<String?>? unit,
    Value<int>? targetDirection,
    Value<int>? scheduleKind,
    Value<int>? weekdayMask,
    Value<int?>? targetPerPeriod,
    Value<int>? periodKind,
    Value<int?>? intervalDays,
    Value<String?>? anchorDate,
    Value<int>? weekStartDow,
    Value<String?>? reminderTime,
    Value<int>? reminderDaysMask,
    Value<int>? sortIndex,
    Value<String?>? stackId,
    Value<int?>? stackPosition,
    Value<String>? startDate,
    Value<String?>? endDate,
    Value<int?>? archivedAt,
    Value<bool>? grandfathered,
    Value<int>? rowid,
  }) {
    return HabitsCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      title: title ?? this.title,
      note: note ?? this.note,
      category: category ?? this.category,
      habitType: habitType ?? this.habitType,
      targetValue: targetValue ?? this.targetValue,
      unit: unit ?? this.unit,
      targetDirection: targetDirection ?? this.targetDirection,
      scheduleKind: scheduleKind ?? this.scheduleKind,
      weekdayMask: weekdayMask ?? this.weekdayMask,
      targetPerPeriod: targetPerPeriod ?? this.targetPerPeriod,
      periodKind: periodKind ?? this.periodKind,
      intervalDays: intervalDays ?? this.intervalDays,
      anchorDate: anchorDate ?? this.anchorDate,
      weekStartDow: weekStartDow ?? this.weekStartDow,
      reminderTime: reminderTime ?? this.reminderTime,
      reminderDaysMask: reminderDaysMask ?? this.reminderDaysMask,
      sortIndex: sortIndex ?? this.sortIndex,
      stackId: stackId ?? this.stackId,
      stackPosition: stackPosition ?? this.stackPosition,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      archivedAt: archivedAt ?? this.archivedAt,
      grandfathered: grandfathered ?? this.grandfathered,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (habitType.present) {
      map['habit_type'] = Variable<int>(habitType.value);
    }
    if (targetValue.present) {
      map['target_value'] = Variable<double>(targetValue.value);
    }
    if (unit.present) {
      map['unit'] = Variable<String>(unit.value);
    }
    if (targetDirection.present) {
      map['target_direction'] = Variable<int>(targetDirection.value);
    }
    if (scheduleKind.present) {
      map['schedule_kind'] = Variable<int>(scheduleKind.value);
    }
    if (weekdayMask.present) {
      map['weekday_mask'] = Variable<int>(weekdayMask.value);
    }
    if (targetPerPeriod.present) {
      map['target_per_period'] = Variable<int>(targetPerPeriod.value);
    }
    if (periodKind.present) {
      map['period_kind'] = Variable<int>(periodKind.value);
    }
    if (intervalDays.present) {
      map['interval_days'] = Variable<int>(intervalDays.value);
    }
    if (anchorDate.present) {
      map['anchor_date'] = Variable<String>(anchorDate.value);
    }
    if (weekStartDow.present) {
      map['week_start_dow'] = Variable<int>(weekStartDow.value);
    }
    if (reminderTime.present) {
      map['reminder_time'] = Variable<String>(reminderTime.value);
    }
    if (reminderDaysMask.present) {
      map['reminder_days_mask'] = Variable<int>(reminderDaysMask.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (stackId.present) {
      map['stack_id'] = Variable<String>(stackId.value);
    }
    if (stackPosition.present) {
      map['stack_position'] = Variable<int>(stackPosition.value);
    }
    if (startDate.present) {
      map['start_date'] = Variable<String>(startDate.value);
    }
    if (endDate.present) {
      map['end_date'] = Variable<String>(endDate.value);
    }
    if (archivedAt.present) {
      map['archived_at'] = Variable<int>(archivedAt.value);
    }
    if (grandfathered.present) {
      map['grandfathered'] = Variable<bool>(grandfathered.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HabitsCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('title: $title, ')
          ..write('note: $note, ')
          ..write('category: $category, ')
          ..write('habitType: $habitType, ')
          ..write('targetValue: $targetValue, ')
          ..write('unit: $unit, ')
          ..write('targetDirection: $targetDirection, ')
          ..write('scheduleKind: $scheduleKind, ')
          ..write('weekdayMask: $weekdayMask, ')
          ..write('targetPerPeriod: $targetPerPeriod, ')
          ..write('periodKind: $periodKind, ')
          ..write('intervalDays: $intervalDays, ')
          ..write('anchorDate: $anchorDate, ')
          ..write('weekStartDow: $weekStartDow, ')
          ..write('reminderTime: $reminderTime, ')
          ..write('reminderDaysMask: $reminderDaysMask, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('stackId: $stackId, ')
          ..write('stackPosition: $stackPosition, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('archivedAt: $archivedAt, ')
          ..write('grandfathered: $grandfathered, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $HabitLogsTable extends HabitLogs
    with TableInfo<$HabitLogsTable, HabitLog> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HabitLogsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _habitIdMeta = const VerificationMeta(
    'habitId',
  );
  @override
  late final GeneratedColumn<String> habitId = GeneratedColumn<String>(
    'habit_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES habits (id)',
    ),
  );
  static const VerificationMeta _logDateMeta = const VerificationMeta(
    'logDate',
  );
  @override
  late final GeneratedColumn<String> logDate = GeneratedColumn<String>(
    'log_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<double> value = GeneratedColumn<double>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<int> status = GeneratedColumn<int>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _moodMeta = const VerificationMeta('mood');
  @override
  late final GeneratedColumn<int> mood = GeneratedColumn<int>(
    'mood',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _loggedAtMeta = const VerificationMeta(
    'loggedAt',
  );
  @override
  late final GeneratedColumn<int> loggedAt = GeneratedColumn<int>(
    'logged_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sourceMeta = const VerificationMeta('source');
  @override
  late final GeneratedColumn<int> source = GeneratedColumn<int>(
    'source',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _backfilledMeta = const VerificationMeta(
    'backfilled',
  );
  @override
  late final GeneratedColumn<bool> backfilled = GeneratedColumn<bool>(
    'backfilled',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("backfilled" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    habitId,
    logDate,
    value,
    status,
    note,
    mood,
    loggedAt,
    source,
    backfilled,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'habit_logs';
  @override
  VerificationContext validateIntegrity(
    Insertable<HabitLog> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('habit_id')) {
      context.handle(
        _habitIdMeta,
        habitId.isAcceptableOrUnknown(data['habit_id']!, _habitIdMeta),
      );
    } else if (isInserting) {
      context.missing(_habitIdMeta);
    }
    if (data.containsKey('log_date')) {
      context.handle(
        _logDateMeta,
        logDate.isAcceptableOrUnknown(data['log_date']!, _logDateMeta),
      );
    } else if (isInserting) {
      context.missing(_logDateMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('mood')) {
      context.handle(
        _moodMeta,
        mood.isAcceptableOrUnknown(data['mood']!, _moodMeta),
      );
    }
    if (data.containsKey('logged_at')) {
      context.handle(
        _loggedAtMeta,
        loggedAt.isAcceptableOrUnknown(data['logged_at']!, _loggedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_loggedAtMeta);
    }
    if (data.containsKey('source')) {
      context.handle(
        _sourceMeta,
        source.isAcceptableOrUnknown(data['source']!, _sourceMeta),
      );
    }
    if (data.containsKey('backfilled')) {
      context.handle(
        _backfilledMeta,
        backfilled.isAcceptableOrUnknown(data['backfilled']!, _backfilledMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  HabitLog map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HabitLog(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      habitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}habit_id'],
      )!,
      logDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}log_date'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}value'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}status'],
      )!,
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      mood: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}mood'],
      ),
      loggedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}logged_at'],
      )!,
      source: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}source'],
      )!,
      backfilled: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}backfilled'],
      )!,
    );
  }

  @override
  $HabitLogsTable createAlias(String alias) {
    return $HabitLogsTable(attachedDatabase, alias);
  }
}

class HabitLog extends DataClass implements Insertable<HabitLog> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String habitId;

  /// Local civil date, 'YYYY-MM-DD'.
  final String logDate;

  /// 1 for binary; the count or minutes otherwise. Quantity habits mutate this
  /// rather than appending rows, so a habit-day stays a single indexed lookup.
  final double value;

  /// [LogStatus]
  final int status;
  final String? note;
  final int? mood;

  /// When the tap actually happened, epoch millis.
  final int loggedAt;

  /// [LogSource]
  final int source;

  /// Logged into an already-closed period. Allowed (people forget), but
  /// flagged — and rejected outright for paid-challenge habits.
  final bool backfilled;
  const HabitLog({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.habitId,
    required this.logDate,
    required this.value,
    required this.status,
    this.note,
    this.mood,
    required this.loggedAt,
    required this.source,
    required this.backfilled,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['habit_id'] = Variable<String>(habitId);
    map['log_date'] = Variable<String>(logDate);
    map['value'] = Variable<double>(value);
    map['status'] = Variable<int>(status);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    if (!nullToAbsent || mood != null) {
      map['mood'] = Variable<int>(mood);
    }
    map['logged_at'] = Variable<int>(loggedAt);
    map['source'] = Variable<int>(source);
    map['backfilled'] = Variable<bool>(backfilled);
    return map;
  }

  HabitLogsCompanion toCompanion(bool nullToAbsent) {
    return HabitLogsCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      habitId: Value(habitId),
      logDate: Value(logDate),
      value: Value(value),
      status: Value(status),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      mood: mood == null && nullToAbsent ? const Value.absent() : Value(mood),
      loggedAt: Value(loggedAt),
      source: Value(source),
      backfilled: Value(backfilled),
    );
  }

  factory HabitLog.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HabitLog(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      habitId: serializer.fromJson<String>(json['habitId']),
      logDate: serializer.fromJson<String>(json['logDate']),
      value: serializer.fromJson<double>(json['value']),
      status: serializer.fromJson<int>(json['status']),
      note: serializer.fromJson<String?>(json['note']),
      mood: serializer.fromJson<int?>(json['mood']),
      loggedAt: serializer.fromJson<int>(json['loggedAt']),
      source: serializer.fromJson<int>(json['source']),
      backfilled: serializer.fromJson<bool>(json['backfilled']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'habitId': serializer.toJson<String>(habitId),
      'logDate': serializer.toJson<String>(logDate),
      'value': serializer.toJson<double>(value),
      'status': serializer.toJson<int>(status),
      'note': serializer.toJson<String?>(note),
      'mood': serializer.toJson<int?>(mood),
      'loggedAt': serializer.toJson<int>(loggedAt),
      'source': serializer.toJson<int>(source),
      'backfilled': serializer.toJson<bool>(backfilled),
    };
  }

  HabitLog copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? habitId,
    String? logDate,
    double? value,
    int? status,
    Value<String?> note = const Value.absent(),
    Value<int?> mood = const Value.absent(),
    int? loggedAt,
    int? source,
    bool? backfilled,
  }) => HabitLog(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    habitId: habitId ?? this.habitId,
    logDate: logDate ?? this.logDate,
    value: value ?? this.value,
    status: status ?? this.status,
    note: note.present ? note.value : this.note,
    mood: mood.present ? mood.value : this.mood,
    loggedAt: loggedAt ?? this.loggedAt,
    source: source ?? this.source,
    backfilled: backfilled ?? this.backfilled,
  );
  HabitLog copyWithCompanion(HabitLogsCompanion data) {
    return HabitLog(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      habitId: data.habitId.present ? data.habitId.value : this.habitId,
      logDate: data.logDate.present ? data.logDate.value : this.logDate,
      value: data.value.present ? data.value.value : this.value,
      status: data.status.present ? data.status.value : this.status,
      note: data.note.present ? data.note.value : this.note,
      mood: data.mood.present ? data.mood.value : this.mood,
      loggedAt: data.loggedAt.present ? data.loggedAt.value : this.loggedAt,
      source: data.source.present ? data.source.value : this.source,
      backfilled: data.backfilled.present
          ? data.backfilled.value
          : this.backfilled,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HabitLog(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('habitId: $habitId, ')
          ..write('logDate: $logDate, ')
          ..write('value: $value, ')
          ..write('status: $status, ')
          ..write('note: $note, ')
          ..write('mood: $mood, ')
          ..write('loggedAt: $loggedAt, ')
          ..write('source: $source, ')
          ..write('backfilled: $backfilled')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    habitId,
    logDate,
    value,
    status,
    note,
    mood,
    loggedAt,
    source,
    backfilled,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HabitLog &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.habitId == this.habitId &&
          other.logDate == this.logDate &&
          other.value == this.value &&
          other.status == this.status &&
          other.note == this.note &&
          other.mood == this.mood &&
          other.loggedAt == this.loggedAt &&
          other.source == this.source &&
          other.backfilled == this.backfilled);
}

class HabitLogsCompanion extends UpdateCompanion<HabitLog> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> habitId;
  final Value<String> logDate;
  final Value<double> value;
  final Value<int> status;
  final Value<String?> note;
  final Value<int?> mood;
  final Value<int> loggedAt;
  final Value<int> source;
  final Value<bool> backfilled;
  final Value<int> rowid;
  const HabitLogsCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.habitId = const Value.absent(),
    this.logDate = const Value.absent(),
    this.value = const Value.absent(),
    this.status = const Value.absent(),
    this.note = const Value.absent(),
    this.mood = const Value.absent(),
    this.loggedAt = const Value.absent(),
    this.source = const Value.absent(),
    this.backfilled = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HabitLogsCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String habitId,
    required String logDate,
    this.value = const Value.absent(),
    this.status = const Value.absent(),
    this.note = const Value.absent(),
    this.mood = const Value.absent(),
    required int loggedAt,
    this.source = const Value.absent(),
    this.backfilled = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       habitId = Value(habitId),
       logDate = Value(logDate),
       loggedAt = Value(loggedAt);
  static Insertable<HabitLog> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? habitId,
    Expression<String>? logDate,
    Expression<double>? value,
    Expression<int>? status,
    Expression<String>? note,
    Expression<int>? mood,
    Expression<int>? loggedAt,
    Expression<int>? source,
    Expression<bool>? backfilled,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (habitId != null) 'habit_id': habitId,
      if (logDate != null) 'log_date': logDate,
      if (value != null) 'value': value,
      if (status != null) 'status': status,
      if (note != null) 'note': note,
      if (mood != null) 'mood': mood,
      if (loggedAt != null) 'logged_at': loggedAt,
      if (source != null) 'source': source,
      if (backfilled != null) 'backfilled': backfilled,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HabitLogsCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? habitId,
    Value<String>? logDate,
    Value<double>? value,
    Value<int>? status,
    Value<String?>? note,
    Value<int?>? mood,
    Value<int>? loggedAt,
    Value<int>? source,
    Value<bool>? backfilled,
    Value<int>? rowid,
  }) {
    return HabitLogsCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      habitId: habitId ?? this.habitId,
      logDate: logDate ?? this.logDate,
      value: value ?? this.value,
      status: status ?? this.status,
      note: note ?? this.note,
      mood: mood ?? this.mood,
      loggedAt: loggedAt ?? this.loggedAt,
      source: source ?? this.source,
      backfilled: backfilled ?? this.backfilled,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (habitId.present) {
      map['habit_id'] = Variable<String>(habitId.value);
    }
    if (logDate.present) {
      map['log_date'] = Variable<String>(logDate.value);
    }
    if (value.present) {
      map['value'] = Variable<double>(value.value);
    }
    if (status.present) {
      map['status'] = Variable<int>(status.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (mood.present) {
      map['mood'] = Variable<int>(mood.value);
    }
    if (loggedAt.present) {
      map['logged_at'] = Variable<int>(loggedAt.value);
    }
    if (source.present) {
      map['source'] = Variable<int>(source.value);
    }
    if (backfilled.present) {
      map['backfilled'] = Variable<bool>(backfilled.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HabitLogsCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('habitId: $habitId, ')
          ..write('logDate: $logDate, ')
          ..write('value: $value, ')
          ..write('status: $status, ')
          ..write('note: $note, ')
          ..write('mood: $mood, ')
          ..write('loggedAt: $loggedAt, ')
          ..write('source: $source, ')
          ..write('backfilled: $backfilled, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $HabitFreezesTable extends HabitFreezes
    with TableInfo<$HabitFreezesTable, HabitFreeze> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HabitFreezesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _habitIdMeta = const VerificationMeta(
    'habitId',
  );
  @override
  late final GeneratedColumn<String> habitId = GeneratedColumn<String>(
    'habit_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES habits (id)',
    ),
  );
  static const VerificationMeta _freezeDateMeta = const VerificationMeta(
    'freezeDate',
  );
  @override
  late final GeneratedColumn<String> freezeDate = GeneratedColumn<String>(
    'freeze_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sourceMeta = const VerificationMeta('source');
  @override
  late final GeneratedColumn<int> source = GeneratedColumn<int>(
    'source',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    habitId,
    freezeDate,
    source,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'habit_freezes';
  @override
  VerificationContext validateIntegrity(
    Insertable<HabitFreeze> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('habit_id')) {
      context.handle(
        _habitIdMeta,
        habitId.isAcceptableOrUnknown(data['habit_id']!, _habitIdMeta),
      );
    } else if (isInserting) {
      context.missing(_habitIdMeta);
    }
    if (data.containsKey('freeze_date')) {
      context.handle(
        _freezeDateMeta,
        freezeDate.isAcceptableOrUnknown(data['freeze_date']!, _freezeDateMeta),
      );
    } else if (isInserting) {
      context.missing(_freezeDateMeta);
    }
    if (data.containsKey('source')) {
      context.handle(
        _sourceMeta,
        source.isAcceptableOrUnknown(data['source']!, _sourceMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  HabitFreeze map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HabitFreeze(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      habitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}habit_id'],
      )!,
      freezeDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}freeze_date'],
      )!,
      source: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}source'],
      )!,
    );
  }

  @override
  $HabitFreezesTable createAlias(String alias) {
    return $HabitFreezesTable(attachedDatabase, alias);
  }
}

class HabitFreeze extends DataClass implements Insertable<HabitFreeze> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String habitId;
  final String freezeDate;

  /// [FreezeSource]
  final int source;
  const HabitFreeze({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.habitId,
    required this.freezeDate,
    required this.source,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['habit_id'] = Variable<String>(habitId);
    map['freeze_date'] = Variable<String>(freezeDate);
    map['source'] = Variable<int>(source);
    return map;
  }

  HabitFreezesCompanion toCompanion(bool nullToAbsent) {
    return HabitFreezesCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      habitId: Value(habitId),
      freezeDate: Value(freezeDate),
      source: Value(source),
    );
  }

  factory HabitFreeze.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HabitFreeze(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      habitId: serializer.fromJson<String>(json['habitId']),
      freezeDate: serializer.fromJson<String>(json['freezeDate']),
      source: serializer.fromJson<int>(json['source']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'habitId': serializer.toJson<String>(habitId),
      'freezeDate': serializer.toJson<String>(freezeDate),
      'source': serializer.toJson<int>(source),
    };
  }

  HabitFreeze copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? habitId,
    String? freezeDate,
    int? source,
  }) => HabitFreeze(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    habitId: habitId ?? this.habitId,
    freezeDate: freezeDate ?? this.freezeDate,
    source: source ?? this.source,
  );
  HabitFreeze copyWithCompanion(HabitFreezesCompanion data) {
    return HabitFreeze(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      habitId: data.habitId.present ? data.habitId.value : this.habitId,
      freezeDate: data.freezeDate.present
          ? data.freezeDate.value
          : this.freezeDate,
      source: data.source.present ? data.source.value : this.source,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HabitFreeze(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('habitId: $habitId, ')
          ..write('freezeDate: $freezeDate, ')
          ..write('source: $source')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    habitId,
    freezeDate,
    source,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HabitFreeze &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.habitId == this.habitId &&
          other.freezeDate == this.freezeDate &&
          other.source == this.source);
}

class HabitFreezesCompanion extends UpdateCompanion<HabitFreeze> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> habitId;
  final Value<String> freezeDate;
  final Value<int> source;
  final Value<int> rowid;
  const HabitFreezesCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.habitId = const Value.absent(),
    this.freezeDate = const Value.absent(),
    this.source = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HabitFreezesCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String habitId,
    required String freezeDate,
    this.source = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       habitId = Value(habitId),
       freezeDate = Value(freezeDate);
  static Insertable<HabitFreeze> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? habitId,
    Expression<String>? freezeDate,
    Expression<int>? source,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (habitId != null) 'habit_id': habitId,
      if (freezeDate != null) 'freeze_date': freezeDate,
      if (source != null) 'source': source,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HabitFreezesCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? habitId,
    Value<String>? freezeDate,
    Value<int>? source,
    Value<int>? rowid,
  }) {
    return HabitFreezesCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      habitId: habitId ?? this.habitId,
      freezeDate: freezeDate ?? this.freezeDate,
      source: source ?? this.source,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (habitId.present) {
      map['habit_id'] = Variable<String>(habitId.value);
    }
    if (freezeDate.present) {
      map['freeze_date'] = Variable<String>(freezeDate.value);
    }
    if (source.present) {
      map['source'] = Variable<int>(source.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HabitFreezesCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('habitId: $habitId, ')
          ..write('freezeDate: $freezeDate, ')
          ..write('source: $source, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $HabitPeriodStatusTable extends HabitPeriodStatus
    with TableInfo<$HabitPeriodStatusTable, HabitPeriod> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HabitPeriodStatusTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _habitIdMeta = const VerificationMeta(
    'habitId',
  );
  @override
  late final GeneratedColumn<String> habitId = GeneratedColumn<String>(
    'habit_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES habits (id)',
    ),
  );
  static const VerificationMeta _periodKeyMeta = const VerificationMeta(
    'periodKey',
  );
  @override
  late final GeneratedColumn<String> periodKey = GeneratedColumn<String>(
    'period_key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _periodStartMeta = const VerificationMeta(
    'periodStart',
  );
  @override
  late final GeneratedColumn<String> periodStart = GeneratedColumn<String>(
    'period_start',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _periodEndMeta = const VerificationMeta(
    'periodEnd',
  );
  @override
  late final GeneratedColumn<String> periodEnd = GeneratedColumn<String>(
    'period_end',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _requiredMeta = const VerificationMeta(
    'required',
  );
  @override
  late final GeneratedColumn<int> required = GeneratedColumn<int>(
    'required',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _completedMeta = const VerificationMeta(
    'completed',
  );
  @override
  late final GeneratedColumn<int> completed = GeneratedColumn<int>(
    'completed',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _frozenMeta = const VerificationMeta('frozen');
  @override
  late final GeneratedColumn<bool> frozen = GeneratedColumn<bool>(
    'frozen',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("frozen" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _satisfiedMeta = const VerificationMeta(
    'satisfied',
  );
  @override
  late final GeneratedColumn<bool> satisfied = GeneratedColumn<bool>(
    'satisfied',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("satisfied" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _sealedMeta = const VerificationMeta('sealed');
  @override
  late final GeneratedColumn<bool> sealed = GeneratedColumn<bool>(
    'sealed',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("sealed" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    habitId,
    periodKey,
    periodStart,
    periodEnd,
    required,
    completed,
    frozen,
    satisfied,
    sealed,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'habit_period_status';
  @override
  VerificationContext validateIntegrity(
    Insertable<HabitPeriod> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('habit_id')) {
      context.handle(
        _habitIdMeta,
        habitId.isAcceptableOrUnknown(data['habit_id']!, _habitIdMeta),
      );
    } else if (isInserting) {
      context.missing(_habitIdMeta);
    }
    if (data.containsKey('period_key')) {
      context.handle(
        _periodKeyMeta,
        periodKey.isAcceptableOrUnknown(data['period_key']!, _periodKeyMeta),
      );
    } else if (isInserting) {
      context.missing(_periodKeyMeta);
    }
    if (data.containsKey('period_start')) {
      context.handle(
        _periodStartMeta,
        periodStart.isAcceptableOrUnknown(
          data['period_start']!,
          _periodStartMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_periodStartMeta);
    }
    if (data.containsKey('period_end')) {
      context.handle(
        _periodEndMeta,
        periodEnd.isAcceptableOrUnknown(data['period_end']!, _periodEndMeta),
      );
    } else if (isInserting) {
      context.missing(_periodEndMeta);
    }
    if (data.containsKey('required')) {
      context.handle(
        _requiredMeta,
        required.isAcceptableOrUnknown(data['required']!, _requiredMeta),
      );
    }
    if (data.containsKey('completed')) {
      context.handle(
        _completedMeta,
        completed.isAcceptableOrUnknown(data['completed']!, _completedMeta),
      );
    }
    if (data.containsKey('frozen')) {
      context.handle(
        _frozenMeta,
        frozen.isAcceptableOrUnknown(data['frozen']!, _frozenMeta),
      );
    }
    if (data.containsKey('satisfied')) {
      context.handle(
        _satisfiedMeta,
        satisfied.isAcceptableOrUnknown(data['satisfied']!, _satisfiedMeta),
      );
    }
    if (data.containsKey('sealed')) {
      context.handle(
        _sealedMeta,
        sealed.isAcceptableOrUnknown(data['sealed']!, _sealedMeta),
      );
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {habitId, periodKey};
  @override
  HabitPeriod map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HabitPeriod(
      habitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}habit_id'],
      )!,
      periodKey: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}period_key'],
      )!,
      periodStart: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}period_start'],
      )!,
      periodEnd: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}period_end'],
      )!,
      required: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}required'],
      )!,
      completed: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}completed'],
      )!,
      frozen: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}frozen'],
      )!,
      satisfied: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}satisfied'],
      )!,
      sealed: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}sealed'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $HabitPeriodStatusTable createAlias(String alias) {
    return $HabitPeriodStatusTable(attachedDatabase, alias);
  }
}

class HabitPeriod extends DataClass implements Insertable<HabitPeriod> {
  final String habitId;

  /// 'YYYY-MM-DD' for day periods, 'YYYY-Www' for weeks, 'YYYY-MM' for months.
  final String periodKey;
  final String periodStart;
  final String periodEnd;
  final int required;
  final int completed;
  final bool frozen;

  /// completed + frozen >= required
  final bool satisfied;

  /// True once the period has ended. A sealed period no longer changes on its
  /// own; only an explicit backfill touches it.
  final bool sealed;
  final int updatedAt;
  const HabitPeriod({
    required this.habitId,
    required this.periodKey,
    required this.periodStart,
    required this.periodEnd,
    required this.required,
    required this.completed,
    required this.frozen,
    required this.satisfied,
    required this.sealed,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['habit_id'] = Variable<String>(habitId);
    map['period_key'] = Variable<String>(periodKey);
    map['period_start'] = Variable<String>(periodStart);
    map['period_end'] = Variable<String>(periodEnd);
    map['required'] = Variable<int>(required);
    map['completed'] = Variable<int>(completed);
    map['frozen'] = Variable<bool>(frozen);
    map['satisfied'] = Variable<bool>(satisfied);
    map['sealed'] = Variable<bool>(sealed);
    map['updated_at'] = Variable<int>(updatedAt);
    return map;
  }

  HabitPeriodStatusCompanion toCompanion(bool nullToAbsent) {
    return HabitPeriodStatusCompanion(
      habitId: Value(habitId),
      periodKey: Value(periodKey),
      periodStart: Value(periodStart),
      periodEnd: Value(periodEnd),
      required: Value(required),
      completed: Value(completed),
      frozen: Value(frozen),
      satisfied: Value(satisfied),
      sealed: Value(sealed),
      updatedAt: Value(updatedAt),
    );
  }

  factory HabitPeriod.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HabitPeriod(
      habitId: serializer.fromJson<String>(json['habitId']),
      periodKey: serializer.fromJson<String>(json['periodKey']),
      periodStart: serializer.fromJson<String>(json['periodStart']),
      periodEnd: serializer.fromJson<String>(json['periodEnd']),
      required: serializer.fromJson<int>(json['required']),
      completed: serializer.fromJson<int>(json['completed']),
      frozen: serializer.fromJson<bool>(json['frozen']),
      satisfied: serializer.fromJson<bool>(json['satisfied']),
      sealed: serializer.fromJson<bool>(json['sealed']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'habitId': serializer.toJson<String>(habitId),
      'periodKey': serializer.toJson<String>(periodKey),
      'periodStart': serializer.toJson<String>(periodStart),
      'periodEnd': serializer.toJson<String>(periodEnd),
      'required': serializer.toJson<int>(required),
      'completed': serializer.toJson<int>(completed),
      'frozen': serializer.toJson<bool>(frozen),
      'satisfied': serializer.toJson<bool>(satisfied),
      'sealed': serializer.toJson<bool>(sealed),
      'updatedAt': serializer.toJson<int>(updatedAt),
    };
  }

  HabitPeriod copyWith({
    String? habitId,
    String? periodKey,
    String? periodStart,
    String? periodEnd,
    int? required,
    int? completed,
    bool? frozen,
    bool? satisfied,
    bool? sealed,
    int? updatedAt,
  }) => HabitPeriod(
    habitId: habitId ?? this.habitId,
    periodKey: periodKey ?? this.periodKey,
    periodStart: periodStart ?? this.periodStart,
    periodEnd: periodEnd ?? this.periodEnd,
    required: required ?? this.required,
    completed: completed ?? this.completed,
    frozen: frozen ?? this.frozen,
    satisfied: satisfied ?? this.satisfied,
    sealed: sealed ?? this.sealed,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  HabitPeriod copyWithCompanion(HabitPeriodStatusCompanion data) {
    return HabitPeriod(
      habitId: data.habitId.present ? data.habitId.value : this.habitId,
      periodKey: data.periodKey.present ? data.periodKey.value : this.periodKey,
      periodStart: data.periodStart.present
          ? data.periodStart.value
          : this.periodStart,
      periodEnd: data.periodEnd.present ? data.periodEnd.value : this.periodEnd,
      required: data.required.present ? data.required.value : this.required,
      completed: data.completed.present ? data.completed.value : this.completed,
      frozen: data.frozen.present ? data.frozen.value : this.frozen,
      satisfied: data.satisfied.present ? data.satisfied.value : this.satisfied,
      sealed: data.sealed.present ? data.sealed.value : this.sealed,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HabitPeriod(')
          ..write('habitId: $habitId, ')
          ..write('periodKey: $periodKey, ')
          ..write('periodStart: $periodStart, ')
          ..write('periodEnd: $periodEnd, ')
          ..write('required: $required, ')
          ..write('completed: $completed, ')
          ..write('frozen: $frozen, ')
          ..write('satisfied: $satisfied, ')
          ..write('sealed: $sealed, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    habitId,
    periodKey,
    periodStart,
    periodEnd,
    required,
    completed,
    frozen,
    satisfied,
    sealed,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HabitPeriod &&
          other.habitId == this.habitId &&
          other.periodKey == this.periodKey &&
          other.periodStart == this.periodStart &&
          other.periodEnd == this.periodEnd &&
          other.required == this.required &&
          other.completed == this.completed &&
          other.frozen == this.frozen &&
          other.satisfied == this.satisfied &&
          other.sealed == this.sealed &&
          other.updatedAt == this.updatedAt);
}

class HabitPeriodStatusCompanion extends UpdateCompanion<HabitPeriod> {
  final Value<String> habitId;
  final Value<String> periodKey;
  final Value<String> periodStart;
  final Value<String> periodEnd;
  final Value<int> required;
  final Value<int> completed;
  final Value<bool> frozen;
  final Value<bool> satisfied;
  final Value<bool> sealed;
  final Value<int> updatedAt;
  final Value<int> rowid;
  const HabitPeriodStatusCompanion({
    this.habitId = const Value.absent(),
    this.periodKey = const Value.absent(),
    this.periodStart = const Value.absent(),
    this.periodEnd = const Value.absent(),
    this.required = const Value.absent(),
    this.completed = const Value.absent(),
    this.frozen = const Value.absent(),
    this.satisfied = const Value.absent(),
    this.sealed = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HabitPeriodStatusCompanion.insert({
    required String habitId,
    required String periodKey,
    required String periodStart,
    required String periodEnd,
    this.required = const Value.absent(),
    this.completed = const Value.absent(),
    this.frozen = const Value.absent(),
    this.satisfied = const Value.absent(),
    this.sealed = const Value.absent(),
    required int updatedAt,
    this.rowid = const Value.absent(),
  }) : habitId = Value(habitId),
       periodKey = Value(periodKey),
       periodStart = Value(periodStart),
       periodEnd = Value(periodEnd),
       updatedAt = Value(updatedAt);
  static Insertable<HabitPeriod> custom({
    Expression<String>? habitId,
    Expression<String>? periodKey,
    Expression<String>? periodStart,
    Expression<String>? periodEnd,
    Expression<int>? required,
    Expression<int>? completed,
    Expression<bool>? frozen,
    Expression<bool>? satisfied,
    Expression<bool>? sealed,
    Expression<int>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (habitId != null) 'habit_id': habitId,
      if (periodKey != null) 'period_key': periodKey,
      if (periodStart != null) 'period_start': periodStart,
      if (periodEnd != null) 'period_end': periodEnd,
      if (required != null) 'required': required,
      if (completed != null) 'completed': completed,
      if (frozen != null) 'frozen': frozen,
      if (satisfied != null) 'satisfied': satisfied,
      if (sealed != null) 'sealed': sealed,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HabitPeriodStatusCompanion copyWith({
    Value<String>? habitId,
    Value<String>? periodKey,
    Value<String>? periodStart,
    Value<String>? periodEnd,
    Value<int>? required,
    Value<int>? completed,
    Value<bool>? frozen,
    Value<bool>? satisfied,
    Value<bool>? sealed,
    Value<int>? updatedAt,
    Value<int>? rowid,
  }) {
    return HabitPeriodStatusCompanion(
      habitId: habitId ?? this.habitId,
      periodKey: periodKey ?? this.periodKey,
      periodStart: periodStart ?? this.periodStart,
      periodEnd: periodEnd ?? this.periodEnd,
      required: required ?? this.required,
      completed: completed ?? this.completed,
      frozen: frozen ?? this.frozen,
      satisfied: satisfied ?? this.satisfied,
      sealed: sealed ?? this.sealed,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (habitId.present) {
      map['habit_id'] = Variable<String>(habitId.value);
    }
    if (periodKey.present) {
      map['period_key'] = Variable<String>(periodKey.value);
    }
    if (periodStart.present) {
      map['period_start'] = Variable<String>(periodStart.value);
    }
    if (periodEnd.present) {
      map['period_end'] = Variable<String>(periodEnd.value);
    }
    if (required.present) {
      map['required'] = Variable<int>(required.value);
    }
    if (completed.present) {
      map['completed'] = Variable<int>(completed.value);
    }
    if (frozen.present) {
      map['frozen'] = Variable<bool>(frozen.value);
    }
    if (satisfied.present) {
      map['satisfied'] = Variable<bool>(satisfied.value);
    }
    if (sealed.present) {
      map['sealed'] = Variable<bool>(sealed.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HabitPeriodStatusCompanion(')
          ..write('habitId: $habitId, ')
          ..write('periodKey: $periodKey, ')
          ..write('periodStart: $periodStart, ')
          ..write('periodEnd: $periodEnd, ')
          ..write('required: $required, ')
          ..write('completed: $completed, ')
          ..write('frozen: $frozen, ')
          ..write('satisfied: $satisfied, ')
          ..write('sealed: $sealed, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $HabitStreakStateTable extends HabitStreakState
    with TableInfo<$HabitStreakStateTable, HabitStreak> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HabitStreakStateTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _habitIdMeta = const VerificationMeta(
    'habitId',
  );
  @override
  late final GeneratedColumn<String> habitId = GeneratedColumn<String>(
    'habit_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES habits (id)',
    ),
  );
  static const VerificationMeta _currentStreakMeta = const VerificationMeta(
    'currentStreak',
  );
  @override
  late final GeneratedColumn<int> currentStreak = GeneratedColumn<int>(
    'current_streak',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _longestStreakMeta = const VerificationMeta(
    'longestStreak',
  );
  @override
  late final GeneratedColumn<int> longestStreak = GeneratedColumn<int>(
    'longest_streak',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastSatisfiedPeriodMeta =
      const VerificationMeta('lastSatisfiedPeriod');
  @override
  late final GeneratedColumn<String> lastSatisfiedPeriod =
      GeneratedColumn<String>(
        'last_satisfied_period',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _freezeBalanceMeta = const VerificationMeta(
    'freezeBalance',
  );
  @override
  late final GeneratedColumn<int> freezeBalance = GeneratedColumn<int>(
    'freeze_balance',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _freezesEarnedTotalMeta =
      const VerificationMeta('freezesEarnedTotal');
  @override
  late final GeneratedColumn<int> freezesEarnedTotal = GeneratedColumn<int>(
    'freezes_earned_total',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _totalCompletionsMeta = const VerificationMeta(
    'totalCompletions',
  );
  @override
  late final GeneratedColumn<int> totalCompletions = GeneratedColumn<int>(
    'total_completions',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _firstLogDateMeta = const VerificationMeta(
    'firstLogDate',
  );
  @override
  late final GeneratedColumn<String> firstLogDate = GeneratedColumn<String>(
    'first_log_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _computedThroughMeta = const VerificationMeta(
    'computedThrough',
  );
  @override
  late final GeneratedColumn<String> computedThrough = GeneratedColumn<String>(
    'computed_through',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _computedAtMeta = const VerificationMeta(
    'computedAt',
  );
  @override
  late final GeneratedColumn<int> computedAt = GeneratedColumn<int>(
    'computed_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    habitId,
    currentStreak,
    longestStreak,
    lastSatisfiedPeriod,
    freezeBalance,
    freezesEarnedTotal,
    totalCompletions,
    firstLogDate,
    computedThrough,
    computedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'habit_streak_state';
  @override
  VerificationContext validateIntegrity(
    Insertable<HabitStreak> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('habit_id')) {
      context.handle(
        _habitIdMeta,
        habitId.isAcceptableOrUnknown(data['habit_id']!, _habitIdMeta),
      );
    } else if (isInserting) {
      context.missing(_habitIdMeta);
    }
    if (data.containsKey('current_streak')) {
      context.handle(
        _currentStreakMeta,
        currentStreak.isAcceptableOrUnknown(
          data['current_streak']!,
          _currentStreakMeta,
        ),
      );
    }
    if (data.containsKey('longest_streak')) {
      context.handle(
        _longestStreakMeta,
        longestStreak.isAcceptableOrUnknown(
          data['longest_streak']!,
          _longestStreakMeta,
        ),
      );
    }
    if (data.containsKey('last_satisfied_period')) {
      context.handle(
        _lastSatisfiedPeriodMeta,
        lastSatisfiedPeriod.isAcceptableOrUnknown(
          data['last_satisfied_period']!,
          _lastSatisfiedPeriodMeta,
        ),
      );
    }
    if (data.containsKey('freeze_balance')) {
      context.handle(
        _freezeBalanceMeta,
        freezeBalance.isAcceptableOrUnknown(
          data['freeze_balance']!,
          _freezeBalanceMeta,
        ),
      );
    }
    if (data.containsKey('freezes_earned_total')) {
      context.handle(
        _freezesEarnedTotalMeta,
        freezesEarnedTotal.isAcceptableOrUnknown(
          data['freezes_earned_total']!,
          _freezesEarnedTotalMeta,
        ),
      );
    }
    if (data.containsKey('total_completions')) {
      context.handle(
        _totalCompletionsMeta,
        totalCompletions.isAcceptableOrUnknown(
          data['total_completions']!,
          _totalCompletionsMeta,
        ),
      );
    }
    if (data.containsKey('first_log_date')) {
      context.handle(
        _firstLogDateMeta,
        firstLogDate.isAcceptableOrUnknown(
          data['first_log_date']!,
          _firstLogDateMeta,
        ),
      );
    }
    if (data.containsKey('computed_through')) {
      context.handle(
        _computedThroughMeta,
        computedThrough.isAcceptableOrUnknown(
          data['computed_through']!,
          _computedThroughMeta,
        ),
      );
    }
    if (data.containsKey('computed_at')) {
      context.handle(
        _computedAtMeta,
        computedAt.isAcceptableOrUnknown(data['computed_at']!, _computedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_computedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {habitId};
  @override
  HabitStreak map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HabitStreak(
      habitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}habit_id'],
      )!,
      currentStreak: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}current_streak'],
      )!,
      longestStreak: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}longest_streak'],
      )!,
      lastSatisfiedPeriod: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_satisfied_period'],
      ),
      freezeBalance: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}freeze_balance'],
      )!,
      freezesEarnedTotal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}freezes_earned_total'],
      )!,
      totalCompletions: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_completions'],
      )!,
      firstLogDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}first_log_date'],
      ),
      computedThrough: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}computed_through'],
      ),
      computedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}computed_at'],
      )!,
    );
  }

  @override
  $HabitStreakStateTable createAlias(String alias) {
    return $HabitStreakStateTable(attachedDatabase, alias);
  }
}

class HabitStreak extends DataClass implements Insertable<HabitStreak> {
  final String habitId;
  final int currentStreak;
  final int longestStreak;
  final String? lastSatisfiedPeriod;
  final int freezeBalance;
  final int freezesEarnedTotal;
  final int totalCompletions;
  final String? firstLogDate;

  /// Last period fully evaluated, so recompute can resume rather than restart.
  final String? computedThrough;
  final int computedAt;
  const HabitStreak({
    required this.habitId,
    required this.currentStreak,
    required this.longestStreak,
    this.lastSatisfiedPeriod,
    required this.freezeBalance,
    required this.freezesEarnedTotal,
    required this.totalCompletions,
    this.firstLogDate,
    this.computedThrough,
    required this.computedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['habit_id'] = Variable<String>(habitId);
    map['current_streak'] = Variable<int>(currentStreak);
    map['longest_streak'] = Variable<int>(longestStreak);
    if (!nullToAbsent || lastSatisfiedPeriod != null) {
      map['last_satisfied_period'] = Variable<String>(lastSatisfiedPeriod);
    }
    map['freeze_balance'] = Variable<int>(freezeBalance);
    map['freezes_earned_total'] = Variable<int>(freezesEarnedTotal);
    map['total_completions'] = Variable<int>(totalCompletions);
    if (!nullToAbsent || firstLogDate != null) {
      map['first_log_date'] = Variable<String>(firstLogDate);
    }
    if (!nullToAbsent || computedThrough != null) {
      map['computed_through'] = Variable<String>(computedThrough);
    }
    map['computed_at'] = Variable<int>(computedAt);
    return map;
  }

  HabitStreakStateCompanion toCompanion(bool nullToAbsent) {
    return HabitStreakStateCompanion(
      habitId: Value(habitId),
      currentStreak: Value(currentStreak),
      longestStreak: Value(longestStreak),
      lastSatisfiedPeriod: lastSatisfiedPeriod == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSatisfiedPeriod),
      freezeBalance: Value(freezeBalance),
      freezesEarnedTotal: Value(freezesEarnedTotal),
      totalCompletions: Value(totalCompletions),
      firstLogDate: firstLogDate == null && nullToAbsent
          ? const Value.absent()
          : Value(firstLogDate),
      computedThrough: computedThrough == null && nullToAbsent
          ? const Value.absent()
          : Value(computedThrough),
      computedAt: Value(computedAt),
    );
  }

  factory HabitStreak.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HabitStreak(
      habitId: serializer.fromJson<String>(json['habitId']),
      currentStreak: serializer.fromJson<int>(json['currentStreak']),
      longestStreak: serializer.fromJson<int>(json['longestStreak']),
      lastSatisfiedPeriod: serializer.fromJson<String?>(
        json['lastSatisfiedPeriod'],
      ),
      freezeBalance: serializer.fromJson<int>(json['freezeBalance']),
      freezesEarnedTotal: serializer.fromJson<int>(json['freezesEarnedTotal']),
      totalCompletions: serializer.fromJson<int>(json['totalCompletions']),
      firstLogDate: serializer.fromJson<String?>(json['firstLogDate']),
      computedThrough: serializer.fromJson<String?>(json['computedThrough']),
      computedAt: serializer.fromJson<int>(json['computedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'habitId': serializer.toJson<String>(habitId),
      'currentStreak': serializer.toJson<int>(currentStreak),
      'longestStreak': serializer.toJson<int>(longestStreak),
      'lastSatisfiedPeriod': serializer.toJson<String?>(lastSatisfiedPeriod),
      'freezeBalance': serializer.toJson<int>(freezeBalance),
      'freezesEarnedTotal': serializer.toJson<int>(freezesEarnedTotal),
      'totalCompletions': serializer.toJson<int>(totalCompletions),
      'firstLogDate': serializer.toJson<String?>(firstLogDate),
      'computedThrough': serializer.toJson<String?>(computedThrough),
      'computedAt': serializer.toJson<int>(computedAt),
    };
  }

  HabitStreak copyWith({
    String? habitId,
    int? currentStreak,
    int? longestStreak,
    Value<String?> lastSatisfiedPeriod = const Value.absent(),
    int? freezeBalance,
    int? freezesEarnedTotal,
    int? totalCompletions,
    Value<String?> firstLogDate = const Value.absent(),
    Value<String?> computedThrough = const Value.absent(),
    int? computedAt,
  }) => HabitStreak(
    habitId: habitId ?? this.habitId,
    currentStreak: currentStreak ?? this.currentStreak,
    longestStreak: longestStreak ?? this.longestStreak,
    lastSatisfiedPeriod: lastSatisfiedPeriod.present
        ? lastSatisfiedPeriod.value
        : this.lastSatisfiedPeriod,
    freezeBalance: freezeBalance ?? this.freezeBalance,
    freezesEarnedTotal: freezesEarnedTotal ?? this.freezesEarnedTotal,
    totalCompletions: totalCompletions ?? this.totalCompletions,
    firstLogDate: firstLogDate.present ? firstLogDate.value : this.firstLogDate,
    computedThrough: computedThrough.present
        ? computedThrough.value
        : this.computedThrough,
    computedAt: computedAt ?? this.computedAt,
  );
  HabitStreak copyWithCompanion(HabitStreakStateCompanion data) {
    return HabitStreak(
      habitId: data.habitId.present ? data.habitId.value : this.habitId,
      currentStreak: data.currentStreak.present
          ? data.currentStreak.value
          : this.currentStreak,
      longestStreak: data.longestStreak.present
          ? data.longestStreak.value
          : this.longestStreak,
      lastSatisfiedPeriod: data.lastSatisfiedPeriod.present
          ? data.lastSatisfiedPeriod.value
          : this.lastSatisfiedPeriod,
      freezeBalance: data.freezeBalance.present
          ? data.freezeBalance.value
          : this.freezeBalance,
      freezesEarnedTotal: data.freezesEarnedTotal.present
          ? data.freezesEarnedTotal.value
          : this.freezesEarnedTotal,
      totalCompletions: data.totalCompletions.present
          ? data.totalCompletions.value
          : this.totalCompletions,
      firstLogDate: data.firstLogDate.present
          ? data.firstLogDate.value
          : this.firstLogDate,
      computedThrough: data.computedThrough.present
          ? data.computedThrough.value
          : this.computedThrough,
      computedAt: data.computedAt.present
          ? data.computedAt.value
          : this.computedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HabitStreak(')
          ..write('habitId: $habitId, ')
          ..write('currentStreak: $currentStreak, ')
          ..write('longestStreak: $longestStreak, ')
          ..write('lastSatisfiedPeriod: $lastSatisfiedPeriod, ')
          ..write('freezeBalance: $freezeBalance, ')
          ..write('freezesEarnedTotal: $freezesEarnedTotal, ')
          ..write('totalCompletions: $totalCompletions, ')
          ..write('firstLogDate: $firstLogDate, ')
          ..write('computedThrough: $computedThrough, ')
          ..write('computedAt: $computedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    habitId,
    currentStreak,
    longestStreak,
    lastSatisfiedPeriod,
    freezeBalance,
    freezesEarnedTotal,
    totalCompletions,
    firstLogDate,
    computedThrough,
    computedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HabitStreak &&
          other.habitId == this.habitId &&
          other.currentStreak == this.currentStreak &&
          other.longestStreak == this.longestStreak &&
          other.lastSatisfiedPeriod == this.lastSatisfiedPeriod &&
          other.freezeBalance == this.freezeBalance &&
          other.freezesEarnedTotal == this.freezesEarnedTotal &&
          other.totalCompletions == this.totalCompletions &&
          other.firstLogDate == this.firstLogDate &&
          other.computedThrough == this.computedThrough &&
          other.computedAt == this.computedAt);
}

class HabitStreakStateCompanion extends UpdateCompanion<HabitStreak> {
  final Value<String> habitId;
  final Value<int> currentStreak;
  final Value<int> longestStreak;
  final Value<String?> lastSatisfiedPeriod;
  final Value<int> freezeBalance;
  final Value<int> freezesEarnedTotal;
  final Value<int> totalCompletions;
  final Value<String?> firstLogDate;
  final Value<String?> computedThrough;
  final Value<int> computedAt;
  final Value<int> rowid;
  const HabitStreakStateCompanion({
    this.habitId = const Value.absent(),
    this.currentStreak = const Value.absent(),
    this.longestStreak = const Value.absent(),
    this.lastSatisfiedPeriod = const Value.absent(),
    this.freezeBalance = const Value.absent(),
    this.freezesEarnedTotal = const Value.absent(),
    this.totalCompletions = const Value.absent(),
    this.firstLogDate = const Value.absent(),
    this.computedThrough = const Value.absent(),
    this.computedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HabitStreakStateCompanion.insert({
    required String habitId,
    this.currentStreak = const Value.absent(),
    this.longestStreak = const Value.absent(),
    this.lastSatisfiedPeriod = const Value.absent(),
    this.freezeBalance = const Value.absent(),
    this.freezesEarnedTotal = const Value.absent(),
    this.totalCompletions = const Value.absent(),
    this.firstLogDate = const Value.absent(),
    this.computedThrough = const Value.absent(),
    required int computedAt,
    this.rowid = const Value.absent(),
  }) : habitId = Value(habitId),
       computedAt = Value(computedAt);
  static Insertable<HabitStreak> custom({
    Expression<String>? habitId,
    Expression<int>? currentStreak,
    Expression<int>? longestStreak,
    Expression<String>? lastSatisfiedPeriod,
    Expression<int>? freezeBalance,
    Expression<int>? freezesEarnedTotal,
    Expression<int>? totalCompletions,
    Expression<String>? firstLogDate,
    Expression<String>? computedThrough,
    Expression<int>? computedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (habitId != null) 'habit_id': habitId,
      if (currentStreak != null) 'current_streak': currentStreak,
      if (longestStreak != null) 'longest_streak': longestStreak,
      if (lastSatisfiedPeriod != null)
        'last_satisfied_period': lastSatisfiedPeriod,
      if (freezeBalance != null) 'freeze_balance': freezeBalance,
      if (freezesEarnedTotal != null)
        'freezes_earned_total': freezesEarnedTotal,
      if (totalCompletions != null) 'total_completions': totalCompletions,
      if (firstLogDate != null) 'first_log_date': firstLogDate,
      if (computedThrough != null) 'computed_through': computedThrough,
      if (computedAt != null) 'computed_at': computedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HabitStreakStateCompanion copyWith({
    Value<String>? habitId,
    Value<int>? currentStreak,
    Value<int>? longestStreak,
    Value<String?>? lastSatisfiedPeriod,
    Value<int>? freezeBalance,
    Value<int>? freezesEarnedTotal,
    Value<int>? totalCompletions,
    Value<String?>? firstLogDate,
    Value<String?>? computedThrough,
    Value<int>? computedAt,
    Value<int>? rowid,
  }) {
    return HabitStreakStateCompanion(
      habitId: habitId ?? this.habitId,
      currentStreak: currentStreak ?? this.currentStreak,
      longestStreak: longestStreak ?? this.longestStreak,
      lastSatisfiedPeriod: lastSatisfiedPeriod ?? this.lastSatisfiedPeriod,
      freezeBalance: freezeBalance ?? this.freezeBalance,
      freezesEarnedTotal: freezesEarnedTotal ?? this.freezesEarnedTotal,
      totalCompletions: totalCompletions ?? this.totalCompletions,
      firstLogDate: firstLogDate ?? this.firstLogDate,
      computedThrough: computedThrough ?? this.computedThrough,
      computedAt: computedAt ?? this.computedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (habitId.present) {
      map['habit_id'] = Variable<String>(habitId.value);
    }
    if (currentStreak.present) {
      map['current_streak'] = Variable<int>(currentStreak.value);
    }
    if (longestStreak.present) {
      map['longest_streak'] = Variable<int>(longestStreak.value);
    }
    if (lastSatisfiedPeriod.present) {
      map['last_satisfied_period'] = Variable<String>(
        lastSatisfiedPeriod.value,
      );
    }
    if (freezeBalance.present) {
      map['freeze_balance'] = Variable<int>(freezeBalance.value);
    }
    if (freezesEarnedTotal.present) {
      map['freezes_earned_total'] = Variable<int>(freezesEarnedTotal.value);
    }
    if (totalCompletions.present) {
      map['total_completions'] = Variable<int>(totalCompletions.value);
    }
    if (firstLogDate.present) {
      map['first_log_date'] = Variable<String>(firstLogDate.value);
    }
    if (computedThrough.present) {
      map['computed_through'] = Variable<String>(computedThrough.value);
    }
    if (computedAt.present) {
      map['computed_at'] = Variable<int>(computedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HabitStreakStateCompanion(')
          ..write('habitId: $habitId, ')
          ..write('currentStreak: $currentStreak, ')
          ..write('longestStreak: $longestStreak, ')
          ..write('lastSatisfiedPeriod: $lastSatisfiedPeriod, ')
          ..write('freezeBalance: $freezeBalance, ')
          ..write('freezesEarnedTotal: $freezesEarnedTotal, ')
          ..write('totalCompletions: $totalCompletions, ')
          ..write('firstLogDate: $firstLogDate, ')
          ..write('computedThrough: $computedThrough, ')
          ..write('computedAt: $computedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RoutineStacksTable extends RoutineStacks
    with TableInfo<$RoutineStacksTable, RoutineStack> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RoutineStacksTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _startTimeMeta = const VerificationMeta(
    'startTime',
  );
  @override
  late final GeneratedColumn<String> startTime = GeneratedColumn<String>(
    'start_time',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    name,
    startTime,
    sortIndex,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'routine_stacks';
  @override
  VerificationContext validateIntegrity(
    Insertable<RoutineStack> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('start_time')) {
      context.handle(
        _startTimeMeta,
        startTime.isAcceptableOrUnknown(data['start_time']!, _startTimeMeta),
      );
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  RoutineStack map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return RoutineStack(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      startTime: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}start_time'],
      ),
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
    );
  }

  @override
  $RoutineStacksTable createAlias(String alias) {
    return $RoutineStacksTable(attachedDatabase, alias);
  }
}

class RoutineStack extends DataClass implements Insertable<RoutineStack> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String name;
  final String? startTime;
  final int sortIndex;
  const RoutineStack({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.name,
    this.startTime,
    required this.sortIndex,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || startTime != null) {
      map['start_time'] = Variable<String>(startTime);
    }
    map['sort_index'] = Variable<int>(sortIndex);
    return map;
  }

  RoutineStacksCompanion toCompanion(bool nullToAbsent) {
    return RoutineStacksCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      name: Value(name),
      startTime: startTime == null && nullToAbsent
          ? const Value.absent()
          : Value(startTime),
      sortIndex: Value(sortIndex),
    );
  }

  factory RoutineStack.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return RoutineStack(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      name: serializer.fromJson<String>(json['name']),
      startTime: serializer.fromJson<String?>(json['startTime']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'name': serializer.toJson<String>(name),
      'startTime': serializer.toJson<String?>(startTime),
      'sortIndex': serializer.toJson<int>(sortIndex),
    };
  }

  RoutineStack copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? name,
    Value<String?> startTime = const Value.absent(),
    int? sortIndex,
  }) => RoutineStack(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    name: name ?? this.name,
    startTime: startTime.present ? startTime.value : this.startTime,
    sortIndex: sortIndex ?? this.sortIndex,
  );
  RoutineStack copyWithCompanion(RoutineStacksCompanion data) {
    return RoutineStack(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      name: data.name.present ? data.name.value : this.name,
      startTime: data.startTime.present ? data.startTime.value : this.startTime,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
    );
  }

  @override
  String toString() {
    return (StringBuffer('RoutineStack(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('name: $name, ')
          ..write('startTime: $startTime, ')
          ..write('sortIndex: $sortIndex')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    name,
    startTime,
    sortIndex,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RoutineStack &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.name == this.name &&
          other.startTime == this.startTime &&
          other.sortIndex == this.sortIndex);
}

class RoutineStacksCompanion extends UpdateCompanion<RoutineStack> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> name;
  final Value<String?> startTime;
  final Value<int> sortIndex;
  final Value<int> rowid;
  const RoutineStacksCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.name = const Value.absent(),
    this.startTime = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RoutineStacksCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String name,
    this.startTime = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       name = Value(name);
  static Insertable<RoutineStack> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? name,
    Expression<String>? startTime,
    Expression<int>? sortIndex,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (name != null) 'name': name,
      if (startTime != null) 'start_time': startTime,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RoutineStacksCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? name,
    Value<String?>? startTime,
    Value<int>? sortIndex,
    Value<int>? rowid,
  }) {
    return RoutineStacksCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      name: name ?? this.name,
      startTime: startTime ?? this.startTime,
      sortIndex: sortIndex ?? this.sortIndex,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (startTime.present) {
      map['start_time'] = Variable<String>(startTime.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RoutineStacksCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('name: $name, ')
          ..write('startTime: $startTime, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TasksTable extends Tasks with TableInfo<$TasksTable, Task> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TasksTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(
      minTextLength: 1,
      maxTextLength: 500,
    ),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<int> status = GeneratedColumn<int>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _priorityMeta = const VerificationMeta(
    'priority',
  );
  @override
  late final GeneratedColumn<int> priority = GeneratedColumn<int>(
    'priority',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dueDateMeta = const VerificationMeta(
    'dueDate',
  );
  @override
  late final GeneratedColumn<String> dueDate = GeneratedColumn<String>(
    'due_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dueTimeMeta = const VerificationMeta(
    'dueTime',
  );
  @override
  late final GeneratedColumn<String> dueTime = GeneratedColumn<String>(
    'due_time',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _remindAtMeta = const VerificationMeta(
    'remindAt',
  );
  @override
  late final GeneratedColumn<int> remindAt = GeneratedColumn<int>(
    'remind_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _completedAtMeta = const VerificationMeta(
    'completedAt',
  );
  @override
  late final GeneratedColumn<int> completedAt = GeneratedColumn<int>(
    'completed_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _estimateMinutesMeta = const VerificationMeta(
    'estimateMinutes',
  );
  @override
  late final GeneratedColumn<int> estimateMinutes = GeneratedColumn<int>(
    'estimate_minutes',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _actualMinutesMeta = const VerificationMeta(
    'actualMinutes',
  );
  @override
  late final GeneratedColumn<int> actualMinutes = GeneratedColumn<int>(
    'actual_minutes',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _parentTaskIdMeta = const VerificationMeta(
    'parentTaskId',
  );
  @override
  late final GeneratedColumn<String> parentTaskId = GeneratedColumn<String>(
    'parent_task_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _goalIdMeta = const VerificationMeta('goalId');
  @override
  late final GeneratedColumn<String> goalId = GeneratedColumn<String>(
    'goal_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _recurrenceRuleMeta = const VerificationMeta(
    'recurrenceRule',
  );
  @override
  late final GeneratedColumn<String> recurrenceRule = GeneratedColumn<String>(
    'recurrence_rule',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _recurrenceParentIdMeta =
      const VerificationMeta('recurrenceParentId');
  @override
  late final GeneratedColumn<String> recurrenceParentId =
      GeneratedColumn<String>(
        'recurrence_parent_id',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _imagePathMeta = const VerificationMeta(
    'imagePath',
  );
  @override
  late final GeneratedColumn<String> imagePath = GeneratedColumn<String>(
    'image_path',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    title,
    description,
    status,
    priority,
    category,
    dueDate,
    dueTime,
    remindAt,
    completedAt,
    estimateMinutes,
    actualMinutes,
    parentTaskId,
    goalId,
    recurrenceRule,
    recurrenceParentId,
    imagePath,
    sortIndex,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tasks';
  @override
  VerificationContext validateIntegrity(
    Insertable<Task> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('priority')) {
      context.handle(
        _priorityMeta,
        priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta),
      );
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    if (data.containsKey('due_date')) {
      context.handle(
        _dueDateMeta,
        dueDate.isAcceptableOrUnknown(data['due_date']!, _dueDateMeta),
      );
    }
    if (data.containsKey('due_time')) {
      context.handle(
        _dueTimeMeta,
        dueTime.isAcceptableOrUnknown(data['due_time']!, _dueTimeMeta),
      );
    }
    if (data.containsKey('remind_at')) {
      context.handle(
        _remindAtMeta,
        remindAt.isAcceptableOrUnknown(data['remind_at']!, _remindAtMeta),
      );
    }
    if (data.containsKey('completed_at')) {
      context.handle(
        _completedAtMeta,
        completedAt.isAcceptableOrUnknown(
          data['completed_at']!,
          _completedAtMeta,
        ),
      );
    }
    if (data.containsKey('estimate_minutes')) {
      context.handle(
        _estimateMinutesMeta,
        estimateMinutes.isAcceptableOrUnknown(
          data['estimate_minutes']!,
          _estimateMinutesMeta,
        ),
      );
    }
    if (data.containsKey('actual_minutes')) {
      context.handle(
        _actualMinutesMeta,
        actualMinutes.isAcceptableOrUnknown(
          data['actual_minutes']!,
          _actualMinutesMeta,
        ),
      );
    }
    if (data.containsKey('parent_task_id')) {
      context.handle(
        _parentTaskIdMeta,
        parentTaskId.isAcceptableOrUnknown(
          data['parent_task_id']!,
          _parentTaskIdMeta,
        ),
      );
    }
    if (data.containsKey('goal_id')) {
      context.handle(
        _goalIdMeta,
        goalId.isAcceptableOrUnknown(data['goal_id']!, _goalIdMeta),
      );
    }
    if (data.containsKey('recurrence_rule')) {
      context.handle(
        _recurrenceRuleMeta,
        recurrenceRule.isAcceptableOrUnknown(
          data['recurrence_rule']!,
          _recurrenceRuleMeta,
        ),
      );
    }
    if (data.containsKey('recurrence_parent_id')) {
      context.handle(
        _recurrenceParentIdMeta,
        recurrenceParentId.isAcceptableOrUnknown(
          data['recurrence_parent_id']!,
          _recurrenceParentIdMeta,
        ),
      );
    }
    if (data.containsKey('image_path')) {
      context.handle(
        _imagePathMeta,
        imagePath.isAcceptableOrUnknown(data['image_path']!, _imagePathMeta),
      );
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Task map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Task(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}status'],
      )!,
      priority: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}priority'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      ),
      dueDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}due_date'],
      ),
      dueTime: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}due_time'],
      ),
      remindAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}remind_at'],
      ),
      completedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}completed_at'],
      ),
      estimateMinutes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}estimate_minutes'],
      ),
      actualMinutes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actual_minutes'],
      ),
      parentTaskId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}parent_task_id'],
      ),
      goalId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}goal_id'],
      ),
      recurrenceRule: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}recurrence_rule'],
      ),
      recurrenceParentId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}recurrence_parent_id'],
      ),
      imagePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}image_path'],
      ),
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
    );
  }

  @override
  $TasksTable createAlias(String alias) {
    return $TasksTable(attachedDatabase, alias);
  }
}

class Task extends DataClass implements Insertable<Task> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String title;
  final String? description;

  /// [TaskStatus]
  final int status;

  /// [TaskPriority]
  final int priority;
  final String? category;
  final String? dueDate;
  final String? dueTime;
  final int? remindAt;
  final int? completedAt;
  final int? estimateMinutes;
  final int? actualMinutes;

  /// Subtasks. Depth is capped at one level in the repository layer — nested
  /// trees are a UI trap at this screen size.
  final String? parentTaskId;
  final String? goalId;

  /// RRULE subset; null for one-off tasks.
  final String? recurrenceRule;
  final String? recurrenceParentId;

  /// Local file path, never a remote URL — images are pulled down during
  /// migration so the app keeps working with no network.
  final String? imagePath;
  final int sortIndex;
  const Task({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.category,
    this.dueDate,
    this.dueTime,
    this.remindAt,
    this.completedAt,
    this.estimateMinutes,
    this.actualMinutes,
    this.parentTaskId,
    this.goalId,
    this.recurrenceRule,
    this.recurrenceParentId,
    this.imagePath,
    required this.sortIndex,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['title'] = Variable<String>(title);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['status'] = Variable<int>(status);
    map['priority'] = Variable<int>(priority);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    if (!nullToAbsent || dueDate != null) {
      map['due_date'] = Variable<String>(dueDate);
    }
    if (!nullToAbsent || dueTime != null) {
      map['due_time'] = Variable<String>(dueTime);
    }
    if (!nullToAbsent || remindAt != null) {
      map['remind_at'] = Variable<int>(remindAt);
    }
    if (!nullToAbsent || completedAt != null) {
      map['completed_at'] = Variable<int>(completedAt);
    }
    if (!nullToAbsent || estimateMinutes != null) {
      map['estimate_minutes'] = Variable<int>(estimateMinutes);
    }
    if (!nullToAbsent || actualMinutes != null) {
      map['actual_minutes'] = Variable<int>(actualMinutes);
    }
    if (!nullToAbsent || parentTaskId != null) {
      map['parent_task_id'] = Variable<String>(parentTaskId);
    }
    if (!nullToAbsent || goalId != null) {
      map['goal_id'] = Variable<String>(goalId);
    }
    if (!nullToAbsent || recurrenceRule != null) {
      map['recurrence_rule'] = Variable<String>(recurrenceRule);
    }
    if (!nullToAbsent || recurrenceParentId != null) {
      map['recurrence_parent_id'] = Variable<String>(recurrenceParentId);
    }
    if (!nullToAbsent || imagePath != null) {
      map['image_path'] = Variable<String>(imagePath);
    }
    map['sort_index'] = Variable<int>(sortIndex);
    return map;
  }

  TasksCompanion toCompanion(bool nullToAbsent) {
    return TasksCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      title: Value(title),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      status: Value(status),
      priority: Value(priority),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      dueDate: dueDate == null && nullToAbsent
          ? const Value.absent()
          : Value(dueDate),
      dueTime: dueTime == null && nullToAbsent
          ? const Value.absent()
          : Value(dueTime),
      remindAt: remindAt == null && nullToAbsent
          ? const Value.absent()
          : Value(remindAt),
      completedAt: completedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(completedAt),
      estimateMinutes: estimateMinutes == null && nullToAbsent
          ? const Value.absent()
          : Value(estimateMinutes),
      actualMinutes: actualMinutes == null && nullToAbsent
          ? const Value.absent()
          : Value(actualMinutes),
      parentTaskId: parentTaskId == null && nullToAbsent
          ? const Value.absent()
          : Value(parentTaskId),
      goalId: goalId == null && nullToAbsent
          ? const Value.absent()
          : Value(goalId),
      recurrenceRule: recurrenceRule == null && nullToAbsent
          ? const Value.absent()
          : Value(recurrenceRule),
      recurrenceParentId: recurrenceParentId == null && nullToAbsent
          ? const Value.absent()
          : Value(recurrenceParentId),
      imagePath: imagePath == null && nullToAbsent
          ? const Value.absent()
          : Value(imagePath),
      sortIndex: Value(sortIndex),
    );
  }

  factory Task.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Task(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      title: serializer.fromJson<String>(json['title']),
      description: serializer.fromJson<String?>(json['description']),
      status: serializer.fromJson<int>(json['status']),
      priority: serializer.fromJson<int>(json['priority']),
      category: serializer.fromJson<String?>(json['category']),
      dueDate: serializer.fromJson<String?>(json['dueDate']),
      dueTime: serializer.fromJson<String?>(json['dueTime']),
      remindAt: serializer.fromJson<int?>(json['remindAt']),
      completedAt: serializer.fromJson<int?>(json['completedAt']),
      estimateMinutes: serializer.fromJson<int?>(json['estimateMinutes']),
      actualMinutes: serializer.fromJson<int?>(json['actualMinutes']),
      parentTaskId: serializer.fromJson<String?>(json['parentTaskId']),
      goalId: serializer.fromJson<String?>(json['goalId']),
      recurrenceRule: serializer.fromJson<String?>(json['recurrenceRule']),
      recurrenceParentId: serializer.fromJson<String?>(
        json['recurrenceParentId'],
      ),
      imagePath: serializer.fromJson<String?>(json['imagePath']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'title': serializer.toJson<String>(title),
      'description': serializer.toJson<String?>(description),
      'status': serializer.toJson<int>(status),
      'priority': serializer.toJson<int>(priority),
      'category': serializer.toJson<String?>(category),
      'dueDate': serializer.toJson<String?>(dueDate),
      'dueTime': serializer.toJson<String?>(dueTime),
      'remindAt': serializer.toJson<int?>(remindAt),
      'completedAt': serializer.toJson<int?>(completedAt),
      'estimateMinutes': serializer.toJson<int?>(estimateMinutes),
      'actualMinutes': serializer.toJson<int?>(actualMinutes),
      'parentTaskId': serializer.toJson<String?>(parentTaskId),
      'goalId': serializer.toJson<String?>(goalId),
      'recurrenceRule': serializer.toJson<String?>(recurrenceRule),
      'recurrenceParentId': serializer.toJson<String?>(recurrenceParentId),
      'imagePath': serializer.toJson<String?>(imagePath),
      'sortIndex': serializer.toJson<int>(sortIndex),
    };
  }

  Task copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? title,
    Value<String?> description = const Value.absent(),
    int? status,
    int? priority,
    Value<String?> category = const Value.absent(),
    Value<String?> dueDate = const Value.absent(),
    Value<String?> dueTime = const Value.absent(),
    Value<int?> remindAt = const Value.absent(),
    Value<int?> completedAt = const Value.absent(),
    Value<int?> estimateMinutes = const Value.absent(),
    Value<int?> actualMinutes = const Value.absent(),
    Value<String?> parentTaskId = const Value.absent(),
    Value<String?> goalId = const Value.absent(),
    Value<String?> recurrenceRule = const Value.absent(),
    Value<String?> recurrenceParentId = const Value.absent(),
    Value<String?> imagePath = const Value.absent(),
    int? sortIndex,
  }) => Task(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    title: title ?? this.title,
    description: description.present ? description.value : this.description,
    status: status ?? this.status,
    priority: priority ?? this.priority,
    category: category.present ? category.value : this.category,
    dueDate: dueDate.present ? dueDate.value : this.dueDate,
    dueTime: dueTime.present ? dueTime.value : this.dueTime,
    remindAt: remindAt.present ? remindAt.value : this.remindAt,
    completedAt: completedAt.present ? completedAt.value : this.completedAt,
    estimateMinutes: estimateMinutes.present
        ? estimateMinutes.value
        : this.estimateMinutes,
    actualMinutes: actualMinutes.present
        ? actualMinutes.value
        : this.actualMinutes,
    parentTaskId: parentTaskId.present ? parentTaskId.value : this.parentTaskId,
    goalId: goalId.present ? goalId.value : this.goalId,
    recurrenceRule: recurrenceRule.present
        ? recurrenceRule.value
        : this.recurrenceRule,
    recurrenceParentId: recurrenceParentId.present
        ? recurrenceParentId.value
        : this.recurrenceParentId,
    imagePath: imagePath.present ? imagePath.value : this.imagePath,
    sortIndex: sortIndex ?? this.sortIndex,
  );
  Task copyWithCompanion(TasksCompanion data) {
    return Task(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      title: data.title.present ? data.title.value : this.title,
      description: data.description.present
          ? data.description.value
          : this.description,
      status: data.status.present ? data.status.value : this.status,
      priority: data.priority.present ? data.priority.value : this.priority,
      category: data.category.present ? data.category.value : this.category,
      dueDate: data.dueDate.present ? data.dueDate.value : this.dueDate,
      dueTime: data.dueTime.present ? data.dueTime.value : this.dueTime,
      remindAt: data.remindAt.present ? data.remindAt.value : this.remindAt,
      completedAt: data.completedAt.present
          ? data.completedAt.value
          : this.completedAt,
      estimateMinutes: data.estimateMinutes.present
          ? data.estimateMinutes.value
          : this.estimateMinutes,
      actualMinutes: data.actualMinutes.present
          ? data.actualMinutes.value
          : this.actualMinutes,
      parentTaskId: data.parentTaskId.present
          ? data.parentTaskId.value
          : this.parentTaskId,
      goalId: data.goalId.present ? data.goalId.value : this.goalId,
      recurrenceRule: data.recurrenceRule.present
          ? data.recurrenceRule.value
          : this.recurrenceRule,
      recurrenceParentId: data.recurrenceParentId.present
          ? data.recurrenceParentId.value
          : this.recurrenceParentId,
      imagePath: data.imagePath.present ? data.imagePath.value : this.imagePath,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Task(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('status: $status, ')
          ..write('priority: $priority, ')
          ..write('category: $category, ')
          ..write('dueDate: $dueDate, ')
          ..write('dueTime: $dueTime, ')
          ..write('remindAt: $remindAt, ')
          ..write('completedAt: $completedAt, ')
          ..write('estimateMinutes: $estimateMinutes, ')
          ..write('actualMinutes: $actualMinutes, ')
          ..write('parentTaskId: $parentTaskId, ')
          ..write('goalId: $goalId, ')
          ..write('recurrenceRule: $recurrenceRule, ')
          ..write('recurrenceParentId: $recurrenceParentId, ')
          ..write('imagePath: $imagePath, ')
          ..write('sortIndex: $sortIndex')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    title,
    description,
    status,
    priority,
    category,
    dueDate,
    dueTime,
    remindAt,
    completedAt,
    estimateMinutes,
    actualMinutes,
    parentTaskId,
    goalId,
    recurrenceRule,
    recurrenceParentId,
    imagePath,
    sortIndex,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Task &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.title == this.title &&
          other.description == this.description &&
          other.status == this.status &&
          other.priority == this.priority &&
          other.category == this.category &&
          other.dueDate == this.dueDate &&
          other.dueTime == this.dueTime &&
          other.remindAt == this.remindAt &&
          other.completedAt == this.completedAt &&
          other.estimateMinutes == this.estimateMinutes &&
          other.actualMinutes == this.actualMinutes &&
          other.parentTaskId == this.parentTaskId &&
          other.goalId == this.goalId &&
          other.recurrenceRule == this.recurrenceRule &&
          other.recurrenceParentId == this.recurrenceParentId &&
          other.imagePath == this.imagePath &&
          other.sortIndex == this.sortIndex);
}

class TasksCompanion extends UpdateCompanion<Task> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> title;
  final Value<String?> description;
  final Value<int> status;
  final Value<int> priority;
  final Value<String?> category;
  final Value<String?> dueDate;
  final Value<String?> dueTime;
  final Value<int?> remindAt;
  final Value<int?> completedAt;
  final Value<int?> estimateMinutes;
  final Value<int?> actualMinutes;
  final Value<String?> parentTaskId;
  final Value<String?> goalId;
  final Value<String?> recurrenceRule;
  final Value<String?> recurrenceParentId;
  final Value<String?> imagePath;
  final Value<int> sortIndex;
  final Value<int> rowid;
  const TasksCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.title = const Value.absent(),
    this.description = const Value.absent(),
    this.status = const Value.absent(),
    this.priority = const Value.absent(),
    this.category = const Value.absent(),
    this.dueDate = const Value.absent(),
    this.dueTime = const Value.absent(),
    this.remindAt = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.estimateMinutes = const Value.absent(),
    this.actualMinutes = const Value.absent(),
    this.parentTaskId = const Value.absent(),
    this.goalId = const Value.absent(),
    this.recurrenceRule = const Value.absent(),
    this.recurrenceParentId = const Value.absent(),
    this.imagePath = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TasksCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String title,
    this.description = const Value.absent(),
    this.status = const Value.absent(),
    this.priority = const Value.absent(),
    this.category = const Value.absent(),
    this.dueDate = const Value.absent(),
    this.dueTime = const Value.absent(),
    this.remindAt = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.estimateMinutes = const Value.absent(),
    this.actualMinutes = const Value.absent(),
    this.parentTaskId = const Value.absent(),
    this.goalId = const Value.absent(),
    this.recurrenceRule = const Value.absent(),
    this.recurrenceParentId = const Value.absent(),
    this.imagePath = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       title = Value(title);
  static Insertable<Task> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? title,
    Expression<String>? description,
    Expression<int>? status,
    Expression<int>? priority,
    Expression<String>? category,
    Expression<String>? dueDate,
    Expression<String>? dueTime,
    Expression<int>? remindAt,
    Expression<int>? completedAt,
    Expression<int>? estimateMinutes,
    Expression<int>? actualMinutes,
    Expression<String>? parentTaskId,
    Expression<String>? goalId,
    Expression<String>? recurrenceRule,
    Expression<String>? recurrenceParentId,
    Expression<String>? imagePath,
    Expression<int>? sortIndex,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (status != null) 'status': status,
      if (priority != null) 'priority': priority,
      if (category != null) 'category': category,
      if (dueDate != null) 'due_date': dueDate,
      if (dueTime != null) 'due_time': dueTime,
      if (remindAt != null) 'remind_at': remindAt,
      if (completedAt != null) 'completed_at': completedAt,
      if (estimateMinutes != null) 'estimate_minutes': estimateMinutes,
      if (actualMinutes != null) 'actual_minutes': actualMinutes,
      if (parentTaskId != null) 'parent_task_id': parentTaskId,
      if (goalId != null) 'goal_id': goalId,
      if (recurrenceRule != null) 'recurrence_rule': recurrenceRule,
      if (recurrenceParentId != null)
        'recurrence_parent_id': recurrenceParentId,
      if (imagePath != null) 'image_path': imagePath,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TasksCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? title,
    Value<String?>? description,
    Value<int>? status,
    Value<int>? priority,
    Value<String?>? category,
    Value<String?>? dueDate,
    Value<String?>? dueTime,
    Value<int?>? remindAt,
    Value<int?>? completedAt,
    Value<int?>? estimateMinutes,
    Value<int?>? actualMinutes,
    Value<String?>? parentTaskId,
    Value<String?>? goalId,
    Value<String?>? recurrenceRule,
    Value<String?>? recurrenceParentId,
    Value<String?>? imagePath,
    Value<int>? sortIndex,
    Value<int>? rowid,
  }) {
    return TasksCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      category: category ?? this.category,
      dueDate: dueDate ?? this.dueDate,
      dueTime: dueTime ?? this.dueTime,
      remindAt: remindAt ?? this.remindAt,
      completedAt: completedAt ?? this.completedAt,
      estimateMinutes: estimateMinutes ?? this.estimateMinutes,
      actualMinutes: actualMinutes ?? this.actualMinutes,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      goalId: goalId ?? this.goalId,
      recurrenceRule: recurrenceRule ?? this.recurrenceRule,
      recurrenceParentId: recurrenceParentId ?? this.recurrenceParentId,
      imagePath: imagePath ?? this.imagePath,
      sortIndex: sortIndex ?? this.sortIndex,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (status.present) {
      map['status'] = Variable<int>(status.value);
    }
    if (priority.present) {
      map['priority'] = Variable<int>(priority.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (dueDate.present) {
      map['due_date'] = Variable<String>(dueDate.value);
    }
    if (dueTime.present) {
      map['due_time'] = Variable<String>(dueTime.value);
    }
    if (remindAt.present) {
      map['remind_at'] = Variable<int>(remindAt.value);
    }
    if (completedAt.present) {
      map['completed_at'] = Variable<int>(completedAt.value);
    }
    if (estimateMinutes.present) {
      map['estimate_minutes'] = Variable<int>(estimateMinutes.value);
    }
    if (actualMinutes.present) {
      map['actual_minutes'] = Variable<int>(actualMinutes.value);
    }
    if (parentTaskId.present) {
      map['parent_task_id'] = Variable<String>(parentTaskId.value);
    }
    if (goalId.present) {
      map['goal_id'] = Variable<String>(goalId.value);
    }
    if (recurrenceRule.present) {
      map['recurrence_rule'] = Variable<String>(recurrenceRule.value);
    }
    if (recurrenceParentId.present) {
      map['recurrence_parent_id'] = Variable<String>(recurrenceParentId.value);
    }
    if (imagePath.present) {
      map['image_path'] = Variable<String>(imagePath.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TasksCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('status: $status, ')
          ..write('priority: $priority, ')
          ..write('category: $category, ')
          ..write('dueDate: $dueDate, ')
          ..write('dueTime: $dueTime, ')
          ..write('remindAt: $remindAt, ')
          ..write('completedAt: $completedAt, ')
          ..write('estimateMinutes: $estimateMinutes, ')
          ..write('actualMinutes: $actualMinutes, ')
          ..write('parentTaskId: $parentTaskId, ')
          ..write('goalId: $goalId, ')
          ..write('recurrenceRule: $recurrenceRule, ')
          ..write('recurrenceParentId: $recurrenceParentId, ')
          ..write('imagePath: $imagePath, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GoalsTable extends Goals with TableInfo<$GoalsTable, Goal> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GoalsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(
      minTextLength: 1,
      maxTextLength: 300,
    ),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _whyNoteMeta = const VerificationMeta(
    'whyNote',
  );
  @override
  late final GeneratedColumn<String> whyNote = GeneratedColumn<String>(
    'why_note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _targetDateMeta = const VerificationMeta(
    'targetDate',
  );
  @override
  late final GeneratedColumn<String> targetDate = GeneratedColumn<String>(
    'target_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<int> status = GeneratedColumn<int>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _quoteMeta = const VerificationMeta('quote');
  @override
  late final GeneratedColumn<String> quote = GeneratedColumn<String>(
    'quote',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _coverImagePathMeta = const VerificationMeta(
    'coverImagePath',
  );
  @override
  late final GeneratedColumn<String> coverImagePath = GeneratedColumn<String>(
    'cover_image_path',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _progressModeMeta = const VerificationMeta(
    'progressMode',
  );
  @override
  late final GeneratedColumn<int> progressMode = GeneratedColumn<int>(
    'progress_mode',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _manualProgressMeta = const VerificationMeta(
    'manualProgress',
  );
  @override
  late final GeneratedColumn<int> manualProgress = GeneratedColumn<int>(
    'manual_progress',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _completedAtMeta = const VerificationMeta(
    'completedAt',
  );
  @override
  late final GeneratedColumn<int> completedAt = GeneratedColumn<int>(
    'completed_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    name,
    description,
    whyNote,
    targetDate,
    status,
    quote,
    coverImagePath,
    progressMode,
    manualProgress,
    completedAt,
    sortIndex,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'goals';
  @override
  VerificationContext validateIntegrity(
    Insertable<Goal> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('why_note')) {
      context.handle(
        _whyNoteMeta,
        whyNote.isAcceptableOrUnknown(data['why_note']!, _whyNoteMeta),
      );
    }
    if (data.containsKey('target_date')) {
      context.handle(
        _targetDateMeta,
        targetDate.isAcceptableOrUnknown(data['target_date']!, _targetDateMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('quote')) {
      context.handle(
        _quoteMeta,
        quote.isAcceptableOrUnknown(data['quote']!, _quoteMeta),
      );
    }
    if (data.containsKey('cover_image_path')) {
      context.handle(
        _coverImagePathMeta,
        coverImagePath.isAcceptableOrUnknown(
          data['cover_image_path']!,
          _coverImagePathMeta,
        ),
      );
    }
    if (data.containsKey('progress_mode')) {
      context.handle(
        _progressModeMeta,
        progressMode.isAcceptableOrUnknown(
          data['progress_mode']!,
          _progressModeMeta,
        ),
      );
    }
    if (data.containsKey('manual_progress')) {
      context.handle(
        _manualProgressMeta,
        manualProgress.isAcceptableOrUnknown(
          data['manual_progress']!,
          _manualProgressMeta,
        ),
      );
    }
    if (data.containsKey('completed_at')) {
      context.handle(
        _completedAtMeta,
        completedAt.isAcceptableOrUnknown(
          data['completed_at']!,
          _completedAtMeta,
        ),
      );
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Goal map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Goal(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      ),
      whyNote: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}why_note'],
      ),
      targetDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}target_date'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}status'],
      )!,
      quote: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}quote'],
      ),
      coverImagePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}cover_image_path'],
      ),
      progressMode: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}progress_mode'],
      )!,
      manualProgress: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}manual_progress'],
      )!,
      completedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}completed_at'],
      ),
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
    );
  }

  @override
  $GoalsTable createAlias(String alias) {
    return $GoalsTable(attachedDatabase, alias);
  }
}

class Goal extends DataClass implements Insertable<Goal> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String name;
  final String? description;

  /// The "why". Surfaced when a goal is at risk.
  final String? whyNote;
  final String? targetDate;

  /// [GoalStatus]
  final int status;
  final String? quote;
  final String? coverImagePath;

  /// [GoalProgressMode]
  final int progressMode;

  /// Only consulted when [progressMode] is manual.
  final int manualProgress;
  final int? completedAt;
  final int sortIndex;
  const Goal({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.name,
    this.description,
    this.whyNote,
    this.targetDate,
    required this.status,
    this.quote,
    this.coverImagePath,
    required this.progressMode,
    required this.manualProgress,
    this.completedAt,
    required this.sortIndex,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    if (!nullToAbsent || whyNote != null) {
      map['why_note'] = Variable<String>(whyNote);
    }
    if (!nullToAbsent || targetDate != null) {
      map['target_date'] = Variable<String>(targetDate);
    }
    map['status'] = Variable<int>(status);
    if (!nullToAbsent || quote != null) {
      map['quote'] = Variable<String>(quote);
    }
    if (!nullToAbsent || coverImagePath != null) {
      map['cover_image_path'] = Variable<String>(coverImagePath);
    }
    map['progress_mode'] = Variable<int>(progressMode);
    map['manual_progress'] = Variable<int>(manualProgress);
    if (!nullToAbsent || completedAt != null) {
      map['completed_at'] = Variable<int>(completedAt);
    }
    map['sort_index'] = Variable<int>(sortIndex);
    return map;
  }

  GoalsCompanion toCompanion(bool nullToAbsent) {
    return GoalsCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      name: Value(name),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      whyNote: whyNote == null && nullToAbsent
          ? const Value.absent()
          : Value(whyNote),
      targetDate: targetDate == null && nullToAbsent
          ? const Value.absent()
          : Value(targetDate),
      status: Value(status),
      quote: quote == null && nullToAbsent
          ? const Value.absent()
          : Value(quote),
      coverImagePath: coverImagePath == null && nullToAbsent
          ? const Value.absent()
          : Value(coverImagePath),
      progressMode: Value(progressMode),
      manualProgress: Value(manualProgress),
      completedAt: completedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(completedAt),
      sortIndex: Value(sortIndex),
    );
  }

  factory Goal.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Goal(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      name: serializer.fromJson<String>(json['name']),
      description: serializer.fromJson<String?>(json['description']),
      whyNote: serializer.fromJson<String?>(json['whyNote']),
      targetDate: serializer.fromJson<String?>(json['targetDate']),
      status: serializer.fromJson<int>(json['status']),
      quote: serializer.fromJson<String?>(json['quote']),
      coverImagePath: serializer.fromJson<String?>(json['coverImagePath']),
      progressMode: serializer.fromJson<int>(json['progressMode']),
      manualProgress: serializer.fromJson<int>(json['manualProgress']),
      completedAt: serializer.fromJson<int?>(json['completedAt']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'name': serializer.toJson<String>(name),
      'description': serializer.toJson<String?>(description),
      'whyNote': serializer.toJson<String?>(whyNote),
      'targetDate': serializer.toJson<String?>(targetDate),
      'status': serializer.toJson<int>(status),
      'quote': serializer.toJson<String?>(quote),
      'coverImagePath': serializer.toJson<String?>(coverImagePath),
      'progressMode': serializer.toJson<int>(progressMode),
      'manualProgress': serializer.toJson<int>(manualProgress),
      'completedAt': serializer.toJson<int?>(completedAt),
      'sortIndex': serializer.toJson<int>(sortIndex),
    };
  }

  Goal copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? name,
    Value<String?> description = const Value.absent(),
    Value<String?> whyNote = const Value.absent(),
    Value<String?> targetDate = const Value.absent(),
    int? status,
    Value<String?> quote = const Value.absent(),
    Value<String?> coverImagePath = const Value.absent(),
    int? progressMode,
    int? manualProgress,
    Value<int?> completedAt = const Value.absent(),
    int? sortIndex,
  }) => Goal(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    name: name ?? this.name,
    description: description.present ? description.value : this.description,
    whyNote: whyNote.present ? whyNote.value : this.whyNote,
    targetDate: targetDate.present ? targetDate.value : this.targetDate,
    status: status ?? this.status,
    quote: quote.present ? quote.value : this.quote,
    coverImagePath: coverImagePath.present
        ? coverImagePath.value
        : this.coverImagePath,
    progressMode: progressMode ?? this.progressMode,
    manualProgress: manualProgress ?? this.manualProgress,
    completedAt: completedAt.present ? completedAt.value : this.completedAt,
    sortIndex: sortIndex ?? this.sortIndex,
  );
  Goal copyWithCompanion(GoalsCompanion data) {
    return Goal(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      name: data.name.present ? data.name.value : this.name,
      description: data.description.present
          ? data.description.value
          : this.description,
      whyNote: data.whyNote.present ? data.whyNote.value : this.whyNote,
      targetDate: data.targetDate.present
          ? data.targetDate.value
          : this.targetDate,
      status: data.status.present ? data.status.value : this.status,
      quote: data.quote.present ? data.quote.value : this.quote,
      coverImagePath: data.coverImagePath.present
          ? data.coverImagePath.value
          : this.coverImagePath,
      progressMode: data.progressMode.present
          ? data.progressMode.value
          : this.progressMode,
      manualProgress: data.manualProgress.present
          ? data.manualProgress.value
          : this.manualProgress,
      completedAt: data.completedAt.present
          ? data.completedAt.value
          : this.completedAt,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Goal(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
          ..write('whyNote: $whyNote, ')
          ..write('targetDate: $targetDate, ')
          ..write('status: $status, ')
          ..write('quote: $quote, ')
          ..write('coverImagePath: $coverImagePath, ')
          ..write('progressMode: $progressMode, ')
          ..write('manualProgress: $manualProgress, ')
          ..write('completedAt: $completedAt, ')
          ..write('sortIndex: $sortIndex')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    name,
    description,
    whyNote,
    targetDate,
    status,
    quote,
    coverImagePath,
    progressMode,
    manualProgress,
    completedAt,
    sortIndex,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Goal &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.name == this.name &&
          other.description == this.description &&
          other.whyNote == this.whyNote &&
          other.targetDate == this.targetDate &&
          other.status == this.status &&
          other.quote == this.quote &&
          other.coverImagePath == this.coverImagePath &&
          other.progressMode == this.progressMode &&
          other.manualProgress == this.manualProgress &&
          other.completedAt == this.completedAt &&
          other.sortIndex == this.sortIndex);
}

class GoalsCompanion extends UpdateCompanion<Goal> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> name;
  final Value<String?> description;
  final Value<String?> whyNote;
  final Value<String?> targetDate;
  final Value<int> status;
  final Value<String?> quote;
  final Value<String?> coverImagePath;
  final Value<int> progressMode;
  final Value<int> manualProgress;
  final Value<int?> completedAt;
  final Value<int> sortIndex;
  final Value<int> rowid;
  const GoalsCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.name = const Value.absent(),
    this.description = const Value.absent(),
    this.whyNote = const Value.absent(),
    this.targetDate = const Value.absent(),
    this.status = const Value.absent(),
    this.quote = const Value.absent(),
    this.coverImagePath = const Value.absent(),
    this.progressMode = const Value.absent(),
    this.manualProgress = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GoalsCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String name,
    this.description = const Value.absent(),
    this.whyNote = const Value.absent(),
    this.targetDate = const Value.absent(),
    this.status = const Value.absent(),
    this.quote = const Value.absent(),
    this.coverImagePath = const Value.absent(),
    this.progressMode = const Value.absent(),
    this.manualProgress = const Value.absent(),
    this.completedAt = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       name = Value(name);
  static Insertable<Goal> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? name,
    Expression<String>? description,
    Expression<String>? whyNote,
    Expression<String>? targetDate,
    Expression<int>? status,
    Expression<String>? quote,
    Expression<String>? coverImagePath,
    Expression<int>? progressMode,
    Expression<int>? manualProgress,
    Expression<int>? completedAt,
    Expression<int>? sortIndex,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (whyNote != null) 'why_note': whyNote,
      if (targetDate != null) 'target_date': targetDate,
      if (status != null) 'status': status,
      if (quote != null) 'quote': quote,
      if (coverImagePath != null) 'cover_image_path': coverImagePath,
      if (progressMode != null) 'progress_mode': progressMode,
      if (manualProgress != null) 'manual_progress': manualProgress,
      if (completedAt != null) 'completed_at': completedAt,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GoalsCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? name,
    Value<String?>? description,
    Value<String?>? whyNote,
    Value<String?>? targetDate,
    Value<int>? status,
    Value<String?>? quote,
    Value<String?>? coverImagePath,
    Value<int>? progressMode,
    Value<int>? manualProgress,
    Value<int?>? completedAt,
    Value<int>? sortIndex,
    Value<int>? rowid,
  }) {
    return GoalsCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      name: name ?? this.name,
      description: description ?? this.description,
      whyNote: whyNote ?? this.whyNote,
      targetDate: targetDate ?? this.targetDate,
      status: status ?? this.status,
      quote: quote ?? this.quote,
      coverImagePath: coverImagePath ?? this.coverImagePath,
      progressMode: progressMode ?? this.progressMode,
      manualProgress: manualProgress ?? this.manualProgress,
      completedAt: completedAt ?? this.completedAt,
      sortIndex: sortIndex ?? this.sortIndex,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (whyNote.present) {
      map['why_note'] = Variable<String>(whyNote.value);
    }
    if (targetDate.present) {
      map['target_date'] = Variable<String>(targetDate.value);
    }
    if (status.present) {
      map['status'] = Variable<int>(status.value);
    }
    if (quote.present) {
      map['quote'] = Variable<String>(quote.value);
    }
    if (coverImagePath.present) {
      map['cover_image_path'] = Variable<String>(coverImagePath.value);
    }
    if (progressMode.present) {
      map['progress_mode'] = Variable<int>(progressMode.value);
    }
    if (manualProgress.present) {
      map['manual_progress'] = Variable<int>(manualProgress.value);
    }
    if (completedAt.present) {
      map['completed_at'] = Variable<int>(completedAt.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GoalsCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
          ..write('whyNote: $whyNote, ')
          ..write('targetDate: $targetDate, ')
          ..write('status: $status, ')
          ..write('quote: $quote, ')
          ..write('coverImagePath: $coverImagePath, ')
          ..write('progressMode: $progressMode, ')
          ..write('manualProgress: $manualProgress, ')
          ..write('completedAt: $completedAt, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GoalMilestonesTable extends GoalMilestones
    with TableInfo<$GoalMilestonesTable, GoalMilestone> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GoalMilestonesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _goalIdMeta = const VerificationMeta('goalId');
  @override
  late final GeneratedColumn<String> goalId = GeneratedColumn<String>(
    'goal_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES goals (id)',
    ),
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _targetDateMeta = const VerificationMeta(
    'targetDate',
  );
  @override
  late final GeneratedColumn<String> targetDate = GeneratedColumn<String>(
    'target_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _doneMeta = const VerificationMeta('done');
  @override
  late final GeneratedColumn<bool> done = GeneratedColumn<bool>(
    'done',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("done" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _doneAtMeta = const VerificationMeta('doneAt');
  @override
  late final GeneratedColumn<int> doneAt = GeneratedColumn<int>(
    'done_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    goalId,
    title,
    targetDate,
    done,
    doneAt,
    sortIndex,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'goal_milestones';
  @override
  VerificationContext validateIntegrity(
    Insertable<GoalMilestone> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('goal_id')) {
      context.handle(
        _goalIdMeta,
        goalId.isAcceptableOrUnknown(data['goal_id']!, _goalIdMeta),
      );
    } else if (isInserting) {
      context.missing(_goalIdMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('target_date')) {
      context.handle(
        _targetDateMeta,
        targetDate.isAcceptableOrUnknown(data['target_date']!, _targetDateMeta),
      );
    }
    if (data.containsKey('done')) {
      context.handle(
        _doneMeta,
        done.isAcceptableOrUnknown(data['done']!, _doneMeta),
      );
    }
    if (data.containsKey('done_at')) {
      context.handle(
        _doneAtMeta,
        doneAt.isAcceptableOrUnknown(data['done_at']!, _doneAtMeta),
      );
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  GoalMilestone map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GoalMilestone(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      goalId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}goal_id'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      targetDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}target_date'],
      ),
      done: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}done'],
      )!,
      doneAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}done_at'],
      ),
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
    );
  }

  @override
  $GoalMilestonesTable createAlias(String alias) {
    return $GoalMilestonesTable(attachedDatabase, alias);
  }
}

class GoalMilestone extends DataClass implements Insertable<GoalMilestone> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String goalId;
  final String title;
  final String? targetDate;
  final bool done;
  final int? doneAt;
  final int sortIndex;
  const GoalMilestone({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.goalId,
    required this.title,
    this.targetDate,
    required this.done,
    this.doneAt,
    required this.sortIndex,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['goal_id'] = Variable<String>(goalId);
    map['title'] = Variable<String>(title);
    if (!nullToAbsent || targetDate != null) {
      map['target_date'] = Variable<String>(targetDate);
    }
    map['done'] = Variable<bool>(done);
    if (!nullToAbsent || doneAt != null) {
      map['done_at'] = Variable<int>(doneAt);
    }
    map['sort_index'] = Variable<int>(sortIndex);
    return map;
  }

  GoalMilestonesCompanion toCompanion(bool nullToAbsent) {
    return GoalMilestonesCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      goalId: Value(goalId),
      title: Value(title),
      targetDate: targetDate == null && nullToAbsent
          ? const Value.absent()
          : Value(targetDate),
      done: Value(done),
      doneAt: doneAt == null && nullToAbsent
          ? const Value.absent()
          : Value(doneAt),
      sortIndex: Value(sortIndex),
    );
  }

  factory GoalMilestone.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GoalMilestone(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      goalId: serializer.fromJson<String>(json['goalId']),
      title: serializer.fromJson<String>(json['title']),
      targetDate: serializer.fromJson<String?>(json['targetDate']),
      done: serializer.fromJson<bool>(json['done']),
      doneAt: serializer.fromJson<int?>(json['doneAt']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'goalId': serializer.toJson<String>(goalId),
      'title': serializer.toJson<String>(title),
      'targetDate': serializer.toJson<String?>(targetDate),
      'done': serializer.toJson<bool>(done),
      'doneAt': serializer.toJson<int?>(doneAt),
      'sortIndex': serializer.toJson<int>(sortIndex),
    };
  }

  GoalMilestone copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? goalId,
    String? title,
    Value<String?> targetDate = const Value.absent(),
    bool? done,
    Value<int?> doneAt = const Value.absent(),
    int? sortIndex,
  }) => GoalMilestone(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    goalId: goalId ?? this.goalId,
    title: title ?? this.title,
    targetDate: targetDate.present ? targetDate.value : this.targetDate,
    done: done ?? this.done,
    doneAt: doneAt.present ? doneAt.value : this.doneAt,
    sortIndex: sortIndex ?? this.sortIndex,
  );
  GoalMilestone copyWithCompanion(GoalMilestonesCompanion data) {
    return GoalMilestone(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      goalId: data.goalId.present ? data.goalId.value : this.goalId,
      title: data.title.present ? data.title.value : this.title,
      targetDate: data.targetDate.present
          ? data.targetDate.value
          : this.targetDate,
      done: data.done.present ? data.done.value : this.done,
      doneAt: data.doneAt.present ? data.doneAt.value : this.doneAt,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GoalMilestone(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('goalId: $goalId, ')
          ..write('title: $title, ')
          ..write('targetDate: $targetDate, ')
          ..write('done: $done, ')
          ..write('doneAt: $doneAt, ')
          ..write('sortIndex: $sortIndex')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    goalId,
    title,
    targetDate,
    done,
    doneAt,
    sortIndex,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GoalMilestone &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.goalId == this.goalId &&
          other.title == this.title &&
          other.targetDate == this.targetDate &&
          other.done == this.done &&
          other.doneAt == this.doneAt &&
          other.sortIndex == this.sortIndex);
}

class GoalMilestonesCompanion extends UpdateCompanion<GoalMilestone> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> goalId;
  final Value<String> title;
  final Value<String?> targetDate;
  final Value<bool> done;
  final Value<int?> doneAt;
  final Value<int> sortIndex;
  final Value<int> rowid;
  const GoalMilestonesCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.goalId = const Value.absent(),
    this.title = const Value.absent(),
    this.targetDate = const Value.absent(),
    this.done = const Value.absent(),
    this.doneAt = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GoalMilestonesCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String goalId,
    required String title,
    this.targetDate = const Value.absent(),
    this.done = const Value.absent(),
    this.doneAt = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       goalId = Value(goalId),
       title = Value(title);
  static Insertable<GoalMilestone> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? goalId,
    Expression<String>? title,
    Expression<String>? targetDate,
    Expression<bool>? done,
    Expression<int>? doneAt,
    Expression<int>? sortIndex,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (goalId != null) 'goal_id': goalId,
      if (title != null) 'title': title,
      if (targetDate != null) 'target_date': targetDate,
      if (done != null) 'done': done,
      if (doneAt != null) 'done_at': doneAt,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GoalMilestonesCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? goalId,
    Value<String>? title,
    Value<String?>? targetDate,
    Value<bool>? done,
    Value<int?>? doneAt,
    Value<int>? sortIndex,
    Value<int>? rowid,
  }) {
    return GoalMilestonesCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      goalId: goalId ?? this.goalId,
      title: title ?? this.title,
      targetDate: targetDate ?? this.targetDate,
      done: done ?? this.done,
      doneAt: doneAt ?? this.doneAt,
      sortIndex: sortIndex ?? this.sortIndex,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (goalId.present) {
      map['goal_id'] = Variable<String>(goalId.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (targetDate.present) {
      map['target_date'] = Variable<String>(targetDate.value);
    }
    if (done.present) {
      map['done'] = Variable<bool>(done.value);
    }
    if (doneAt.present) {
      map['done_at'] = Variable<int>(doneAt.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GoalMilestonesCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('goalId: $goalId, ')
          ..write('title: $title, ')
          ..write('targetDate: $targetDate, ')
          ..write('done: $done, ')
          ..write('doneAt: $doneAt, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GoalLinksTable extends GoalLinks
    with TableInfo<$GoalLinksTable, GoalLink> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GoalLinksTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _goalIdMeta = const VerificationMeta('goalId');
  @override
  late final GeneratedColumn<String> goalId = GeneratedColumn<String>(
    'goal_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES goals (id)',
    ),
  );
  static const VerificationMeta _entityTypeMeta = const VerificationMeta(
    'entityType',
  );
  @override
  late final GeneratedColumn<int> entityType = GeneratedColumn<int>(
    'entity_type',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entityIdMeta = const VerificationMeta(
    'entityId',
  );
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
    'entity_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _weightMeta = const VerificationMeta('weight');
  @override
  late final GeneratedColumn<double> weight = GeneratedColumn<double>(
    'weight',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    goalId,
    entityType,
    entityId,
    weight,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'goal_links';
  @override
  VerificationContext validateIntegrity(
    Insertable<GoalLink> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('goal_id')) {
      context.handle(
        _goalIdMeta,
        goalId.isAcceptableOrUnknown(data['goal_id']!, _goalIdMeta),
      );
    } else if (isInserting) {
      context.missing(_goalIdMeta);
    }
    if (data.containsKey('entity_type')) {
      context.handle(
        _entityTypeMeta,
        entityType.isAcceptableOrUnknown(data['entity_type']!, _entityTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_entityTypeMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(
        _entityIdMeta,
        entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta),
      );
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('weight')) {
      context.handle(
        _weightMeta,
        weight.isAcceptableOrUnknown(data['weight']!, _weightMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  GoalLink map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GoalLink(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      goalId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}goal_id'],
      )!,
      entityType: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}entity_type'],
      )!,
      entityId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entity_id'],
      )!,
      weight: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}weight'],
      )!,
    );
  }

  @override
  $GoalLinksTable createAlias(String alias) {
    return $GoalLinksTable(attachedDatabase, alias);
  }
}

class GoalLink extends DataClass implements Insertable<GoalLink> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final String goalId;

  /// [LinkedEntity]
  final int entityType;
  final String entityId;
  final double weight;
  const GoalLink({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.goalId,
    required this.entityType,
    required this.entityId,
    required this.weight,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['goal_id'] = Variable<String>(goalId);
    map['entity_type'] = Variable<int>(entityType);
    map['entity_id'] = Variable<String>(entityId);
    map['weight'] = Variable<double>(weight);
    return map;
  }

  GoalLinksCompanion toCompanion(bool nullToAbsent) {
    return GoalLinksCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      goalId: Value(goalId),
      entityType: Value(entityType),
      entityId: Value(entityId),
      weight: Value(weight),
    );
  }

  factory GoalLink.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GoalLink(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      goalId: serializer.fromJson<String>(json['goalId']),
      entityType: serializer.fromJson<int>(json['entityType']),
      entityId: serializer.fromJson<String>(json['entityId']),
      weight: serializer.fromJson<double>(json['weight']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'goalId': serializer.toJson<String>(goalId),
      'entityType': serializer.toJson<int>(entityType),
      'entityId': serializer.toJson<String>(entityId),
      'weight': serializer.toJson<double>(weight),
    };
  }

  GoalLink copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? goalId,
    int? entityType,
    String? entityId,
    double? weight,
  }) => GoalLink(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    goalId: goalId ?? this.goalId,
    entityType: entityType ?? this.entityType,
    entityId: entityId ?? this.entityId,
    weight: weight ?? this.weight,
  );
  GoalLink copyWithCompanion(GoalLinksCompanion data) {
    return GoalLink(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      goalId: data.goalId.present ? data.goalId.value : this.goalId,
      entityType: data.entityType.present
          ? data.entityType.value
          : this.entityType,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      weight: data.weight.present ? data.weight.value : this.weight,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GoalLink(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('goalId: $goalId, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('weight: $weight')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    goalId,
    entityType,
    entityId,
    weight,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GoalLink &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.goalId == this.goalId &&
          other.entityType == this.entityType &&
          other.entityId == this.entityId &&
          other.weight == this.weight);
}

class GoalLinksCompanion extends UpdateCompanion<GoalLink> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> goalId;
  final Value<int> entityType;
  final Value<String> entityId;
  final Value<double> weight;
  final Value<int> rowid;
  const GoalLinksCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.goalId = const Value.absent(),
    this.entityType = const Value.absent(),
    this.entityId = const Value.absent(),
    this.weight = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GoalLinksCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String goalId,
    required int entityType,
    required String entityId,
    this.weight = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       goalId = Value(goalId),
       entityType = Value(entityType),
       entityId = Value(entityId);
  static Insertable<GoalLink> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? goalId,
    Expression<int>? entityType,
    Expression<String>? entityId,
    Expression<double>? weight,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (goalId != null) 'goal_id': goalId,
      if (entityType != null) 'entity_type': entityType,
      if (entityId != null) 'entity_id': entityId,
      if (weight != null) 'weight': weight,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GoalLinksCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? goalId,
    Value<int>? entityType,
    Value<String>? entityId,
    Value<double>? weight,
    Value<int>? rowid,
  }) {
    return GoalLinksCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      goalId: goalId ?? this.goalId,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      weight: weight ?? this.weight,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (goalId.present) {
      map['goal_id'] = Variable<String>(goalId.value);
    }
    if (entityType.present) {
      map['entity_type'] = Variable<int>(entityType.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (weight.present) {
      map['weight'] = Variable<double>(weight.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GoalLinksCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('goalId: $goalId, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('weight: $weight, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $FocusSessionsTable extends FocusSessions
    with TableInfo<$FocusSessionsTable, FocusSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $FocusSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _startedAtMeta = const VerificationMeta(
    'startedAt',
  );
  @override
  late final GeneratedColumn<int> startedAt = GeneratedColumn<int>(
    'started_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _endedAtMeta = const VerificationMeta(
    'endedAt',
  );
  @override
  late final GeneratedColumn<int> endedAt = GeneratedColumn<int>(
    'ended_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _plannedSecondsMeta = const VerificationMeta(
    'plannedSeconds',
  );
  @override
  late final GeneratedColumn<int> plannedSeconds = GeneratedColumn<int>(
    'planned_seconds',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _actualSecondsMeta = const VerificationMeta(
    'actualSeconds',
  );
  @override
  late final GeneratedColumn<int> actualSeconds = GeneratedColumn<int>(
    'actual_seconds',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _resumedAtMeta = const VerificationMeta(
    'resumedAt',
  );
  @override
  late final GeneratedColumn<int> resumedAt = GeneratedColumn<int>(
    'resumed_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _interruptionsMeta = const VerificationMeta(
    'interruptions',
  );
  @override
  late final GeneratedColumn<int> interruptions = GeneratedColumn<int>(
    'interruptions',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _completedMeta = const VerificationMeta(
    'completed',
  );
  @override
  late final GeneratedColumn<bool> completed = GeneratedColumn<bool>(
    'completed',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("completed" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _habitIdMeta = const VerificationMeta(
    'habitId',
  );
  @override
  late final GeneratedColumn<String> habitId = GeneratedColumn<String>(
    'habit_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _taskIdMeta = const VerificationMeta('taskId');
  @override
  late final GeneratedColumn<String> taskId = GeneratedColumn<String>(
    'task_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _goalIdMeta = const VerificationMeta('goalId');
  @override
  late final GeneratedColumn<String> goalId = GeneratedColumn<String>(
    'goal_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _labelMeta = const VerificationMeta('label');
  @override
  late final GeneratedColumn<String> label = GeneratedColumn<String>(
    'label',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _localDateMeta = const VerificationMeta(
    'localDate',
  );
  @override
  late final GeneratedColumn<String> localDate = GeneratedColumn<String>(
    'local_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    startedAt,
    endedAt,
    plannedSeconds,
    actualSeconds,
    resumedAt,
    interruptions,
    completed,
    habitId,
    taskId,
    goalId,
    label,
    localDate,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'focus_sessions';
  @override
  VerificationContext validateIntegrity(
    Insertable<FocusSession> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('started_at')) {
      context.handle(
        _startedAtMeta,
        startedAt.isAcceptableOrUnknown(data['started_at']!, _startedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_startedAtMeta);
    }
    if (data.containsKey('ended_at')) {
      context.handle(
        _endedAtMeta,
        endedAt.isAcceptableOrUnknown(data['ended_at']!, _endedAtMeta),
      );
    }
    if (data.containsKey('planned_seconds')) {
      context.handle(
        _plannedSecondsMeta,
        plannedSeconds.isAcceptableOrUnknown(
          data['planned_seconds']!,
          _plannedSecondsMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_plannedSecondsMeta);
    }
    if (data.containsKey('actual_seconds')) {
      context.handle(
        _actualSecondsMeta,
        actualSeconds.isAcceptableOrUnknown(
          data['actual_seconds']!,
          _actualSecondsMeta,
        ),
      );
    }
    if (data.containsKey('resumed_at')) {
      context.handle(
        _resumedAtMeta,
        resumedAt.isAcceptableOrUnknown(data['resumed_at']!, _resumedAtMeta),
      );
    }
    if (data.containsKey('interruptions')) {
      context.handle(
        _interruptionsMeta,
        interruptions.isAcceptableOrUnknown(
          data['interruptions']!,
          _interruptionsMeta,
        ),
      );
    }
    if (data.containsKey('completed')) {
      context.handle(
        _completedMeta,
        completed.isAcceptableOrUnknown(data['completed']!, _completedMeta),
      );
    }
    if (data.containsKey('habit_id')) {
      context.handle(
        _habitIdMeta,
        habitId.isAcceptableOrUnknown(data['habit_id']!, _habitIdMeta),
      );
    }
    if (data.containsKey('task_id')) {
      context.handle(
        _taskIdMeta,
        taskId.isAcceptableOrUnknown(data['task_id']!, _taskIdMeta),
      );
    }
    if (data.containsKey('goal_id')) {
      context.handle(
        _goalIdMeta,
        goalId.isAcceptableOrUnknown(data['goal_id']!, _goalIdMeta),
      );
    }
    if (data.containsKey('label')) {
      context.handle(
        _labelMeta,
        label.isAcceptableOrUnknown(data['label']!, _labelMeta),
      );
    }
    if (data.containsKey('local_date')) {
      context.handle(
        _localDateMeta,
        localDate.isAcceptableOrUnknown(data['local_date']!, _localDateMeta),
      );
    } else if (isInserting) {
      context.missing(_localDateMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  FocusSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return FocusSession(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      startedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}started_at'],
      )!,
      endedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}ended_at'],
      ),
      plannedSeconds: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}planned_seconds'],
      )!,
      actualSeconds: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actual_seconds'],
      )!,
      resumedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}resumed_at'],
      ),
      interruptions: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}interruptions'],
      )!,
      completed: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}completed'],
      )!,
      habitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}habit_id'],
      ),
      taskId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}task_id'],
      ),
      goalId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}goal_id'],
      ),
      label: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}label'],
      ),
      localDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_date'],
      )!,
    );
  }

  @override
  $FocusSessionsTable createAlias(String alias) {
    return $FocusSessionsTable(attachedDatabase, alias);
  }
}

class FocusSession extends DataClass implements Insertable<FocusSession> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;
  final int startedAt;
  final int? endedAt;
  final int plannedSeconds;

  /// Focus time actually accrued, excluding pauses. Advanced only when a run
  /// span closes, so it is always a settled number rather than a live estimate.
  final int actualSeconds;

  /// Start of the current running span, or null while paused.
  ///
  /// This is what makes the timer wall-clock based rather than tick-based. A
  /// `Timer.periodic` counter stops advancing the moment Android freezes the
  /// process, so a 25-minute session spent with the screen off would be
  /// credited as seconds — which is precisely the case a focus timer exists to
  /// measure. Elapsed is always `actualSeconds + (now - resumedAt)`.
  final int? resumedAt;
  final int interruptions;
  final bool completed;
  final String? habitId;
  final String? taskId;
  final String? goalId;

  /// A free-text "what for", when the block is for something that is neither
  /// a goal nor a habit. Exactly one of label/goalId/habitId/taskId is set.
  final String? label;

  /// Denormalized so daily rollups don't have to convert timestamps.
  final String localDate;
  const FocusSession({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.startedAt,
    this.endedAt,
    required this.plannedSeconds,
    required this.actualSeconds,
    this.resumedAt,
    required this.interruptions,
    required this.completed,
    this.habitId,
    this.taskId,
    this.goalId,
    this.label,
    required this.localDate,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['started_at'] = Variable<int>(startedAt);
    if (!nullToAbsent || endedAt != null) {
      map['ended_at'] = Variable<int>(endedAt);
    }
    map['planned_seconds'] = Variable<int>(plannedSeconds);
    map['actual_seconds'] = Variable<int>(actualSeconds);
    if (!nullToAbsent || resumedAt != null) {
      map['resumed_at'] = Variable<int>(resumedAt);
    }
    map['interruptions'] = Variable<int>(interruptions);
    map['completed'] = Variable<bool>(completed);
    if (!nullToAbsent || habitId != null) {
      map['habit_id'] = Variable<String>(habitId);
    }
    if (!nullToAbsent || taskId != null) {
      map['task_id'] = Variable<String>(taskId);
    }
    if (!nullToAbsent || goalId != null) {
      map['goal_id'] = Variable<String>(goalId);
    }
    if (!nullToAbsent || label != null) {
      map['label'] = Variable<String>(label);
    }
    map['local_date'] = Variable<String>(localDate);
    return map;
  }

  FocusSessionsCompanion toCompanion(bool nullToAbsent) {
    return FocusSessionsCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      startedAt: Value(startedAt),
      endedAt: endedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(endedAt),
      plannedSeconds: Value(plannedSeconds),
      actualSeconds: Value(actualSeconds),
      resumedAt: resumedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(resumedAt),
      interruptions: Value(interruptions),
      completed: Value(completed),
      habitId: habitId == null && nullToAbsent
          ? const Value.absent()
          : Value(habitId),
      taskId: taskId == null && nullToAbsent
          ? const Value.absent()
          : Value(taskId),
      goalId: goalId == null && nullToAbsent
          ? const Value.absent()
          : Value(goalId),
      label: label == null && nullToAbsent
          ? const Value.absent()
          : Value(label),
      localDate: Value(localDate),
    );
  }

  factory FocusSession.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return FocusSession(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      startedAt: serializer.fromJson<int>(json['startedAt']),
      endedAt: serializer.fromJson<int?>(json['endedAt']),
      plannedSeconds: serializer.fromJson<int>(json['plannedSeconds']),
      actualSeconds: serializer.fromJson<int>(json['actualSeconds']),
      resumedAt: serializer.fromJson<int?>(json['resumedAt']),
      interruptions: serializer.fromJson<int>(json['interruptions']),
      completed: serializer.fromJson<bool>(json['completed']),
      habitId: serializer.fromJson<String?>(json['habitId']),
      taskId: serializer.fromJson<String?>(json['taskId']),
      goalId: serializer.fromJson<String?>(json['goalId']),
      label: serializer.fromJson<String?>(json['label']),
      localDate: serializer.fromJson<String>(json['localDate']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'startedAt': serializer.toJson<int>(startedAt),
      'endedAt': serializer.toJson<int?>(endedAt),
      'plannedSeconds': serializer.toJson<int>(plannedSeconds),
      'actualSeconds': serializer.toJson<int>(actualSeconds),
      'resumedAt': serializer.toJson<int?>(resumedAt),
      'interruptions': serializer.toJson<int>(interruptions),
      'completed': serializer.toJson<bool>(completed),
      'habitId': serializer.toJson<String?>(habitId),
      'taskId': serializer.toJson<String?>(taskId),
      'goalId': serializer.toJson<String?>(goalId),
      'label': serializer.toJson<String?>(label),
      'localDate': serializer.toJson<String>(localDate),
    };
  }

  FocusSession copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    int? startedAt,
    Value<int?> endedAt = const Value.absent(),
    int? plannedSeconds,
    int? actualSeconds,
    Value<int?> resumedAt = const Value.absent(),
    int? interruptions,
    bool? completed,
    Value<String?> habitId = const Value.absent(),
    Value<String?> taskId = const Value.absent(),
    Value<String?> goalId = const Value.absent(),
    Value<String?> label = const Value.absent(),
    String? localDate,
  }) => FocusSession(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    startedAt: startedAt ?? this.startedAt,
    endedAt: endedAt.present ? endedAt.value : this.endedAt,
    plannedSeconds: plannedSeconds ?? this.plannedSeconds,
    actualSeconds: actualSeconds ?? this.actualSeconds,
    resumedAt: resumedAt.present ? resumedAt.value : this.resumedAt,
    interruptions: interruptions ?? this.interruptions,
    completed: completed ?? this.completed,
    habitId: habitId.present ? habitId.value : this.habitId,
    taskId: taskId.present ? taskId.value : this.taskId,
    goalId: goalId.present ? goalId.value : this.goalId,
    label: label.present ? label.value : this.label,
    localDate: localDate ?? this.localDate,
  );
  FocusSession copyWithCompanion(FocusSessionsCompanion data) {
    return FocusSession(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      startedAt: data.startedAt.present ? data.startedAt.value : this.startedAt,
      endedAt: data.endedAt.present ? data.endedAt.value : this.endedAt,
      plannedSeconds: data.plannedSeconds.present
          ? data.plannedSeconds.value
          : this.plannedSeconds,
      actualSeconds: data.actualSeconds.present
          ? data.actualSeconds.value
          : this.actualSeconds,
      resumedAt: data.resumedAt.present ? data.resumedAt.value : this.resumedAt,
      interruptions: data.interruptions.present
          ? data.interruptions.value
          : this.interruptions,
      completed: data.completed.present ? data.completed.value : this.completed,
      habitId: data.habitId.present ? data.habitId.value : this.habitId,
      taskId: data.taskId.present ? data.taskId.value : this.taskId,
      goalId: data.goalId.present ? data.goalId.value : this.goalId,
      label: data.label.present ? data.label.value : this.label,
      localDate: data.localDate.present ? data.localDate.value : this.localDate,
    );
  }

  @override
  String toString() {
    return (StringBuffer('FocusSession(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('plannedSeconds: $plannedSeconds, ')
          ..write('actualSeconds: $actualSeconds, ')
          ..write('resumedAt: $resumedAt, ')
          ..write('interruptions: $interruptions, ')
          ..write('completed: $completed, ')
          ..write('habitId: $habitId, ')
          ..write('taskId: $taskId, ')
          ..write('goalId: $goalId, ')
          ..write('label: $label, ')
          ..write('localDate: $localDate')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    startedAt,
    endedAt,
    plannedSeconds,
    actualSeconds,
    resumedAt,
    interruptions,
    completed,
    habitId,
    taskId,
    goalId,
    label,
    localDate,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FocusSession &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.startedAt == this.startedAt &&
          other.endedAt == this.endedAt &&
          other.plannedSeconds == this.plannedSeconds &&
          other.actualSeconds == this.actualSeconds &&
          other.resumedAt == this.resumedAt &&
          other.interruptions == this.interruptions &&
          other.completed == this.completed &&
          other.habitId == this.habitId &&
          other.taskId == this.taskId &&
          other.goalId == this.goalId &&
          other.label == this.label &&
          other.localDate == this.localDate);
}

class FocusSessionsCompanion extends UpdateCompanion<FocusSession> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<int> startedAt;
  final Value<int?> endedAt;
  final Value<int> plannedSeconds;
  final Value<int> actualSeconds;
  final Value<int?> resumedAt;
  final Value<int> interruptions;
  final Value<bool> completed;
  final Value<String?> habitId;
  final Value<String?> taskId;
  final Value<String?> goalId;
  final Value<String?> label;
  final Value<String> localDate;
  final Value<int> rowid;
  const FocusSessionsCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.startedAt = const Value.absent(),
    this.endedAt = const Value.absent(),
    this.plannedSeconds = const Value.absent(),
    this.actualSeconds = const Value.absent(),
    this.resumedAt = const Value.absent(),
    this.interruptions = const Value.absent(),
    this.completed = const Value.absent(),
    this.habitId = const Value.absent(),
    this.taskId = const Value.absent(),
    this.goalId = const Value.absent(),
    this.label = const Value.absent(),
    this.localDate = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  FocusSessionsCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required int startedAt,
    this.endedAt = const Value.absent(),
    required int plannedSeconds,
    this.actualSeconds = const Value.absent(),
    this.resumedAt = const Value.absent(),
    this.interruptions = const Value.absent(),
    this.completed = const Value.absent(),
    this.habitId = const Value.absent(),
    this.taskId = const Value.absent(),
    this.goalId = const Value.absent(),
    this.label = const Value.absent(),
    required String localDate,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       startedAt = Value(startedAt),
       plannedSeconds = Value(plannedSeconds),
       localDate = Value(localDate);
  static Insertable<FocusSession> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<int>? startedAt,
    Expression<int>? endedAt,
    Expression<int>? plannedSeconds,
    Expression<int>? actualSeconds,
    Expression<int>? resumedAt,
    Expression<int>? interruptions,
    Expression<bool>? completed,
    Expression<String>? habitId,
    Expression<String>? taskId,
    Expression<String>? goalId,
    Expression<String>? label,
    Expression<String>? localDate,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (startedAt != null) 'started_at': startedAt,
      if (endedAt != null) 'ended_at': endedAt,
      if (plannedSeconds != null) 'planned_seconds': plannedSeconds,
      if (actualSeconds != null) 'actual_seconds': actualSeconds,
      if (resumedAt != null) 'resumed_at': resumedAt,
      if (interruptions != null) 'interruptions': interruptions,
      if (completed != null) 'completed': completed,
      if (habitId != null) 'habit_id': habitId,
      if (taskId != null) 'task_id': taskId,
      if (goalId != null) 'goal_id': goalId,
      if (label != null) 'label': label,
      if (localDate != null) 'local_date': localDate,
      if (rowid != null) 'rowid': rowid,
    });
  }

  FocusSessionsCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<int>? startedAt,
    Value<int?>? endedAt,
    Value<int>? plannedSeconds,
    Value<int>? actualSeconds,
    Value<int?>? resumedAt,
    Value<int>? interruptions,
    Value<bool>? completed,
    Value<String?>? habitId,
    Value<String?>? taskId,
    Value<String?>? goalId,
    Value<String?>? label,
    Value<String>? localDate,
    Value<int>? rowid,
  }) {
    return FocusSessionsCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      plannedSeconds: plannedSeconds ?? this.plannedSeconds,
      actualSeconds: actualSeconds ?? this.actualSeconds,
      resumedAt: resumedAt ?? this.resumedAt,
      interruptions: interruptions ?? this.interruptions,
      completed: completed ?? this.completed,
      habitId: habitId ?? this.habitId,
      taskId: taskId ?? this.taskId,
      goalId: goalId ?? this.goalId,
      label: label ?? this.label,
      localDate: localDate ?? this.localDate,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (startedAt.present) {
      map['started_at'] = Variable<int>(startedAt.value);
    }
    if (endedAt.present) {
      map['ended_at'] = Variable<int>(endedAt.value);
    }
    if (plannedSeconds.present) {
      map['planned_seconds'] = Variable<int>(plannedSeconds.value);
    }
    if (actualSeconds.present) {
      map['actual_seconds'] = Variable<int>(actualSeconds.value);
    }
    if (resumedAt.present) {
      map['resumed_at'] = Variable<int>(resumedAt.value);
    }
    if (interruptions.present) {
      map['interruptions'] = Variable<int>(interruptions.value);
    }
    if (completed.present) {
      map['completed'] = Variable<bool>(completed.value);
    }
    if (habitId.present) {
      map['habit_id'] = Variable<String>(habitId.value);
    }
    if (taskId.present) {
      map['task_id'] = Variable<String>(taskId.value);
    }
    if (goalId.present) {
      map['goal_id'] = Variable<String>(goalId.value);
    }
    if (label.present) {
      map['label'] = Variable<String>(label.value);
    }
    if (localDate.present) {
      map['local_date'] = Variable<String>(localDate.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('FocusSessionsCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('plannedSeconds: $plannedSeconds, ')
          ..write('actualSeconds: $actualSeconds, ')
          ..write('resumedAt: $resumedAt, ')
          ..write('interruptions: $interruptions, ')
          ..write('completed: $completed, ')
          ..write('habitId: $habitId, ')
          ..write('taskId: $taskId, ')
          ..write('goalId: $goalId, ')
          ..write('label: $label, ')
          ..write('localDate: $localDate, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MoodLogsTable extends MoodLogs with TableInfo<$MoodLogsTable, MoodLog> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MoodLogsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remoteIdMeta = const VerificationMeta(
    'remoteId',
  );
  @override
  late final GeneratedColumn<String> remoteId = GeneratedColumn<String>(
    'remote_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _deletedAtMeta = const VerificationMeta(
    'deletedAt',
  );
  @override
  late final GeneratedColumn<int> deletedAt = GeneratedColumn<int>(
    'deleted_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _logDateMeta = const VerificationMeta(
    'logDate',
  );
  @override
  late final GeneratedColumn<String> logDate = GeneratedColumn<String>(
    'log_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _scoreMeta = const VerificationMeta('score');
  @override
  late final GeneratedColumn<int> score = GeneratedColumn<int>(
    'score',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _loggedAtMeta = const VerificationMeta(
    'loggedAt',
  );
  @override
  late final GeneratedColumn<int> loggedAt = GeneratedColumn<int>(
    'logged_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    logDate,
    score,
    note,
    loggedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'mood_logs';
  @override
  VerificationContext validateIntegrity(
    Insertable<MoodLog> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('remote_id')) {
      context.handle(
        _remoteIdMeta,
        remoteId.isAcceptableOrUnknown(data['remote_id']!, _remoteIdMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('deleted_at')) {
      context.handle(
        _deletedAtMeta,
        deletedAt.isAcceptableOrUnknown(data['deleted_at']!, _deletedAtMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    if (data.containsKey('log_date')) {
      context.handle(
        _logDateMeta,
        logDate.isAcceptableOrUnknown(data['log_date']!, _logDateMeta),
      );
    } else if (isInserting) {
      context.missing(_logDateMeta);
    }
    if (data.containsKey('score')) {
      context.handle(
        _scoreMeta,
        score.isAcceptableOrUnknown(data['score']!, _scoreMeta),
      );
    } else if (isInserting) {
      context.missing(_scoreMeta);
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('logged_at')) {
      context.handle(
        _loggedAtMeta,
        loggedAt.isAcceptableOrUnknown(data['logged_at']!, _loggedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_loggedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
    {logDate},
  ];
  @override
  MoodLog map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MoodLog(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      remoteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}remote_id'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
      deletedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}deleted_at'],
      ),
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
      logDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}log_date'],
      )!,
      score: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}score'],
      )!,
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      loggedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}logged_at'],
      )!,
    );
  }

  @override
  $MoodLogsTable createAlias(String alias) {
    return $MoodLogsTable(attachedDatabase, alias);
  }
}

class MoodLog extends DataClass implements Insertable<MoodLog> {
  final String id;

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  final String? remoteId;
  final int createdAt;
  final int updatedAt;
  final int? deletedAt;

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  final bool dirty;

  /// 'YYYY-MM-DD' in the user's own timezone. Unique — see the class note.
  final String logDate;

  /// 1 (terrible) to 5 (excellent). Constrained in the repository rather than
  /// by a CHECK, matching how `habit_logs.value` is handled.
  final int score;

  /// Optional one-liner. Null is the normal case.
  final String? note;

  /// When it was actually recorded, as opposed to which day it describes.
  /// A mood logged at 11pm for today and one backfilled tomorrow morning are
  /// different things, and only this column can tell them apart.
  final int loggedAt;
  const MoodLog({
    required this.id,
    this.remoteId,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.dirty,
    required this.logDate,
    required this.score,
    this.note,
    required this.loggedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || remoteId != null) {
      map['remote_id'] = Variable<String>(remoteId);
    }
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || deletedAt != null) {
      map['deleted_at'] = Variable<int>(deletedAt);
    }
    map['dirty'] = Variable<bool>(dirty);
    map['log_date'] = Variable<String>(logDate);
    map['score'] = Variable<int>(score);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['logged_at'] = Variable<int>(loggedAt);
    return map;
  }

  MoodLogsCompanion toCompanion(bool nullToAbsent) {
    return MoodLogsCompanion(
      id: Value(id),
      remoteId: remoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(remoteId),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      deletedAt: deletedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deletedAt),
      dirty: Value(dirty),
      logDate: Value(logDate),
      score: Value(score),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      loggedAt: Value(loggedAt),
    );
  }

  factory MoodLog.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MoodLog(
      id: serializer.fromJson<String>(json['id']),
      remoteId: serializer.fromJson<String?>(json['remoteId']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      deletedAt: serializer.fromJson<int?>(json['deletedAt']),
      dirty: serializer.fromJson<bool>(json['dirty']),
      logDate: serializer.fromJson<String>(json['logDate']),
      score: serializer.fromJson<int>(json['score']),
      note: serializer.fromJson<String?>(json['note']),
      loggedAt: serializer.fromJson<int>(json['loggedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'remoteId': serializer.toJson<String?>(remoteId),
      'createdAt': serializer.toJson<int>(createdAt),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'deletedAt': serializer.toJson<int?>(deletedAt),
      'dirty': serializer.toJson<bool>(dirty),
      'logDate': serializer.toJson<String>(logDate),
      'score': serializer.toJson<int>(score),
      'note': serializer.toJson<String?>(note),
      'loggedAt': serializer.toJson<int>(loggedAt),
    };
  }

  MoodLog copyWith({
    String? id,
    Value<String?> remoteId = const Value.absent(),
    int? createdAt,
    int? updatedAt,
    Value<int?> deletedAt = const Value.absent(),
    bool? dirty,
    String? logDate,
    int? score,
    Value<String?> note = const Value.absent(),
    int? loggedAt,
  }) => MoodLog(
    id: id ?? this.id,
    remoteId: remoteId.present ? remoteId.value : this.remoteId,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    deletedAt: deletedAt.present ? deletedAt.value : this.deletedAt,
    dirty: dirty ?? this.dirty,
    logDate: logDate ?? this.logDate,
    score: score ?? this.score,
    note: note.present ? note.value : this.note,
    loggedAt: loggedAt ?? this.loggedAt,
  );
  MoodLog copyWithCompanion(MoodLogsCompanion data) {
    return MoodLog(
      id: data.id.present ? data.id.value : this.id,
      remoteId: data.remoteId.present ? data.remoteId.value : this.remoteId,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      deletedAt: data.deletedAt.present ? data.deletedAt.value : this.deletedAt,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
      logDate: data.logDate.present ? data.logDate.value : this.logDate,
      score: data.score.present ? data.score.value : this.score,
      note: data.note.present ? data.note.value : this.note,
      loggedAt: data.loggedAt.present ? data.loggedAt.value : this.loggedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MoodLog(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('logDate: $logDate, ')
          ..write('score: $score, ')
          ..write('note: $note, ')
          ..write('loggedAt: $loggedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    remoteId,
    createdAt,
    updatedAt,
    deletedAt,
    dirty,
    logDate,
    score,
    note,
    loggedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MoodLog &&
          other.id == this.id &&
          other.remoteId == this.remoteId &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.deletedAt == this.deletedAt &&
          other.dirty == this.dirty &&
          other.logDate == this.logDate &&
          other.score == this.score &&
          other.note == this.note &&
          other.loggedAt == this.loggedAt);
}

class MoodLogsCompanion extends UpdateCompanion<MoodLog> {
  final Value<String> id;
  final Value<String?> remoteId;
  final Value<int> createdAt;
  final Value<int> updatedAt;
  final Value<int?> deletedAt;
  final Value<bool> dirty;
  final Value<String> logDate;
  final Value<int> score;
  final Value<String?> note;
  final Value<int> loggedAt;
  final Value<int> rowid;
  const MoodLogsCompanion({
    this.id = const Value.absent(),
    this.remoteId = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    this.logDate = const Value.absent(),
    this.score = const Value.absent(),
    this.note = const Value.absent(),
    this.loggedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MoodLogsCompanion.insert({
    required String id,
    this.remoteId = const Value.absent(),
    required int createdAt,
    required int updatedAt,
    this.deletedAt = const Value.absent(),
    this.dirty = const Value.absent(),
    required String logDate,
    required int score,
    this.note = const Value.absent(),
    required int loggedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt),
       logDate = Value(logDate),
       score = Value(score),
       loggedAt = Value(loggedAt);
  static Insertable<MoodLog> custom({
    Expression<String>? id,
    Expression<String>? remoteId,
    Expression<int>? createdAt,
    Expression<int>? updatedAt,
    Expression<int>? deletedAt,
    Expression<bool>? dirty,
    Expression<String>? logDate,
    Expression<int>? score,
    Expression<String>? note,
    Expression<int>? loggedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (remoteId != null) 'remote_id': remoteId,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (deletedAt != null) 'deleted_at': deletedAt,
      if (dirty != null) 'dirty': dirty,
      if (logDate != null) 'log_date': logDate,
      if (score != null) 'score': score,
      if (note != null) 'note': note,
      if (loggedAt != null) 'logged_at': loggedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MoodLogsCompanion copyWith({
    Value<String>? id,
    Value<String?>? remoteId,
    Value<int>? createdAt,
    Value<int>? updatedAt,
    Value<int?>? deletedAt,
    Value<bool>? dirty,
    Value<String>? logDate,
    Value<int>? score,
    Value<String?>? note,
    Value<int>? loggedAt,
    Value<int>? rowid,
  }) {
    return MoodLogsCompanion(
      id: id ?? this.id,
      remoteId: remoteId ?? this.remoteId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      dirty: dirty ?? this.dirty,
      logDate: logDate ?? this.logDate,
      score: score ?? this.score,
      note: note ?? this.note,
      loggedAt: loggedAt ?? this.loggedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (remoteId.present) {
      map['remote_id'] = Variable<String>(remoteId.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (deletedAt.present) {
      map['deleted_at'] = Variable<int>(deletedAt.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (logDate.present) {
      map['log_date'] = Variable<String>(logDate.value);
    }
    if (score.present) {
      map['score'] = Variable<int>(score.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (loggedAt.present) {
      map['logged_at'] = Variable<int>(loggedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MoodLogsCompanion(')
          ..write('id: $id, ')
          ..write('remoteId: $remoteId, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('deletedAt: $deletedAt, ')
          ..write('dirty: $dirty, ')
          ..write('logDate: $logDate, ')
          ..write('score: $score, ')
          ..write('note: $note, ')
          ..write('loggedAt: $loggedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ScreenTimeDailyTable extends ScreenTimeDaily
    with TableInfo<$ScreenTimeDailyTable, ScreenTimeDay> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ScreenTimeDailyTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localDateMeta = const VerificationMeta(
    'localDate',
  );
  @override
  late final GeneratedColumn<String> localDate = GeneratedColumn<String>(
    'local_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _totalForegroundMsMeta = const VerificationMeta(
    'totalForegroundMs',
  );
  @override
  late final GeneratedColumn<int> totalForegroundMs = GeneratedColumn<int>(
    'total_foreground_ms',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _unlockCountMeta = const VerificationMeta(
    'unlockCount',
  );
  @override
  late final GeneratedColumn<int> unlockCount = GeneratedColumn<int>(
    'unlock_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _firstUnlockAtMeta = const VerificationMeta(
    'firstUnlockAt',
  );
  @override
  late final GeneratedColumn<int> firstUnlockAt = GeneratedColumn<int>(
    'first_unlock_at',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _topAppsJsonMeta = const VerificationMeta(
    'topAppsJson',
  );
  @override
  late final GeneratedColumn<String> topAppsJson = GeneratedColumn<String>(
    'top_apps_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _collectedAtMeta = const VerificationMeta(
    'collectedAt',
  );
  @override
  late final GeneratedColumn<int> collectedAt = GeneratedColumn<int>(
    'collected_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _isPartialMeta = const VerificationMeta(
    'isPartial',
  );
  @override
  late final GeneratedColumn<bool> isPartial = GeneratedColumn<bool>(
    'is_partial',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_partial" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  @override
  List<GeneratedColumn> get $columns => [
    localDate,
    totalForegroundMs,
    unlockCount,
    firstUnlockAt,
    topAppsJson,
    collectedAt,
    isPartial,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'screen_time_daily';
  @override
  VerificationContext validateIntegrity(
    Insertable<ScreenTimeDay> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_date')) {
      context.handle(
        _localDateMeta,
        localDate.isAcceptableOrUnknown(data['local_date']!, _localDateMeta),
      );
    } else if (isInserting) {
      context.missing(_localDateMeta);
    }
    if (data.containsKey('total_foreground_ms')) {
      context.handle(
        _totalForegroundMsMeta,
        totalForegroundMs.isAcceptableOrUnknown(
          data['total_foreground_ms']!,
          _totalForegroundMsMeta,
        ),
      );
    }
    if (data.containsKey('unlock_count')) {
      context.handle(
        _unlockCountMeta,
        unlockCount.isAcceptableOrUnknown(
          data['unlock_count']!,
          _unlockCountMeta,
        ),
      );
    }
    if (data.containsKey('first_unlock_at')) {
      context.handle(
        _firstUnlockAtMeta,
        firstUnlockAt.isAcceptableOrUnknown(
          data['first_unlock_at']!,
          _firstUnlockAtMeta,
        ),
      );
    }
    if (data.containsKey('top_apps_json')) {
      context.handle(
        _topAppsJsonMeta,
        topAppsJson.isAcceptableOrUnknown(
          data['top_apps_json']!,
          _topAppsJsonMeta,
        ),
      );
    }
    if (data.containsKey('collected_at')) {
      context.handle(
        _collectedAtMeta,
        collectedAt.isAcceptableOrUnknown(
          data['collected_at']!,
          _collectedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_collectedAtMeta);
    }
    if (data.containsKey('is_partial')) {
      context.handle(
        _isPartialMeta,
        isPartial.isAcceptableOrUnknown(data['is_partial']!, _isPartialMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localDate};
  @override
  ScreenTimeDay map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ScreenTimeDay(
      localDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_date'],
      )!,
      totalForegroundMs: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_foreground_ms'],
      )!,
      unlockCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}unlock_count'],
      )!,
      firstUnlockAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}first_unlock_at'],
      ),
      topAppsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}top_apps_json'],
      ),
      collectedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}collected_at'],
      )!,
      isPartial: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_partial'],
      )!,
    );
  }

  @override
  $ScreenTimeDailyTable createAlias(String alias) {
    return $ScreenTimeDailyTable(attachedDatabase, alias);
  }
}

class ScreenTimeDay extends DataClass implements Insertable<ScreenTimeDay> {
  final String localDate;
  final int totalForegroundMs;
  final int unlockCount;
  final int? firstUnlockAt;

  /// Top 5 apps as JSON, so the summary renders without touching the detail
  /// table once that has been pruned.
  final String? topAppsJson;
  final int collectedAt;

  /// True for today's row until the day rolls over.
  final bool isPartial;
  const ScreenTimeDay({
    required this.localDate,
    required this.totalForegroundMs,
    required this.unlockCount,
    this.firstUnlockAt,
    this.topAppsJson,
    required this.collectedAt,
    required this.isPartial,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_date'] = Variable<String>(localDate);
    map['total_foreground_ms'] = Variable<int>(totalForegroundMs);
    map['unlock_count'] = Variable<int>(unlockCount);
    if (!nullToAbsent || firstUnlockAt != null) {
      map['first_unlock_at'] = Variable<int>(firstUnlockAt);
    }
    if (!nullToAbsent || topAppsJson != null) {
      map['top_apps_json'] = Variable<String>(topAppsJson);
    }
    map['collected_at'] = Variable<int>(collectedAt);
    map['is_partial'] = Variable<bool>(isPartial);
    return map;
  }

  ScreenTimeDailyCompanion toCompanion(bool nullToAbsent) {
    return ScreenTimeDailyCompanion(
      localDate: Value(localDate),
      totalForegroundMs: Value(totalForegroundMs),
      unlockCount: Value(unlockCount),
      firstUnlockAt: firstUnlockAt == null && nullToAbsent
          ? const Value.absent()
          : Value(firstUnlockAt),
      topAppsJson: topAppsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(topAppsJson),
      collectedAt: Value(collectedAt),
      isPartial: Value(isPartial),
    );
  }

  factory ScreenTimeDay.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ScreenTimeDay(
      localDate: serializer.fromJson<String>(json['localDate']),
      totalForegroundMs: serializer.fromJson<int>(json['totalForegroundMs']),
      unlockCount: serializer.fromJson<int>(json['unlockCount']),
      firstUnlockAt: serializer.fromJson<int?>(json['firstUnlockAt']),
      topAppsJson: serializer.fromJson<String?>(json['topAppsJson']),
      collectedAt: serializer.fromJson<int>(json['collectedAt']),
      isPartial: serializer.fromJson<bool>(json['isPartial']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localDate': serializer.toJson<String>(localDate),
      'totalForegroundMs': serializer.toJson<int>(totalForegroundMs),
      'unlockCount': serializer.toJson<int>(unlockCount),
      'firstUnlockAt': serializer.toJson<int?>(firstUnlockAt),
      'topAppsJson': serializer.toJson<String?>(topAppsJson),
      'collectedAt': serializer.toJson<int>(collectedAt),
      'isPartial': serializer.toJson<bool>(isPartial),
    };
  }

  ScreenTimeDay copyWith({
    String? localDate,
    int? totalForegroundMs,
    int? unlockCount,
    Value<int?> firstUnlockAt = const Value.absent(),
    Value<String?> topAppsJson = const Value.absent(),
    int? collectedAt,
    bool? isPartial,
  }) => ScreenTimeDay(
    localDate: localDate ?? this.localDate,
    totalForegroundMs: totalForegroundMs ?? this.totalForegroundMs,
    unlockCount: unlockCount ?? this.unlockCount,
    firstUnlockAt: firstUnlockAt.present
        ? firstUnlockAt.value
        : this.firstUnlockAt,
    topAppsJson: topAppsJson.present ? topAppsJson.value : this.topAppsJson,
    collectedAt: collectedAt ?? this.collectedAt,
    isPartial: isPartial ?? this.isPartial,
  );
  ScreenTimeDay copyWithCompanion(ScreenTimeDailyCompanion data) {
    return ScreenTimeDay(
      localDate: data.localDate.present ? data.localDate.value : this.localDate,
      totalForegroundMs: data.totalForegroundMs.present
          ? data.totalForegroundMs.value
          : this.totalForegroundMs,
      unlockCount: data.unlockCount.present
          ? data.unlockCount.value
          : this.unlockCount,
      firstUnlockAt: data.firstUnlockAt.present
          ? data.firstUnlockAt.value
          : this.firstUnlockAt,
      topAppsJson: data.topAppsJson.present
          ? data.topAppsJson.value
          : this.topAppsJson,
      collectedAt: data.collectedAt.present
          ? data.collectedAt.value
          : this.collectedAt,
      isPartial: data.isPartial.present ? data.isPartial.value : this.isPartial,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ScreenTimeDay(')
          ..write('localDate: $localDate, ')
          ..write('totalForegroundMs: $totalForegroundMs, ')
          ..write('unlockCount: $unlockCount, ')
          ..write('firstUnlockAt: $firstUnlockAt, ')
          ..write('topAppsJson: $topAppsJson, ')
          ..write('collectedAt: $collectedAt, ')
          ..write('isPartial: $isPartial')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    localDate,
    totalForegroundMs,
    unlockCount,
    firstUnlockAt,
    topAppsJson,
    collectedAt,
    isPartial,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ScreenTimeDay &&
          other.localDate == this.localDate &&
          other.totalForegroundMs == this.totalForegroundMs &&
          other.unlockCount == this.unlockCount &&
          other.firstUnlockAt == this.firstUnlockAt &&
          other.topAppsJson == this.topAppsJson &&
          other.collectedAt == this.collectedAt &&
          other.isPartial == this.isPartial);
}

class ScreenTimeDailyCompanion extends UpdateCompanion<ScreenTimeDay> {
  final Value<String> localDate;
  final Value<int> totalForegroundMs;
  final Value<int> unlockCount;
  final Value<int?> firstUnlockAt;
  final Value<String?> topAppsJson;
  final Value<int> collectedAt;
  final Value<bool> isPartial;
  final Value<int> rowid;
  const ScreenTimeDailyCompanion({
    this.localDate = const Value.absent(),
    this.totalForegroundMs = const Value.absent(),
    this.unlockCount = const Value.absent(),
    this.firstUnlockAt = const Value.absent(),
    this.topAppsJson = const Value.absent(),
    this.collectedAt = const Value.absent(),
    this.isPartial = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ScreenTimeDailyCompanion.insert({
    required String localDate,
    this.totalForegroundMs = const Value.absent(),
    this.unlockCount = const Value.absent(),
    this.firstUnlockAt = const Value.absent(),
    this.topAppsJson = const Value.absent(),
    required int collectedAt,
    this.isPartial = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : localDate = Value(localDate),
       collectedAt = Value(collectedAt);
  static Insertable<ScreenTimeDay> custom({
    Expression<String>? localDate,
    Expression<int>? totalForegroundMs,
    Expression<int>? unlockCount,
    Expression<int>? firstUnlockAt,
    Expression<String>? topAppsJson,
    Expression<int>? collectedAt,
    Expression<bool>? isPartial,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localDate != null) 'local_date': localDate,
      if (totalForegroundMs != null) 'total_foreground_ms': totalForegroundMs,
      if (unlockCount != null) 'unlock_count': unlockCount,
      if (firstUnlockAt != null) 'first_unlock_at': firstUnlockAt,
      if (topAppsJson != null) 'top_apps_json': topAppsJson,
      if (collectedAt != null) 'collected_at': collectedAt,
      if (isPartial != null) 'is_partial': isPartial,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ScreenTimeDailyCompanion copyWith({
    Value<String>? localDate,
    Value<int>? totalForegroundMs,
    Value<int>? unlockCount,
    Value<int?>? firstUnlockAt,
    Value<String?>? topAppsJson,
    Value<int>? collectedAt,
    Value<bool>? isPartial,
    Value<int>? rowid,
  }) {
    return ScreenTimeDailyCompanion(
      localDate: localDate ?? this.localDate,
      totalForegroundMs: totalForegroundMs ?? this.totalForegroundMs,
      unlockCount: unlockCount ?? this.unlockCount,
      firstUnlockAt: firstUnlockAt ?? this.firstUnlockAt,
      topAppsJson: topAppsJson ?? this.topAppsJson,
      collectedAt: collectedAt ?? this.collectedAt,
      isPartial: isPartial ?? this.isPartial,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localDate.present) {
      map['local_date'] = Variable<String>(localDate.value);
    }
    if (totalForegroundMs.present) {
      map['total_foreground_ms'] = Variable<int>(totalForegroundMs.value);
    }
    if (unlockCount.present) {
      map['unlock_count'] = Variable<int>(unlockCount.value);
    }
    if (firstUnlockAt.present) {
      map['first_unlock_at'] = Variable<int>(firstUnlockAt.value);
    }
    if (topAppsJson.present) {
      map['top_apps_json'] = Variable<String>(topAppsJson.value);
    }
    if (collectedAt.present) {
      map['collected_at'] = Variable<int>(collectedAt.value);
    }
    if (isPartial.present) {
      map['is_partial'] = Variable<bool>(isPartial.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ScreenTimeDailyCompanion(')
          ..write('localDate: $localDate, ')
          ..write('totalForegroundMs: $totalForegroundMs, ')
          ..write('unlockCount: $unlockCount, ')
          ..write('firstUnlockAt: $firstUnlockAt, ')
          ..write('topAppsJson: $topAppsJson, ')
          ..write('collectedAt: $collectedAt, ')
          ..write('isPartial: $isPartial, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ScreenTimeAppDailyTable extends ScreenTimeAppDaily
    with TableInfo<$ScreenTimeAppDailyTable, ScreenTimeApp> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ScreenTimeAppDailyTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localDateMeta = const VerificationMeta(
    'localDate',
  );
  @override
  late final GeneratedColumn<String> localDate = GeneratedColumn<String>(
    'local_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _packageNameMeta = const VerificationMeta(
    'packageName',
  );
  @override
  late final GeneratedColumn<String> packageName = GeneratedColumn<String>(
    'package_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _appLabelMeta = const VerificationMeta(
    'appLabel',
  );
  @override
  late final GeneratedColumn<String> appLabel = GeneratedColumn<String>(
    'app_label',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _foregroundMsMeta = const VerificationMeta(
    'foregroundMs',
  );
  @override
  late final GeneratedColumn<int> foregroundMs = GeneratedColumn<int>(
    'foreground_ms',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _launchCountMeta = const VerificationMeta(
    'launchCount',
  );
  @override
  late final GeneratedColumn<int> launchCount = GeneratedColumn<int>(
    'launch_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<int> category = GeneratedColumn<int>(
    'category',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    localDate,
    packageName,
    appLabel,
    foregroundMs,
    launchCount,
    category,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'screen_time_app_daily';
  @override
  VerificationContext validateIntegrity(
    Insertable<ScreenTimeApp> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_date')) {
      context.handle(
        _localDateMeta,
        localDate.isAcceptableOrUnknown(data['local_date']!, _localDateMeta),
      );
    } else if (isInserting) {
      context.missing(_localDateMeta);
    }
    if (data.containsKey('package_name')) {
      context.handle(
        _packageNameMeta,
        packageName.isAcceptableOrUnknown(
          data['package_name']!,
          _packageNameMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_packageNameMeta);
    }
    if (data.containsKey('app_label')) {
      context.handle(
        _appLabelMeta,
        appLabel.isAcceptableOrUnknown(data['app_label']!, _appLabelMeta),
      );
    }
    if (data.containsKey('foreground_ms')) {
      context.handle(
        _foregroundMsMeta,
        foregroundMs.isAcceptableOrUnknown(
          data['foreground_ms']!,
          _foregroundMsMeta,
        ),
      );
    }
    if (data.containsKey('launch_count')) {
      context.handle(
        _launchCountMeta,
        launchCount.isAcceptableOrUnknown(
          data['launch_count']!,
          _launchCountMeta,
        ),
      );
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localDate, packageName};
  @override
  ScreenTimeApp map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ScreenTimeApp(
      localDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_date'],
      )!,
      packageName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}package_name'],
      )!,
      appLabel: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}app_label'],
      ),
      foregroundMs: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}foreground_ms'],
      )!,
      launchCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}launch_count'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}category'],
      )!,
    );
  }

  @override
  $ScreenTimeAppDailyTable createAlias(String alias) {
    return $ScreenTimeAppDailyTable(attachedDatabase, alias);
  }
}

class ScreenTimeApp extends DataClass implements Insertable<ScreenTimeApp> {
  final String localDate;
  final String packageName;
  final String? appLabel;
  final int foregroundMs;
  final int launchCount;

  /// [AppCategory]
  final int category;
  const ScreenTimeApp({
    required this.localDate,
    required this.packageName,
    this.appLabel,
    required this.foregroundMs,
    required this.launchCount,
    required this.category,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_date'] = Variable<String>(localDate);
    map['package_name'] = Variable<String>(packageName);
    if (!nullToAbsent || appLabel != null) {
      map['app_label'] = Variable<String>(appLabel);
    }
    map['foreground_ms'] = Variable<int>(foregroundMs);
    map['launch_count'] = Variable<int>(launchCount);
    map['category'] = Variable<int>(category);
    return map;
  }

  ScreenTimeAppDailyCompanion toCompanion(bool nullToAbsent) {
    return ScreenTimeAppDailyCompanion(
      localDate: Value(localDate),
      packageName: Value(packageName),
      appLabel: appLabel == null && nullToAbsent
          ? const Value.absent()
          : Value(appLabel),
      foregroundMs: Value(foregroundMs),
      launchCount: Value(launchCount),
      category: Value(category),
    );
  }

  factory ScreenTimeApp.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ScreenTimeApp(
      localDate: serializer.fromJson<String>(json['localDate']),
      packageName: serializer.fromJson<String>(json['packageName']),
      appLabel: serializer.fromJson<String?>(json['appLabel']),
      foregroundMs: serializer.fromJson<int>(json['foregroundMs']),
      launchCount: serializer.fromJson<int>(json['launchCount']),
      category: serializer.fromJson<int>(json['category']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localDate': serializer.toJson<String>(localDate),
      'packageName': serializer.toJson<String>(packageName),
      'appLabel': serializer.toJson<String?>(appLabel),
      'foregroundMs': serializer.toJson<int>(foregroundMs),
      'launchCount': serializer.toJson<int>(launchCount),
      'category': serializer.toJson<int>(category),
    };
  }

  ScreenTimeApp copyWith({
    String? localDate,
    String? packageName,
    Value<String?> appLabel = const Value.absent(),
    int? foregroundMs,
    int? launchCount,
    int? category,
  }) => ScreenTimeApp(
    localDate: localDate ?? this.localDate,
    packageName: packageName ?? this.packageName,
    appLabel: appLabel.present ? appLabel.value : this.appLabel,
    foregroundMs: foregroundMs ?? this.foregroundMs,
    launchCount: launchCount ?? this.launchCount,
    category: category ?? this.category,
  );
  ScreenTimeApp copyWithCompanion(ScreenTimeAppDailyCompanion data) {
    return ScreenTimeApp(
      localDate: data.localDate.present ? data.localDate.value : this.localDate,
      packageName: data.packageName.present
          ? data.packageName.value
          : this.packageName,
      appLabel: data.appLabel.present ? data.appLabel.value : this.appLabel,
      foregroundMs: data.foregroundMs.present
          ? data.foregroundMs.value
          : this.foregroundMs,
      launchCount: data.launchCount.present
          ? data.launchCount.value
          : this.launchCount,
      category: data.category.present ? data.category.value : this.category,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ScreenTimeApp(')
          ..write('localDate: $localDate, ')
          ..write('packageName: $packageName, ')
          ..write('appLabel: $appLabel, ')
          ..write('foregroundMs: $foregroundMs, ')
          ..write('launchCount: $launchCount, ')
          ..write('category: $category')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    localDate,
    packageName,
    appLabel,
    foregroundMs,
    launchCount,
    category,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ScreenTimeApp &&
          other.localDate == this.localDate &&
          other.packageName == this.packageName &&
          other.appLabel == this.appLabel &&
          other.foregroundMs == this.foregroundMs &&
          other.launchCount == this.launchCount &&
          other.category == this.category);
}

class ScreenTimeAppDailyCompanion extends UpdateCompanion<ScreenTimeApp> {
  final Value<String> localDate;
  final Value<String> packageName;
  final Value<String?> appLabel;
  final Value<int> foregroundMs;
  final Value<int> launchCount;
  final Value<int> category;
  final Value<int> rowid;
  const ScreenTimeAppDailyCompanion({
    this.localDate = const Value.absent(),
    this.packageName = const Value.absent(),
    this.appLabel = const Value.absent(),
    this.foregroundMs = const Value.absent(),
    this.launchCount = const Value.absent(),
    this.category = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ScreenTimeAppDailyCompanion.insert({
    required String localDate,
    required String packageName,
    this.appLabel = const Value.absent(),
    this.foregroundMs = const Value.absent(),
    this.launchCount = const Value.absent(),
    this.category = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : localDate = Value(localDate),
       packageName = Value(packageName);
  static Insertable<ScreenTimeApp> custom({
    Expression<String>? localDate,
    Expression<String>? packageName,
    Expression<String>? appLabel,
    Expression<int>? foregroundMs,
    Expression<int>? launchCount,
    Expression<int>? category,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localDate != null) 'local_date': localDate,
      if (packageName != null) 'package_name': packageName,
      if (appLabel != null) 'app_label': appLabel,
      if (foregroundMs != null) 'foreground_ms': foregroundMs,
      if (launchCount != null) 'launch_count': launchCount,
      if (category != null) 'category': category,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ScreenTimeAppDailyCompanion copyWith({
    Value<String>? localDate,
    Value<String>? packageName,
    Value<String?>? appLabel,
    Value<int>? foregroundMs,
    Value<int>? launchCount,
    Value<int>? category,
    Value<int>? rowid,
  }) {
    return ScreenTimeAppDailyCompanion(
      localDate: localDate ?? this.localDate,
      packageName: packageName ?? this.packageName,
      appLabel: appLabel ?? this.appLabel,
      foregroundMs: foregroundMs ?? this.foregroundMs,
      launchCount: launchCount ?? this.launchCount,
      category: category ?? this.category,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localDate.present) {
      map['local_date'] = Variable<String>(localDate.value);
    }
    if (packageName.present) {
      map['package_name'] = Variable<String>(packageName.value);
    }
    if (appLabel.present) {
      map['app_label'] = Variable<String>(appLabel.value);
    }
    if (foregroundMs.present) {
      map['foreground_ms'] = Variable<int>(foregroundMs.value);
    }
    if (launchCount.present) {
      map['launch_count'] = Variable<int>(launchCount.value);
    }
    if (category.present) {
      map['category'] = Variable<int>(category.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ScreenTimeAppDailyCompanion(')
          ..write('localDate: $localDate, ')
          ..write('packageName: $packageName, ')
          ..write('appLabel: $appLabel, ')
          ..write('foregroundMs: $foregroundMs, ')
          ..write('launchCount: $launchCount, ')
          ..write('category: $category, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $BadgesTable extends Badges with TableInfo<$BadgesTable, Badge> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BadgesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _earnedAtMeta = const VerificationMeta(
    'earnedAt',
  );
  @override
  late final GeneratedColumn<int> earnedAt = GeneratedColumn<int>(
    'earned_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _popupShownMeta = const VerificationMeta(
    'popupShown',
  );
  @override
  late final GeneratedColumn<bool> popupShown = GeneratedColumn<bool>(
    'popup_shown',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("popup_shown" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<bool> dirty = GeneratedColumn<bool>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  @override
  List<GeneratedColumn> get $columns => [key, earnedAt, popupShown, dirty];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'badges';
  @override
  VerificationContext validateIntegrity(
    Insertable<Badge> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('earned_at')) {
      context.handle(
        _earnedAtMeta,
        earnedAt.isAcceptableOrUnknown(data['earned_at']!, _earnedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_earnedAtMeta);
    }
    if (data.containsKey('popup_shown')) {
      context.handle(
        _popupShownMeta,
        popupShown.isAcceptableOrUnknown(data['popup_shown']!, _popupShownMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  Badge map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Badge(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      earnedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}earned_at'],
      )!,
      popupShown: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}popup_shown'],
      )!,
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}dirty'],
      )!,
    );
  }

  @override
  $BadgesTable createAlias(String alias) {
    return $BadgesTable(attachedDatabase, alias);
  }
}

class Badge extends DataClass implements Insertable<Badge> {
  /// Ladder keys are preserved verbatim from the Capacitor build
  /// (streak_7 .. streak_300) so migrated `user_badges` rows map 1:1.
  final String key;
  final int earnedAt;

  /// Migrated badges are marked shown, otherwise a long-time user is greeted by
  /// nine celebration popups at once on first launch.
  final bool popupShown;
  final bool dirty;
  const Badge({
    required this.key,
    required this.earnedAt,
    required this.popupShown,
    required this.dirty,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['earned_at'] = Variable<int>(earnedAt);
    map['popup_shown'] = Variable<bool>(popupShown);
    map['dirty'] = Variable<bool>(dirty);
    return map;
  }

  BadgesCompanion toCompanion(bool nullToAbsent) {
    return BadgesCompanion(
      key: Value(key),
      earnedAt: Value(earnedAt),
      popupShown: Value(popupShown),
      dirty: Value(dirty),
    );
  }

  factory Badge.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Badge(
      key: serializer.fromJson<String>(json['key']),
      earnedAt: serializer.fromJson<int>(json['earnedAt']),
      popupShown: serializer.fromJson<bool>(json['popupShown']),
      dirty: serializer.fromJson<bool>(json['dirty']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'earnedAt': serializer.toJson<int>(earnedAt),
      'popupShown': serializer.toJson<bool>(popupShown),
      'dirty': serializer.toJson<bool>(dirty),
    };
  }

  Badge copyWith({String? key, int? earnedAt, bool? popupShown, bool? dirty}) =>
      Badge(
        key: key ?? this.key,
        earnedAt: earnedAt ?? this.earnedAt,
        popupShown: popupShown ?? this.popupShown,
        dirty: dirty ?? this.dirty,
      );
  Badge copyWithCompanion(BadgesCompanion data) {
    return Badge(
      key: data.key.present ? data.key.value : this.key,
      earnedAt: data.earnedAt.present ? data.earnedAt.value : this.earnedAt,
      popupShown: data.popupShown.present
          ? data.popupShown.value
          : this.popupShown,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Badge(')
          ..write('key: $key, ')
          ..write('earnedAt: $earnedAt, ')
          ..write('popupShown: $popupShown, ')
          ..write('dirty: $dirty')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, earnedAt, popupShown, dirty);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Badge &&
          other.key == this.key &&
          other.earnedAt == this.earnedAt &&
          other.popupShown == this.popupShown &&
          other.dirty == this.dirty);
}

class BadgesCompanion extends UpdateCompanion<Badge> {
  final Value<String> key;
  final Value<int> earnedAt;
  final Value<bool> popupShown;
  final Value<bool> dirty;
  final Value<int> rowid;
  const BadgesCompanion({
    this.key = const Value.absent(),
    this.earnedAt = const Value.absent(),
    this.popupShown = const Value.absent(),
    this.dirty = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  BadgesCompanion.insert({
    required String key,
    required int earnedAt,
    this.popupShown = const Value.absent(),
    this.dirty = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       earnedAt = Value(earnedAt);
  static Insertable<Badge> custom({
    Expression<String>? key,
    Expression<int>? earnedAt,
    Expression<bool>? popupShown,
    Expression<bool>? dirty,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (earnedAt != null) 'earned_at': earnedAt,
      if (popupShown != null) 'popup_shown': popupShown,
      if (dirty != null) 'dirty': dirty,
      if (rowid != null) 'rowid': rowid,
    });
  }

  BadgesCompanion copyWith({
    Value<String>? key,
    Value<int>? earnedAt,
    Value<bool>? popupShown,
    Value<bool>? dirty,
    Value<int>? rowid,
  }) {
    return BadgesCompanion(
      key: key ?? this.key,
      earnedAt: earnedAt ?? this.earnedAt,
      popupShown: popupShown ?? this.popupShown,
      dirty: dirty ?? this.dirty,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (earnedAt.present) {
      map['earned_at'] = Variable<int>(earnedAt.value);
    }
    if (popupShown.present) {
      map['popup_shown'] = Variable<bool>(popupShown.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<bool>(dirty.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BadgesCompanion(')
          ..write('key: $key, ')
          ..write('earnedAt: $earnedAt, ')
          ..write('popupShown: $popupShown, ')
          ..write('dirty: $dirty, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $DailyRollupsTable extends DailyRollups
    with TableInfo<$DailyRollupsTable, DailyRollup> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DailyRollupsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localDateMeta = const VerificationMeta(
    'localDate',
  );
  @override
  late final GeneratedColumn<String> localDate = GeneratedColumn<String>(
    'local_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _habitsScheduledMeta = const VerificationMeta(
    'habitsScheduled',
  );
  @override
  late final GeneratedColumn<int> habitsScheduled = GeneratedColumn<int>(
    'habits_scheduled',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _habitsCompletedMeta = const VerificationMeta(
    'habitsCompleted',
  );
  @override
  late final GeneratedColumn<int> habitsCompleted = GeneratedColumn<int>(
    'habits_completed',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _habitsFrozenMeta = const VerificationMeta(
    'habitsFrozen',
  );
  @override
  late final GeneratedColumn<int> habitsFrozen = GeneratedColumn<int>(
    'habits_frozen',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _tasksDueMeta = const VerificationMeta(
    'tasksDue',
  );
  @override
  late final GeneratedColumn<int> tasksDue = GeneratedColumn<int>(
    'tasks_due',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _tasksCompletedMeta = const VerificationMeta(
    'tasksCompleted',
  );
  @override
  late final GeneratedColumn<int> tasksCompleted = GeneratedColumn<int>(
    'tasks_completed',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _focusMinutesMeta = const VerificationMeta(
    'focusMinutes',
  );
  @override
  late final GeneratedColumn<int> focusMinutes = GeneratedColumn<int>(
    'focus_minutes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _screenMinutesMeta = const VerificationMeta(
    'screenMinutes',
  );
  @override
  late final GeneratedColumn<int> screenMinutes = GeneratedColumn<int>(
    'screen_minutes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _scoreMeta = const VerificationMeta('score');
  @override
  late final GeneratedColumn<int> score = GeneratedColumn<int>(
    'score',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _intensityMeta = const VerificationMeta(
    'intensity',
  );
  @override
  late final GeneratedColumn<int> intensity = GeneratedColumn<int>(
    'intensity',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _computedAtMeta = const VerificationMeta(
    'computedAt',
  );
  @override
  late final GeneratedColumn<int> computedAt = GeneratedColumn<int>(
    'computed_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    localDate,
    habitsScheduled,
    habitsCompleted,
    habitsFrozen,
    tasksDue,
    tasksCompleted,
    focusMinutes,
    screenMinutes,
    score,
    intensity,
    computedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'daily_rollups';
  @override
  VerificationContext validateIntegrity(
    Insertable<DailyRollup> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_date')) {
      context.handle(
        _localDateMeta,
        localDate.isAcceptableOrUnknown(data['local_date']!, _localDateMeta),
      );
    } else if (isInserting) {
      context.missing(_localDateMeta);
    }
    if (data.containsKey('habits_scheduled')) {
      context.handle(
        _habitsScheduledMeta,
        habitsScheduled.isAcceptableOrUnknown(
          data['habits_scheduled']!,
          _habitsScheduledMeta,
        ),
      );
    }
    if (data.containsKey('habits_completed')) {
      context.handle(
        _habitsCompletedMeta,
        habitsCompleted.isAcceptableOrUnknown(
          data['habits_completed']!,
          _habitsCompletedMeta,
        ),
      );
    }
    if (data.containsKey('habits_frozen')) {
      context.handle(
        _habitsFrozenMeta,
        habitsFrozen.isAcceptableOrUnknown(
          data['habits_frozen']!,
          _habitsFrozenMeta,
        ),
      );
    }
    if (data.containsKey('tasks_due')) {
      context.handle(
        _tasksDueMeta,
        tasksDue.isAcceptableOrUnknown(data['tasks_due']!, _tasksDueMeta),
      );
    }
    if (data.containsKey('tasks_completed')) {
      context.handle(
        _tasksCompletedMeta,
        tasksCompleted.isAcceptableOrUnknown(
          data['tasks_completed']!,
          _tasksCompletedMeta,
        ),
      );
    }
    if (data.containsKey('focus_minutes')) {
      context.handle(
        _focusMinutesMeta,
        focusMinutes.isAcceptableOrUnknown(
          data['focus_minutes']!,
          _focusMinutesMeta,
        ),
      );
    }
    if (data.containsKey('screen_minutes')) {
      context.handle(
        _screenMinutesMeta,
        screenMinutes.isAcceptableOrUnknown(
          data['screen_minutes']!,
          _screenMinutesMeta,
        ),
      );
    }
    if (data.containsKey('score')) {
      context.handle(
        _scoreMeta,
        score.isAcceptableOrUnknown(data['score']!, _scoreMeta),
      );
    }
    if (data.containsKey('intensity')) {
      context.handle(
        _intensityMeta,
        intensity.isAcceptableOrUnknown(data['intensity']!, _intensityMeta),
      );
    }
    if (data.containsKey('computed_at')) {
      context.handle(
        _computedAtMeta,
        computedAt.isAcceptableOrUnknown(data['computed_at']!, _computedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_computedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localDate};
  @override
  DailyRollup map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DailyRollup(
      localDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_date'],
      )!,
      habitsScheduled: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}habits_scheduled'],
      )!,
      habitsCompleted: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}habits_completed'],
      )!,
      habitsFrozen: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}habits_frozen'],
      )!,
      tasksDue: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tasks_due'],
      )!,
      tasksCompleted: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tasks_completed'],
      )!,
      focusMinutes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}focus_minutes'],
      )!,
      screenMinutes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}screen_minutes'],
      )!,
      score: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}score'],
      )!,
      intensity: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}intensity'],
      )!,
      computedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}computed_at'],
      )!,
    );
  }

  @override
  $DailyRollupsTable createAlias(String alias) {
    return $DailyRollupsTable(attachedDatabase, alias);
  }
}

class DailyRollup extends DataClass implements Insertable<DailyRollup> {
  final String localDate;
  final int habitsScheduled;
  final int habitsCompleted;
  final int habitsFrozen;
  final int tasksDue;
  final int tasksCompleted;
  final int focusMinutes;
  final int screenMinutes;

  /// 0..100 discipline score.
  final int score;

  /// 0..4 heatmap bucket, precomputed so painting never does math.
  final int intensity;
  final int computedAt;
  const DailyRollup({
    required this.localDate,
    required this.habitsScheduled,
    required this.habitsCompleted,
    required this.habitsFrozen,
    required this.tasksDue,
    required this.tasksCompleted,
    required this.focusMinutes,
    required this.screenMinutes,
    required this.score,
    required this.intensity,
    required this.computedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_date'] = Variable<String>(localDate);
    map['habits_scheduled'] = Variable<int>(habitsScheduled);
    map['habits_completed'] = Variable<int>(habitsCompleted);
    map['habits_frozen'] = Variable<int>(habitsFrozen);
    map['tasks_due'] = Variable<int>(tasksDue);
    map['tasks_completed'] = Variable<int>(tasksCompleted);
    map['focus_minutes'] = Variable<int>(focusMinutes);
    map['screen_minutes'] = Variable<int>(screenMinutes);
    map['score'] = Variable<int>(score);
    map['intensity'] = Variable<int>(intensity);
    map['computed_at'] = Variable<int>(computedAt);
    return map;
  }

  DailyRollupsCompanion toCompanion(bool nullToAbsent) {
    return DailyRollupsCompanion(
      localDate: Value(localDate),
      habitsScheduled: Value(habitsScheduled),
      habitsCompleted: Value(habitsCompleted),
      habitsFrozen: Value(habitsFrozen),
      tasksDue: Value(tasksDue),
      tasksCompleted: Value(tasksCompleted),
      focusMinutes: Value(focusMinutes),
      screenMinutes: Value(screenMinutes),
      score: Value(score),
      intensity: Value(intensity),
      computedAt: Value(computedAt),
    );
  }

  factory DailyRollup.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DailyRollup(
      localDate: serializer.fromJson<String>(json['localDate']),
      habitsScheduled: serializer.fromJson<int>(json['habitsScheduled']),
      habitsCompleted: serializer.fromJson<int>(json['habitsCompleted']),
      habitsFrozen: serializer.fromJson<int>(json['habitsFrozen']),
      tasksDue: serializer.fromJson<int>(json['tasksDue']),
      tasksCompleted: serializer.fromJson<int>(json['tasksCompleted']),
      focusMinutes: serializer.fromJson<int>(json['focusMinutes']),
      screenMinutes: serializer.fromJson<int>(json['screenMinutes']),
      score: serializer.fromJson<int>(json['score']),
      intensity: serializer.fromJson<int>(json['intensity']),
      computedAt: serializer.fromJson<int>(json['computedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localDate': serializer.toJson<String>(localDate),
      'habitsScheduled': serializer.toJson<int>(habitsScheduled),
      'habitsCompleted': serializer.toJson<int>(habitsCompleted),
      'habitsFrozen': serializer.toJson<int>(habitsFrozen),
      'tasksDue': serializer.toJson<int>(tasksDue),
      'tasksCompleted': serializer.toJson<int>(tasksCompleted),
      'focusMinutes': serializer.toJson<int>(focusMinutes),
      'screenMinutes': serializer.toJson<int>(screenMinutes),
      'score': serializer.toJson<int>(score),
      'intensity': serializer.toJson<int>(intensity),
      'computedAt': serializer.toJson<int>(computedAt),
    };
  }

  DailyRollup copyWith({
    String? localDate,
    int? habitsScheduled,
    int? habitsCompleted,
    int? habitsFrozen,
    int? tasksDue,
    int? tasksCompleted,
    int? focusMinutes,
    int? screenMinutes,
    int? score,
    int? intensity,
    int? computedAt,
  }) => DailyRollup(
    localDate: localDate ?? this.localDate,
    habitsScheduled: habitsScheduled ?? this.habitsScheduled,
    habitsCompleted: habitsCompleted ?? this.habitsCompleted,
    habitsFrozen: habitsFrozen ?? this.habitsFrozen,
    tasksDue: tasksDue ?? this.tasksDue,
    tasksCompleted: tasksCompleted ?? this.tasksCompleted,
    focusMinutes: focusMinutes ?? this.focusMinutes,
    screenMinutes: screenMinutes ?? this.screenMinutes,
    score: score ?? this.score,
    intensity: intensity ?? this.intensity,
    computedAt: computedAt ?? this.computedAt,
  );
  DailyRollup copyWithCompanion(DailyRollupsCompanion data) {
    return DailyRollup(
      localDate: data.localDate.present ? data.localDate.value : this.localDate,
      habitsScheduled: data.habitsScheduled.present
          ? data.habitsScheduled.value
          : this.habitsScheduled,
      habitsCompleted: data.habitsCompleted.present
          ? data.habitsCompleted.value
          : this.habitsCompleted,
      habitsFrozen: data.habitsFrozen.present
          ? data.habitsFrozen.value
          : this.habitsFrozen,
      tasksDue: data.tasksDue.present ? data.tasksDue.value : this.tasksDue,
      tasksCompleted: data.tasksCompleted.present
          ? data.tasksCompleted.value
          : this.tasksCompleted,
      focusMinutes: data.focusMinutes.present
          ? data.focusMinutes.value
          : this.focusMinutes,
      screenMinutes: data.screenMinutes.present
          ? data.screenMinutes.value
          : this.screenMinutes,
      score: data.score.present ? data.score.value : this.score,
      intensity: data.intensity.present ? data.intensity.value : this.intensity,
      computedAt: data.computedAt.present
          ? data.computedAt.value
          : this.computedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DailyRollup(')
          ..write('localDate: $localDate, ')
          ..write('habitsScheduled: $habitsScheduled, ')
          ..write('habitsCompleted: $habitsCompleted, ')
          ..write('habitsFrozen: $habitsFrozen, ')
          ..write('tasksDue: $tasksDue, ')
          ..write('tasksCompleted: $tasksCompleted, ')
          ..write('focusMinutes: $focusMinutes, ')
          ..write('screenMinutes: $screenMinutes, ')
          ..write('score: $score, ')
          ..write('intensity: $intensity, ')
          ..write('computedAt: $computedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    localDate,
    habitsScheduled,
    habitsCompleted,
    habitsFrozen,
    tasksDue,
    tasksCompleted,
    focusMinutes,
    screenMinutes,
    score,
    intensity,
    computedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DailyRollup &&
          other.localDate == this.localDate &&
          other.habitsScheduled == this.habitsScheduled &&
          other.habitsCompleted == this.habitsCompleted &&
          other.habitsFrozen == this.habitsFrozen &&
          other.tasksDue == this.tasksDue &&
          other.tasksCompleted == this.tasksCompleted &&
          other.focusMinutes == this.focusMinutes &&
          other.screenMinutes == this.screenMinutes &&
          other.score == this.score &&
          other.intensity == this.intensity &&
          other.computedAt == this.computedAt);
}

class DailyRollupsCompanion extends UpdateCompanion<DailyRollup> {
  final Value<String> localDate;
  final Value<int> habitsScheduled;
  final Value<int> habitsCompleted;
  final Value<int> habitsFrozen;
  final Value<int> tasksDue;
  final Value<int> tasksCompleted;
  final Value<int> focusMinutes;
  final Value<int> screenMinutes;
  final Value<int> score;
  final Value<int> intensity;
  final Value<int> computedAt;
  final Value<int> rowid;
  const DailyRollupsCompanion({
    this.localDate = const Value.absent(),
    this.habitsScheduled = const Value.absent(),
    this.habitsCompleted = const Value.absent(),
    this.habitsFrozen = const Value.absent(),
    this.tasksDue = const Value.absent(),
    this.tasksCompleted = const Value.absent(),
    this.focusMinutes = const Value.absent(),
    this.screenMinutes = const Value.absent(),
    this.score = const Value.absent(),
    this.intensity = const Value.absent(),
    this.computedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  DailyRollupsCompanion.insert({
    required String localDate,
    this.habitsScheduled = const Value.absent(),
    this.habitsCompleted = const Value.absent(),
    this.habitsFrozen = const Value.absent(),
    this.tasksDue = const Value.absent(),
    this.tasksCompleted = const Value.absent(),
    this.focusMinutes = const Value.absent(),
    this.screenMinutes = const Value.absent(),
    this.score = const Value.absent(),
    this.intensity = const Value.absent(),
    required int computedAt,
    this.rowid = const Value.absent(),
  }) : localDate = Value(localDate),
       computedAt = Value(computedAt);
  static Insertable<DailyRollup> custom({
    Expression<String>? localDate,
    Expression<int>? habitsScheduled,
    Expression<int>? habitsCompleted,
    Expression<int>? habitsFrozen,
    Expression<int>? tasksDue,
    Expression<int>? tasksCompleted,
    Expression<int>? focusMinutes,
    Expression<int>? screenMinutes,
    Expression<int>? score,
    Expression<int>? intensity,
    Expression<int>? computedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localDate != null) 'local_date': localDate,
      if (habitsScheduled != null) 'habits_scheduled': habitsScheduled,
      if (habitsCompleted != null) 'habits_completed': habitsCompleted,
      if (habitsFrozen != null) 'habits_frozen': habitsFrozen,
      if (tasksDue != null) 'tasks_due': tasksDue,
      if (tasksCompleted != null) 'tasks_completed': tasksCompleted,
      if (focusMinutes != null) 'focus_minutes': focusMinutes,
      if (screenMinutes != null) 'screen_minutes': screenMinutes,
      if (score != null) 'score': score,
      if (intensity != null) 'intensity': intensity,
      if (computedAt != null) 'computed_at': computedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  DailyRollupsCompanion copyWith({
    Value<String>? localDate,
    Value<int>? habitsScheduled,
    Value<int>? habitsCompleted,
    Value<int>? habitsFrozen,
    Value<int>? tasksDue,
    Value<int>? tasksCompleted,
    Value<int>? focusMinutes,
    Value<int>? screenMinutes,
    Value<int>? score,
    Value<int>? intensity,
    Value<int>? computedAt,
    Value<int>? rowid,
  }) {
    return DailyRollupsCompanion(
      localDate: localDate ?? this.localDate,
      habitsScheduled: habitsScheduled ?? this.habitsScheduled,
      habitsCompleted: habitsCompleted ?? this.habitsCompleted,
      habitsFrozen: habitsFrozen ?? this.habitsFrozen,
      tasksDue: tasksDue ?? this.tasksDue,
      tasksCompleted: tasksCompleted ?? this.tasksCompleted,
      focusMinutes: focusMinutes ?? this.focusMinutes,
      screenMinutes: screenMinutes ?? this.screenMinutes,
      score: score ?? this.score,
      intensity: intensity ?? this.intensity,
      computedAt: computedAt ?? this.computedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localDate.present) {
      map['local_date'] = Variable<String>(localDate.value);
    }
    if (habitsScheduled.present) {
      map['habits_scheduled'] = Variable<int>(habitsScheduled.value);
    }
    if (habitsCompleted.present) {
      map['habits_completed'] = Variable<int>(habitsCompleted.value);
    }
    if (habitsFrozen.present) {
      map['habits_frozen'] = Variable<int>(habitsFrozen.value);
    }
    if (tasksDue.present) {
      map['tasks_due'] = Variable<int>(tasksDue.value);
    }
    if (tasksCompleted.present) {
      map['tasks_completed'] = Variable<int>(tasksCompleted.value);
    }
    if (focusMinutes.present) {
      map['focus_minutes'] = Variable<int>(focusMinutes.value);
    }
    if (screenMinutes.present) {
      map['screen_minutes'] = Variable<int>(screenMinutes.value);
    }
    if (score.present) {
      map['score'] = Variable<int>(score.value);
    }
    if (intensity.present) {
      map['intensity'] = Variable<int>(intensity.value);
    }
    if (computedAt.present) {
      map['computed_at'] = Variable<int>(computedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DailyRollupsCompanion(')
          ..write('localDate: $localDate, ')
          ..write('habitsScheduled: $habitsScheduled, ')
          ..write('habitsCompleted: $habitsCompleted, ')
          ..write('habitsFrozen: $habitsFrozen, ')
          ..write('tasksDue: $tasksDue, ')
          ..write('tasksCompleted: $tasksCompleted, ')
          ..write('focusMinutes: $focusMinutes, ')
          ..write('screenMinutes: $screenMinutes, ')
          ..write('score: $score, ')
          ..write('intensity: $intensity, ')
          ..write('computedAt: $computedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SettingsTable extends Settings with TableInfo<$SettingsTable, Setting> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'settings';
  @override
  VerificationContext validateIntegrity(
    Insertable<Setting> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  Setting map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Setting(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $SettingsTable createAlias(String alias) {
    return $SettingsTable(attachedDatabase, alias);
  }
}

class Setting extends DataClass implements Insertable<Setting> {
  final String key;
  final String value;
  final int updatedAt;
  const Setting({
    required this.key,
    required this.value,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    map['updated_at'] = Variable<int>(updatedAt);
    return map;
  }

  SettingsCompanion toCompanion(bool nullToAbsent) {
    return SettingsCompanion(
      key: Value(key),
      value: Value(value),
      updatedAt: Value(updatedAt),
    );
  }

  factory Setting.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Setting(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
      'updatedAt': serializer.toJson<int>(updatedAt),
    };
  }

  Setting copyWith({String? key, String? value, int? updatedAt}) => Setting(
    key: key ?? this.key,
    value: value ?? this.value,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  Setting copyWithCompanion(SettingsCompanion data) {
    return Setting(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Setting(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Setting &&
          other.key == this.key &&
          other.value == this.value &&
          other.updatedAt == this.updatedAt);
}

class SettingsCompanion extends UpdateCompanion<Setting> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> updatedAt;
  final Value<int> rowid;
  const SettingsCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SettingsCompanion.insert({
    required String key,
    required String value,
    required int updatedAt,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value),
       updatedAt = Value(updatedAt);
  static Insertable<Setting> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SettingsCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<int>? updatedAt,
    Value<int>? rowid,
  }) {
    return SettingsCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SettingsCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $AppMetaTable extends AppMeta with TableInfo<$AppMetaTable, MetaEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AppMetaTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'app_meta';
  @override
  VerificationContext validateIntegrity(
    Insertable<MetaEntry> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  MetaEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MetaEntry(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $AppMetaTable createAlias(String alias) {
    return $AppMetaTable(attachedDatabase, alias);
  }
}

class MetaEntry extends DataClass implements Insertable<MetaEntry> {
  final String key;
  final String value;
  const MetaEntry({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  AppMetaCompanion toCompanion(bool nullToAbsent) {
    return AppMetaCompanion(key: Value(key), value: Value(value));
  }

  factory MetaEntry.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MetaEntry(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  MetaEntry copyWith({String? key, String? value}) =>
      MetaEntry(key: key ?? this.key, value: value ?? this.value);
  MetaEntry copyWithCompanion(AppMetaCompanion data) {
    return MetaEntry(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MetaEntry(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MetaEntry &&
          other.key == this.key &&
          other.value == this.value);
}

class AppMetaCompanion extends UpdateCompanion<MetaEntry> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const AppMetaCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  AppMetaCompanion.insert({
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value);
  static Insertable<MetaEntry> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  AppMetaCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<int>? rowid,
  }) {
    return AppMetaCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AppMetaCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $HabitsTable habits = $HabitsTable(this);
  late final $HabitLogsTable habitLogs = $HabitLogsTable(this);
  late final $HabitFreezesTable habitFreezes = $HabitFreezesTable(this);
  late final $HabitPeriodStatusTable habitPeriodStatus =
      $HabitPeriodStatusTable(this);
  late final $HabitStreakStateTable habitStreakState = $HabitStreakStateTable(
    this,
  );
  late final $RoutineStacksTable routineStacks = $RoutineStacksTable(this);
  late final $TasksTable tasks = $TasksTable(this);
  late final $GoalsTable goals = $GoalsTable(this);
  late final $GoalMilestonesTable goalMilestones = $GoalMilestonesTable(this);
  late final $GoalLinksTable goalLinks = $GoalLinksTable(this);
  late final $FocusSessionsTable focusSessions = $FocusSessionsTable(this);
  late final $MoodLogsTable moodLogs = $MoodLogsTable(this);
  late final $ScreenTimeDailyTable screenTimeDaily = $ScreenTimeDailyTable(
    this,
  );
  late final $ScreenTimeAppDailyTable screenTimeAppDaily =
      $ScreenTimeAppDailyTable(this);
  late final $BadgesTable badges = $BadgesTable(this);
  late final $DailyRollupsTable dailyRollups = $DailyRollupsTable(this);
  late final $SettingsTable settings = $SettingsTable(this);
  late final $AppMetaTable appMeta = $AppMetaTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    habits,
    habitLogs,
    habitFreezes,
    habitPeriodStatus,
    habitStreakState,
    routineStacks,
    tasks,
    goals,
    goalMilestones,
    goalLinks,
    focusSessions,
    moodLogs,
    screenTimeDaily,
    screenTimeAppDaily,
    badges,
    dailyRollups,
    settings,
    appMeta,
  ];
}

typedef $$HabitsTableCreateCompanionBuilder =
    HabitsCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String title,
      Value<String?> note,
      Value<String> category,
      Value<int> habitType,
      Value<double?> targetValue,
      Value<String?> unit,
      Value<int> targetDirection,
      Value<int> scheduleKind,
      Value<int> weekdayMask,
      Value<int?> targetPerPeriod,
      Value<int> periodKind,
      Value<int?> intervalDays,
      Value<String?> anchorDate,
      Value<int> weekStartDow,
      Value<String?> reminderTime,
      Value<int> reminderDaysMask,
      Value<int> sortIndex,
      Value<String?> stackId,
      Value<int?> stackPosition,
      required String startDate,
      Value<String?> endDate,
      Value<int?> archivedAt,
      Value<bool> grandfathered,
      Value<int> rowid,
    });
typedef $$HabitsTableUpdateCompanionBuilder =
    HabitsCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> title,
      Value<String?> note,
      Value<String> category,
      Value<int> habitType,
      Value<double?> targetValue,
      Value<String?> unit,
      Value<int> targetDirection,
      Value<int> scheduleKind,
      Value<int> weekdayMask,
      Value<int?> targetPerPeriod,
      Value<int> periodKind,
      Value<int?> intervalDays,
      Value<String?> anchorDate,
      Value<int> weekStartDow,
      Value<String?> reminderTime,
      Value<int> reminderDaysMask,
      Value<int> sortIndex,
      Value<String?> stackId,
      Value<int?> stackPosition,
      Value<String> startDate,
      Value<String?> endDate,
      Value<int?> archivedAt,
      Value<bool> grandfathered,
      Value<int> rowid,
    });

final class $$HabitsTableReferences
    extends BaseReferences<_$AppDatabase, $HabitsTable, Habit> {
  $$HabitsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$HabitLogsTable, List<HabitLog>>
  _habitLogsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.habitLogs,
    aliasName: $_aliasNameGenerator(db.habits.id, db.habitLogs.habitId),
  );

  $$HabitLogsTableProcessedTableManager get habitLogsRefs {
    final manager = $$HabitLogsTableTableManager(
      $_db,
      $_db.habitLogs,
    ).filter((f) => f.habitId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(_habitLogsRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$HabitFreezesTable, List<HabitFreeze>>
  _habitFreezesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.habitFreezes,
    aliasName: $_aliasNameGenerator(db.habits.id, db.habitFreezes.habitId),
  );

  $$HabitFreezesTableProcessedTableManager get habitFreezesRefs {
    final manager = $$HabitFreezesTableTableManager(
      $_db,
      $_db.habitFreezes,
    ).filter((f) => f.habitId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(_habitFreezesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$HabitPeriodStatusTable, List<HabitPeriod>>
  _habitPeriodStatusRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.habitPeriodStatus,
        aliasName: $_aliasNameGenerator(
          db.habits.id,
          db.habitPeriodStatus.habitId,
        ),
      );

  $$HabitPeriodStatusTableProcessedTableManager get habitPeriodStatusRefs {
    final manager = $$HabitPeriodStatusTableTableManager(
      $_db,
      $_db.habitPeriodStatus,
    ).filter((f) => f.habitId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _habitPeriodStatusRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$HabitStreakStateTable, List<HabitStreak>>
  _habitStreakStateRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.habitStreakState,
    aliasName: $_aliasNameGenerator(db.habits.id, db.habitStreakState.habitId),
  );

  $$HabitStreakStateTableProcessedTableManager get habitStreakStateRefs {
    final manager = $$HabitStreakStateTableTableManager(
      $_db,
      $_db.habitStreakState,
    ).filter((f) => f.habitId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _habitStreakStateRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$HabitsTableFilterComposer
    extends Composer<_$AppDatabase, $HabitsTable> {
  $$HabitsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get habitType => $composableBuilder(
    column: $table.habitType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get targetValue => $composableBuilder(
    column: $table.targetValue,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get targetDirection => $composableBuilder(
    column: $table.targetDirection,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get scheduleKind => $composableBuilder(
    column: $table.scheduleKind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get weekdayMask => $composableBuilder(
    column: $table.weekdayMask,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get targetPerPeriod => $composableBuilder(
    column: $table.targetPerPeriod,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get periodKind => $composableBuilder(
    column: $table.periodKind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get intervalDays => $composableBuilder(
    column: $table.intervalDays,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get anchorDate => $composableBuilder(
    column: $table.anchorDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get weekStartDow => $composableBuilder(
    column: $table.weekStartDow,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get reminderDaysMask => $composableBuilder(
    column: $table.reminderDaysMask,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get stackId => $composableBuilder(
    column: $table.stackId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get stackPosition => $composableBuilder(
    column: $table.stackPosition,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get startDate => $composableBuilder(
    column: $table.startDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get endDate => $composableBuilder(
    column: $table.endDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get archivedAt => $composableBuilder(
    column: $table.archivedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get grandfathered => $composableBuilder(
    column: $table.grandfathered,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> habitLogsRefs(
    Expression<bool> Function($$HabitLogsTableFilterComposer f) f,
  ) {
    final $$HabitLogsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitLogs,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitLogsTableFilterComposer(
            $db: $db,
            $table: $db.habitLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> habitFreezesRefs(
    Expression<bool> Function($$HabitFreezesTableFilterComposer f) f,
  ) {
    final $$HabitFreezesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitFreezes,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitFreezesTableFilterComposer(
            $db: $db,
            $table: $db.habitFreezes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> habitPeriodStatusRefs(
    Expression<bool> Function($$HabitPeriodStatusTableFilterComposer f) f,
  ) {
    final $$HabitPeriodStatusTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitPeriodStatus,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitPeriodStatusTableFilterComposer(
            $db: $db,
            $table: $db.habitPeriodStatus,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> habitStreakStateRefs(
    Expression<bool> Function($$HabitStreakStateTableFilterComposer f) f,
  ) {
    final $$HabitStreakStateTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitStreakState,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitStreakStateTableFilterComposer(
            $db: $db,
            $table: $db.habitStreakState,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$HabitsTableOrderingComposer
    extends Composer<_$AppDatabase, $HabitsTable> {
  $$HabitsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get habitType => $composableBuilder(
    column: $table.habitType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get targetValue => $composableBuilder(
    column: $table.targetValue,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get targetDirection => $composableBuilder(
    column: $table.targetDirection,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get scheduleKind => $composableBuilder(
    column: $table.scheduleKind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get weekdayMask => $composableBuilder(
    column: $table.weekdayMask,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get targetPerPeriod => $composableBuilder(
    column: $table.targetPerPeriod,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get periodKind => $composableBuilder(
    column: $table.periodKind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get intervalDays => $composableBuilder(
    column: $table.intervalDays,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get anchorDate => $composableBuilder(
    column: $table.anchorDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get weekStartDow => $composableBuilder(
    column: $table.weekStartDow,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get reminderDaysMask => $composableBuilder(
    column: $table.reminderDaysMask,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get stackId => $composableBuilder(
    column: $table.stackId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get stackPosition => $composableBuilder(
    column: $table.stackPosition,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get startDate => $composableBuilder(
    column: $table.startDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get endDate => $composableBuilder(
    column: $table.endDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get archivedAt => $composableBuilder(
    column: $table.archivedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get grandfathered => $composableBuilder(
    column: $table.grandfathered,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$HabitsTableAnnotationComposer
    extends Composer<_$AppDatabase, $HabitsTable> {
  $$HabitsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<int> get habitType =>
      $composableBuilder(column: $table.habitType, builder: (column) => column);

  GeneratedColumn<double> get targetValue => $composableBuilder(
    column: $table.targetValue,
    builder: (column) => column,
  );

  GeneratedColumn<String> get unit =>
      $composableBuilder(column: $table.unit, builder: (column) => column);

  GeneratedColumn<int> get targetDirection => $composableBuilder(
    column: $table.targetDirection,
    builder: (column) => column,
  );

  GeneratedColumn<int> get scheduleKind => $composableBuilder(
    column: $table.scheduleKind,
    builder: (column) => column,
  );

  GeneratedColumn<int> get weekdayMask => $composableBuilder(
    column: $table.weekdayMask,
    builder: (column) => column,
  );

  GeneratedColumn<int> get targetPerPeriod => $composableBuilder(
    column: $table.targetPerPeriod,
    builder: (column) => column,
  );

  GeneratedColumn<int> get periodKind => $composableBuilder(
    column: $table.periodKind,
    builder: (column) => column,
  );

  GeneratedColumn<int> get intervalDays => $composableBuilder(
    column: $table.intervalDays,
    builder: (column) => column,
  );

  GeneratedColumn<String> get anchorDate => $composableBuilder(
    column: $table.anchorDate,
    builder: (column) => column,
  );

  GeneratedColumn<int> get weekStartDow => $composableBuilder(
    column: $table.weekStartDow,
    builder: (column) => column,
  );

  GeneratedColumn<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => column,
  );

  GeneratedColumn<int> get reminderDaysMask => $composableBuilder(
    column: $table.reminderDaysMask,
    builder: (column) => column,
  );

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);

  GeneratedColumn<String> get stackId =>
      $composableBuilder(column: $table.stackId, builder: (column) => column);

  GeneratedColumn<int> get stackPosition => $composableBuilder(
    column: $table.stackPosition,
    builder: (column) => column,
  );

  GeneratedColumn<String> get startDate =>
      $composableBuilder(column: $table.startDate, builder: (column) => column);

  GeneratedColumn<String> get endDate =>
      $composableBuilder(column: $table.endDate, builder: (column) => column);

  GeneratedColumn<int> get archivedAt => $composableBuilder(
    column: $table.archivedAt,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get grandfathered => $composableBuilder(
    column: $table.grandfathered,
    builder: (column) => column,
  );

  Expression<T> habitLogsRefs<T extends Object>(
    Expression<T> Function($$HabitLogsTableAnnotationComposer a) f,
  ) {
    final $$HabitLogsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitLogs,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitLogsTableAnnotationComposer(
            $db: $db,
            $table: $db.habitLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> habitFreezesRefs<T extends Object>(
    Expression<T> Function($$HabitFreezesTableAnnotationComposer a) f,
  ) {
    final $$HabitFreezesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitFreezes,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitFreezesTableAnnotationComposer(
            $db: $db,
            $table: $db.habitFreezes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> habitPeriodStatusRefs<T extends Object>(
    Expression<T> Function($$HabitPeriodStatusTableAnnotationComposer a) f,
  ) {
    final $$HabitPeriodStatusTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.habitPeriodStatus,
          getReferencedColumn: (t) => t.habitId,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$HabitPeriodStatusTableAnnotationComposer(
                $db: $db,
                $table: $db.habitPeriodStatus,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<T> habitStreakStateRefs<T extends Object>(
    Expression<T> Function($$HabitStreakStateTableAnnotationComposer a) f,
  ) {
    final $$HabitStreakStateTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.habitStreakState,
      getReferencedColumn: (t) => t.habitId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitStreakStateTableAnnotationComposer(
            $db: $db,
            $table: $db.habitStreakState,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$HabitsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HabitsTable,
          Habit,
          $$HabitsTableFilterComposer,
          $$HabitsTableOrderingComposer,
          $$HabitsTableAnnotationComposer,
          $$HabitsTableCreateCompanionBuilder,
          $$HabitsTableUpdateCompanionBuilder,
          (Habit, $$HabitsTableReferences),
          Habit,
          PrefetchHooks Function({
            bool habitLogsRefs,
            bool habitFreezesRefs,
            bool habitPeriodStatusRefs,
            bool habitStreakStateRefs,
          })
        > {
  $$HabitsTableTableManager(_$AppDatabase db, $HabitsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HabitsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HabitsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HabitsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String> category = const Value.absent(),
                Value<int> habitType = const Value.absent(),
                Value<double?> targetValue = const Value.absent(),
                Value<String?> unit = const Value.absent(),
                Value<int> targetDirection = const Value.absent(),
                Value<int> scheduleKind = const Value.absent(),
                Value<int> weekdayMask = const Value.absent(),
                Value<int?> targetPerPeriod = const Value.absent(),
                Value<int> periodKind = const Value.absent(),
                Value<int?> intervalDays = const Value.absent(),
                Value<String?> anchorDate = const Value.absent(),
                Value<int> weekStartDow = const Value.absent(),
                Value<String?> reminderTime = const Value.absent(),
                Value<int> reminderDaysMask = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<String?> stackId = const Value.absent(),
                Value<int?> stackPosition = const Value.absent(),
                Value<String> startDate = const Value.absent(),
                Value<String?> endDate = const Value.absent(),
                Value<int?> archivedAt = const Value.absent(),
                Value<bool> grandfathered = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitsCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                title: title,
                note: note,
                category: category,
                habitType: habitType,
                targetValue: targetValue,
                unit: unit,
                targetDirection: targetDirection,
                scheduleKind: scheduleKind,
                weekdayMask: weekdayMask,
                targetPerPeriod: targetPerPeriod,
                periodKind: periodKind,
                intervalDays: intervalDays,
                anchorDate: anchorDate,
                weekStartDow: weekStartDow,
                reminderTime: reminderTime,
                reminderDaysMask: reminderDaysMask,
                sortIndex: sortIndex,
                stackId: stackId,
                stackPosition: stackPosition,
                startDate: startDate,
                endDate: endDate,
                archivedAt: archivedAt,
                grandfathered: grandfathered,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String title,
                Value<String?> note = const Value.absent(),
                Value<String> category = const Value.absent(),
                Value<int> habitType = const Value.absent(),
                Value<double?> targetValue = const Value.absent(),
                Value<String?> unit = const Value.absent(),
                Value<int> targetDirection = const Value.absent(),
                Value<int> scheduleKind = const Value.absent(),
                Value<int> weekdayMask = const Value.absent(),
                Value<int?> targetPerPeriod = const Value.absent(),
                Value<int> periodKind = const Value.absent(),
                Value<int?> intervalDays = const Value.absent(),
                Value<String?> anchorDate = const Value.absent(),
                Value<int> weekStartDow = const Value.absent(),
                Value<String?> reminderTime = const Value.absent(),
                Value<int> reminderDaysMask = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<String?> stackId = const Value.absent(),
                Value<int?> stackPosition = const Value.absent(),
                required String startDate,
                Value<String?> endDate = const Value.absent(),
                Value<int?> archivedAt = const Value.absent(),
                Value<bool> grandfathered = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitsCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                title: title,
                note: note,
                category: category,
                habitType: habitType,
                targetValue: targetValue,
                unit: unit,
                targetDirection: targetDirection,
                scheduleKind: scheduleKind,
                weekdayMask: weekdayMask,
                targetPerPeriod: targetPerPeriod,
                periodKind: periodKind,
                intervalDays: intervalDays,
                anchorDate: anchorDate,
                weekStartDow: weekStartDow,
                reminderTime: reminderTime,
                reminderDaysMask: reminderDaysMask,
                sortIndex: sortIndex,
                stackId: stackId,
                stackPosition: stackPosition,
                startDate: startDate,
                endDate: endDate,
                archivedAt: archivedAt,
                grandfathered: grandfathered,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) =>
                    (e.readTable(table), $$HabitsTableReferences(db, table, e)),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                habitLogsRefs = false,
                habitFreezesRefs = false,
                habitPeriodStatusRefs = false,
                habitStreakStateRefs = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (habitLogsRefs) db.habitLogs,
                    if (habitFreezesRefs) db.habitFreezes,
                    if (habitPeriodStatusRefs) db.habitPeriodStatus,
                    if (habitStreakStateRefs) db.habitStreakState,
                  ],
                  addJoins: null,
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (habitLogsRefs)
                        await $_getPrefetchedData<
                          Habit,
                          $HabitsTable,
                          HabitLog
                        >(
                          currentTable: table,
                          referencedTable: $$HabitsTableReferences
                              ._habitLogsRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$HabitsTableReferences(
                                db,
                                table,
                                p0,
                              ).habitLogsRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.habitId == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (habitFreezesRefs)
                        await $_getPrefetchedData<
                          Habit,
                          $HabitsTable,
                          HabitFreeze
                        >(
                          currentTable: table,
                          referencedTable: $$HabitsTableReferences
                              ._habitFreezesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$HabitsTableReferences(
                                db,
                                table,
                                p0,
                              ).habitFreezesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.habitId == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (habitPeriodStatusRefs)
                        await $_getPrefetchedData<
                          Habit,
                          $HabitsTable,
                          HabitPeriod
                        >(
                          currentTable: table,
                          referencedTable: $$HabitsTableReferences
                              ._habitPeriodStatusRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$HabitsTableReferences(
                                db,
                                table,
                                p0,
                              ).habitPeriodStatusRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.habitId == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (habitStreakStateRefs)
                        await $_getPrefetchedData<
                          Habit,
                          $HabitsTable,
                          HabitStreak
                        >(
                          currentTable: table,
                          referencedTable: $$HabitsTableReferences
                              ._habitStreakStateRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$HabitsTableReferences(
                                db,
                                table,
                                p0,
                              ).habitStreakStateRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.habitId == item.id,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$HabitsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HabitsTable,
      Habit,
      $$HabitsTableFilterComposer,
      $$HabitsTableOrderingComposer,
      $$HabitsTableAnnotationComposer,
      $$HabitsTableCreateCompanionBuilder,
      $$HabitsTableUpdateCompanionBuilder,
      (Habit, $$HabitsTableReferences),
      Habit,
      PrefetchHooks Function({
        bool habitLogsRefs,
        bool habitFreezesRefs,
        bool habitPeriodStatusRefs,
        bool habitStreakStateRefs,
      })
    >;
typedef $$HabitLogsTableCreateCompanionBuilder =
    HabitLogsCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String habitId,
      required String logDate,
      Value<double> value,
      Value<int> status,
      Value<String?> note,
      Value<int?> mood,
      required int loggedAt,
      Value<int> source,
      Value<bool> backfilled,
      Value<int> rowid,
    });
typedef $$HabitLogsTableUpdateCompanionBuilder =
    HabitLogsCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> habitId,
      Value<String> logDate,
      Value<double> value,
      Value<int> status,
      Value<String?> note,
      Value<int?> mood,
      Value<int> loggedAt,
      Value<int> source,
      Value<bool> backfilled,
      Value<int> rowid,
    });

final class $$HabitLogsTableReferences
    extends BaseReferences<_$AppDatabase, $HabitLogsTable, HabitLog> {
  $$HabitLogsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $HabitsTable _habitIdTable(_$AppDatabase db) => db.habits.createAlias(
    $_aliasNameGenerator(db.habitLogs.habitId, db.habits.id),
  );

  $$HabitsTableProcessedTableManager get habitId {
    final $_column = $_itemColumn<String>('habit_id')!;

    final manager = $$HabitsTableTableManager(
      $_db,
      $_db.habits,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_habitIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$HabitLogsTableFilterComposer
    extends Composer<_$AppDatabase, $HabitLogsTable> {
  $$HabitLogsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get logDate => $composableBuilder(
    column: $table.logDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get mood => $composableBuilder(
    column: $table.mood,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get loggedAt => $composableBuilder(
    column: $table.loggedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get source => $composableBuilder(
    column: $table.source,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get backfilled => $composableBuilder(
    column: $table.backfilled,
    builder: (column) => ColumnFilters(column),
  );

  $$HabitsTableFilterComposer get habitId {
    final $$HabitsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableFilterComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitLogsTableOrderingComposer
    extends Composer<_$AppDatabase, $HabitLogsTable> {
  $$HabitLogsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get logDate => $composableBuilder(
    column: $table.logDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get mood => $composableBuilder(
    column: $table.mood,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get loggedAt => $composableBuilder(
    column: $table.loggedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get source => $composableBuilder(
    column: $table.source,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get backfilled => $composableBuilder(
    column: $table.backfilled,
    builder: (column) => ColumnOrderings(column),
  );

  $$HabitsTableOrderingComposer get habitId {
    final $$HabitsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableOrderingComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitLogsTableAnnotationComposer
    extends Composer<_$AppDatabase, $HabitLogsTable> {
  $$HabitLogsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get logDate =>
      $composableBuilder(column: $table.logDate, builder: (column) => column);

  GeneratedColumn<double> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);

  GeneratedColumn<int> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<int> get mood =>
      $composableBuilder(column: $table.mood, builder: (column) => column);

  GeneratedColumn<int> get loggedAt =>
      $composableBuilder(column: $table.loggedAt, builder: (column) => column);

  GeneratedColumn<int> get source =>
      $composableBuilder(column: $table.source, builder: (column) => column);

  GeneratedColumn<bool> get backfilled => $composableBuilder(
    column: $table.backfilled,
    builder: (column) => column,
  );

  $$HabitsTableAnnotationComposer get habitId {
    final $$HabitsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableAnnotationComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitLogsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HabitLogsTable,
          HabitLog,
          $$HabitLogsTableFilterComposer,
          $$HabitLogsTableOrderingComposer,
          $$HabitLogsTableAnnotationComposer,
          $$HabitLogsTableCreateCompanionBuilder,
          $$HabitLogsTableUpdateCompanionBuilder,
          (HabitLog, $$HabitLogsTableReferences),
          HabitLog,
          PrefetchHooks Function({bool habitId})
        > {
  $$HabitLogsTableTableManager(_$AppDatabase db, $HabitLogsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HabitLogsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HabitLogsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HabitLogsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> habitId = const Value.absent(),
                Value<String> logDate = const Value.absent(),
                Value<double> value = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<int?> mood = const Value.absent(),
                Value<int> loggedAt = const Value.absent(),
                Value<int> source = const Value.absent(),
                Value<bool> backfilled = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitLogsCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                habitId: habitId,
                logDate: logDate,
                value: value,
                status: status,
                note: note,
                mood: mood,
                loggedAt: loggedAt,
                source: source,
                backfilled: backfilled,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String habitId,
                required String logDate,
                Value<double> value = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<int?> mood = const Value.absent(),
                required int loggedAt,
                Value<int> source = const Value.absent(),
                Value<bool> backfilled = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitLogsCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                habitId: habitId,
                logDate: logDate,
                value: value,
                status: status,
                note: note,
                mood: mood,
                loggedAt: loggedAt,
                source: source,
                backfilled: backfilled,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$HabitLogsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({habitId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (habitId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.habitId,
                                referencedTable: $$HabitLogsTableReferences
                                    ._habitIdTable(db),
                                referencedColumn: $$HabitLogsTableReferences
                                    ._habitIdTable(db)
                                    .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$HabitLogsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HabitLogsTable,
      HabitLog,
      $$HabitLogsTableFilterComposer,
      $$HabitLogsTableOrderingComposer,
      $$HabitLogsTableAnnotationComposer,
      $$HabitLogsTableCreateCompanionBuilder,
      $$HabitLogsTableUpdateCompanionBuilder,
      (HabitLog, $$HabitLogsTableReferences),
      HabitLog,
      PrefetchHooks Function({bool habitId})
    >;
typedef $$HabitFreezesTableCreateCompanionBuilder =
    HabitFreezesCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String habitId,
      required String freezeDate,
      Value<int> source,
      Value<int> rowid,
    });
typedef $$HabitFreezesTableUpdateCompanionBuilder =
    HabitFreezesCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> habitId,
      Value<String> freezeDate,
      Value<int> source,
      Value<int> rowid,
    });

final class $$HabitFreezesTableReferences
    extends BaseReferences<_$AppDatabase, $HabitFreezesTable, HabitFreeze> {
  $$HabitFreezesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $HabitsTable _habitIdTable(_$AppDatabase db) => db.habits.createAlias(
    $_aliasNameGenerator(db.habitFreezes.habitId, db.habits.id),
  );

  $$HabitsTableProcessedTableManager get habitId {
    final $_column = $_itemColumn<String>('habit_id')!;

    final manager = $$HabitsTableTableManager(
      $_db,
      $_db.habits,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_habitIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$HabitFreezesTableFilterComposer
    extends Composer<_$AppDatabase, $HabitFreezesTable> {
  $$HabitFreezesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get freezeDate => $composableBuilder(
    column: $table.freezeDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get source => $composableBuilder(
    column: $table.source,
    builder: (column) => ColumnFilters(column),
  );

  $$HabitsTableFilterComposer get habitId {
    final $$HabitsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableFilterComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitFreezesTableOrderingComposer
    extends Composer<_$AppDatabase, $HabitFreezesTable> {
  $$HabitFreezesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get freezeDate => $composableBuilder(
    column: $table.freezeDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get source => $composableBuilder(
    column: $table.source,
    builder: (column) => ColumnOrderings(column),
  );

  $$HabitsTableOrderingComposer get habitId {
    final $$HabitsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableOrderingComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitFreezesTableAnnotationComposer
    extends Composer<_$AppDatabase, $HabitFreezesTable> {
  $$HabitFreezesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get freezeDate => $composableBuilder(
    column: $table.freezeDate,
    builder: (column) => column,
  );

  GeneratedColumn<int> get source =>
      $composableBuilder(column: $table.source, builder: (column) => column);

  $$HabitsTableAnnotationComposer get habitId {
    final $$HabitsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableAnnotationComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitFreezesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HabitFreezesTable,
          HabitFreeze,
          $$HabitFreezesTableFilterComposer,
          $$HabitFreezesTableOrderingComposer,
          $$HabitFreezesTableAnnotationComposer,
          $$HabitFreezesTableCreateCompanionBuilder,
          $$HabitFreezesTableUpdateCompanionBuilder,
          (HabitFreeze, $$HabitFreezesTableReferences),
          HabitFreeze,
          PrefetchHooks Function({bool habitId})
        > {
  $$HabitFreezesTableTableManager(_$AppDatabase db, $HabitFreezesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HabitFreezesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HabitFreezesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HabitFreezesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> habitId = const Value.absent(),
                Value<String> freezeDate = const Value.absent(),
                Value<int> source = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitFreezesCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                habitId: habitId,
                freezeDate: freezeDate,
                source: source,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String habitId,
                required String freezeDate,
                Value<int> source = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitFreezesCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                habitId: habitId,
                freezeDate: freezeDate,
                source: source,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$HabitFreezesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({habitId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (habitId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.habitId,
                                referencedTable: $$HabitFreezesTableReferences
                                    ._habitIdTable(db),
                                referencedColumn: $$HabitFreezesTableReferences
                                    ._habitIdTable(db)
                                    .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$HabitFreezesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HabitFreezesTable,
      HabitFreeze,
      $$HabitFreezesTableFilterComposer,
      $$HabitFreezesTableOrderingComposer,
      $$HabitFreezesTableAnnotationComposer,
      $$HabitFreezesTableCreateCompanionBuilder,
      $$HabitFreezesTableUpdateCompanionBuilder,
      (HabitFreeze, $$HabitFreezesTableReferences),
      HabitFreeze,
      PrefetchHooks Function({bool habitId})
    >;
typedef $$HabitPeriodStatusTableCreateCompanionBuilder =
    HabitPeriodStatusCompanion Function({
      required String habitId,
      required String periodKey,
      required String periodStart,
      required String periodEnd,
      Value<int> required,
      Value<int> completed,
      Value<bool> frozen,
      Value<bool> satisfied,
      Value<bool> sealed,
      required int updatedAt,
      Value<int> rowid,
    });
typedef $$HabitPeriodStatusTableUpdateCompanionBuilder =
    HabitPeriodStatusCompanion Function({
      Value<String> habitId,
      Value<String> periodKey,
      Value<String> periodStart,
      Value<String> periodEnd,
      Value<int> required,
      Value<int> completed,
      Value<bool> frozen,
      Value<bool> satisfied,
      Value<bool> sealed,
      Value<int> updatedAt,
      Value<int> rowid,
    });

final class $$HabitPeriodStatusTableReferences
    extends
        BaseReferences<_$AppDatabase, $HabitPeriodStatusTable, HabitPeriod> {
  $$HabitPeriodStatusTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $HabitsTable _habitIdTable(_$AppDatabase db) => db.habits.createAlias(
    $_aliasNameGenerator(db.habitPeriodStatus.habitId, db.habits.id),
  );

  $$HabitsTableProcessedTableManager get habitId {
    final $_column = $_itemColumn<String>('habit_id')!;

    final manager = $$HabitsTableTableManager(
      $_db,
      $_db.habits,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_habitIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$HabitPeriodStatusTableFilterComposer
    extends Composer<_$AppDatabase, $HabitPeriodStatusTable> {
  $$HabitPeriodStatusTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get periodKey => $composableBuilder(
    column: $table.periodKey,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get periodStart => $composableBuilder(
    column: $table.periodStart,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get periodEnd => $composableBuilder(
    column: $table.periodEnd,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get required => $composableBuilder(
    column: $table.required,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get completed => $composableBuilder(
    column: $table.completed,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get frozen => $composableBuilder(
    column: $table.frozen,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get satisfied => $composableBuilder(
    column: $table.satisfied,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get sealed => $composableBuilder(
    column: $table.sealed,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$HabitsTableFilterComposer get habitId {
    final $$HabitsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableFilterComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitPeriodStatusTableOrderingComposer
    extends Composer<_$AppDatabase, $HabitPeriodStatusTable> {
  $$HabitPeriodStatusTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get periodKey => $composableBuilder(
    column: $table.periodKey,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get periodStart => $composableBuilder(
    column: $table.periodStart,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get periodEnd => $composableBuilder(
    column: $table.periodEnd,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get required => $composableBuilder(
    column: $table.required,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get completed => $composableBuilder(
    column: $table.completed,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get frozen => $composableBuilder(
    column: $table.frozen,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get satisfied => $composableBuilder(
    column: $table.satisfied,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get sealed => $composableBuilder(
    column: $table.sealed,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$HabitsTableOrderingComposer get habitId {
    final $$HabitsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableOrderingComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitPeriodStatusTableAnnotationComposer
    extends Composer<_$AppDatabase, $HabitPeriodStatusTable> {
  $$HabitPeriodStatusTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get periodKey =>
      $composableBuilder(column: $table.periodKey, builder: (column) => column);

  GeneratedColumn<String> get periodStart => $composableBuilder(
    column: $table.periodStart,
    builder: (column) => column,
  );

  GeneratedColumn<String> get periodEnd =>
      $composableBuilder(column: $table.periodEnd, builder: (column) => column);

  GeneratedColumn<int> get required =>
      $composableBuilder(column: $table.required, builder: (column) => column);

  GeneratedColumn<int> get completed =>
      $composableBuilder(column: $table.completed, builder: (column) => column);

  GeneratedColumn<bool> get frozen =>
      $composableBuilder(column: $table.frozen, builder: (column) => column);

  GeneratedColumn<bool> get satisfied =>
      $composableBuilder(column: $table.satisfied, builder: (column) => column);

  GeneratedColumn<bool> get sealed =>
      $composableBuilder(column: $table.sealed, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$HabitsTableAnnotationComposer get habitId {
    final $$HabitsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableAnnotationComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitPeriodStatusTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HabitPeriodStatusTable,
          HabitPeriod,
          $$HabitPeriodStatusTableFilterComposer,
          $$HabitPeriodStatusTableOrderingComposer,
          $$HabitPeriodStatusTableAnnotationComposer,
          $$HabitPeriodStatusTableCreateCompanionBuilder,
          $$HabitPeriodStatusTableUpdateCompanionBuilder,
          (HabitPeriod, $$HabitPeriodStatusTableReferences),
          HabitPeriod,
          PrefetchHooks Function({bool habitId})
        > {
  $$HabitPeriodStatusTableTableManager(
    _$AppDatabase db,
    $HabitPeriodStatusTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HabitPeriodStatusTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HabitPeriodStatusTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HabitPeriodStatusTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> habitId = const Value.absent(),
                Value<String> periodKey = const Value.absent(),
                Value<String> periodStart = const Value.absent(),
                Value<String> periodEnd = const Value.absent(),
                Value<int> required = const Value.absent(),
                Value<int> completed = const Value.absent(),
                Value<bool> frozen = const Value.absent(),
                Value<bool> satisfied = const Value.absent(),
                Value<bool> sealed = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitPeriodStatusCompanion(
                habitId: habitId,
                periodKey: periodKey,
                periodStart: periodStart,
                periodEnd: periodEnd,
                required: required,
                completed: completed,
                frozen: frozen,
                satisfied: satisfied,
                sealed: sealed,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String habitId,
                required String periodKey,
                required String periodStart,
                required String periodEnd,
                Value<int> required = const Value.absent(),
                Value<int> completed = const Value.absent(),
                Value<bool> frozen = const Value.absent(),
                Value<bool> satisfied = const Value.absent(),
                Value<bool> sealed = const Value.absent(),
                required int updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => HabitPeriodStatusCompanion.insert(
                habitId: habitId,
                periodKey: periodKey,
                periodStart: periodStart,
                periodEnd: periodEnd,
                required: required,
                completed: completed,
                frozen: frozen,
                satisfied: satisfied,
                sealed: sealed,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$HabitPeriodStatusTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({habitId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (habitId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.habitId,
                                referencedTable:
                                    $$HabitPeriodStatusTableReferences
                                        ._habitIdTable(db),
                                referencedColumn:
                                    $$HabitPeriodStatusTableReferences
                                        ._habitIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$HabitPeriodStatusTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HabitPeriodStatusTable,
      HabitPeriod,
      $$HabitPeriodStatusTableFilterComposer,
      $$HabitPeriodStatusTableOrderingComposer,
      $$HabitPeriodStatusTableAnnotationComposer,
      $$HabitPeriodStatusTableCreateCompanionBuilder,
      $$HabitPeriodStatusTableUpdateCompanionBuilder,
      (HabitPeriod, $$HabitPeriodStatusTableReferences),
      HabitPeriod,
      PrefetchHooks Function({bool habitId})
    >;
typedef $$HabitStreakStateTableCreateCompanionBuilder =
    HabitStreakStateCompanion Function({
      required String habitId,
      Value<int> currentStreak,
      Value<int> longestStreak,
      Value<String?> lastSatisfiedPeriod,
      Value<int> freezeBalance,
      Value<int> freezesEarnedTotal,
      Value<int> totalCompletions,
      Value<String?> firstLogDate,
      Value<String?> computedThrough,
      required int computedAt,
      Value<int> rowid,
    });
typedef $$HabitStreakStateTableUpdateCompanionBuilder =
    HabitStreakStateCompanion Function({
      Value<String> habitId,
      Value<int> currentStreak,
      Value<int> longestStreak,
      Value<String?> lastSatisfiedPeriod,
      Value<int> freezeBalance,
      Value<int> freezesEarnedTotal,
      Value<int> totalCompletions,
      Value<String?> firstLogDate,
      Value<String?> computedThrough,
      Value<int> computedAt,
      Value<int> rowid,
    });

final class $$HabitStreakStateTableReferences
    extends BaseReferences<_$AppDatabase, $HabitStreakStateTable, HabitStreak> {
  $$HabitStreakStateTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $HabitsTable _habitIdTable(_$AppDatabase db) => db.habits.createAlias(
    $_aliasNameGenerator(db.habitStreakState.habitId, db.habits.id),
  );

  $$HabitsTableProcessedTableManager get habitId {
    final $_column = $_itemColumn<String>('habit_id')!;

    final manager = $$HabitsTableTableManager(
      $_db,
      $_db.habits,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_habitIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$HabitStreakStateTableFilterComposer
    extends Composer<_$AppDatabase, $HabitStreakStateTable> {
  $$HabitStreakStateTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get currentStreak => $composableBuilder(
    column: $table.currentStreak,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get longestStreak => $composableBuilder(
    column: $table.longestStreak,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastSatisfiedPeriod => $composableBuilder(
    column: $table.lastSatisfiedPeriod,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get freezeBalance => $composableBuilder(
    column: $table.freezeBalance,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get freezesEarnedTotal => $composableBuilder(
    column: $table.freezesEarnedTotal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalCompletions => $composableBuilder(
    column: $table.totalCompletions,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get firstLogDate => $composableBuilder(
    column: $table.firstLogDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get computedThrough => $composableBuilder(
    column: $table.computedThrough,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$HabitsTableFilterComposer get habitId {
    final $$HabitsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableFilterComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitStreakStateTableOrderingComposer
    extends Composer<_$AppDatabase, $HabitStreakStateTable> {
  $$HabitStreakStateTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get currentStreak => $composableBuilder(
    column: $table.currentStreak,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get longestStreak => $composableBuilder(
    column: $table.longestStreak,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastSatisfiedPeriod => $composableBuilder(
    column: $table.lastSatisfiedPeriod,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get freezeBalance => $composableBuilder(
    column: $table.freezeBalance,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get freezesEarnedTotal => $composableBuilder(
    column: $table.freezesEarnedTotal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalCompletions => $composableBuilder(
    column: $table.totalCompletions,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get firstLogDate => $composableBuilder(
    column: $table.firstLogDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get computedThrough => $composableBuilder(
    column: $table.computedThrough,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$HabitsTableOrderingComposer get habitId {
    final $$HabitsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableOrderingComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitStreakStateTableAnnotationComposer
    extends Composer<_$AppDatabase, $HabitStreakStateTable> {
  $$HabitStreakStateTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get currentStreak => $composableBuilder(
    column: $table.currentStreak,
    builder: (column) => column,
  );

  GeneratedColumn<int> get longestStreak => $composableBuilder(
    column: $table.longestStreak,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastSatisfiedPeriod => $composableBuilder(
    column: $table.lastSatisfiedPeriod,
    builder: (column) => column,
  );

  GeneratedColumn<int> get freezeBalance => $composableBuilder(
    column: $table.freezeBalance,
    builder: (column) => column,
  );

  GeneratedColumn<int> get freezesEarnedTotal => $composableBuilder(
    column: $table.freezesEarnedTotal,
    builder: (column) => column,
  );

  GeneratedColumn<int> get totalCompletions => $composableBuilder(
    column: $table.totalCompletions,
    builder: (column) => column,
  );

  GeneratedColumn<String> get firstLogDate => $composableBuilder(
    column: $table.firstLogDate,
    builder: (column) => column,
  );

  GeneratedColumn<String> get computedThrough => $composableBuilder(
    column: $table.computedThrough,
    builder: (column) => column,
  );

  GeneratedColumn<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => column,
  );

  $$HabitsTableAnnotationComposer get habitId {
    final $$HabitsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.habitId,
      referencedTable: $db.habits,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HabitsTableAnnotationComposer(
            $db: $db,
            $table: $db.habits,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$HabitStreakStateTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HabitStreakStateTable,
          HabitStreak,
          $$HabitStreakStateTableFilterComposer,
          $$HabitStreakStateTableOrderingComposer,
          $$HabitStreakStateTableAnnotationComposer,
          $$HabitStreakStateTableCreateCompanionBuilder,
          $$HabitStreakStateTableUpdateCompanionBuilder,
          (HabitStreak, $$HabitStreakStateTableReferences),
          HabitStreak,
          PrefetchHooks Function({bool habitId})
        > {
  $$HabitStreakStateTableTableManager(
    _$AppDatabase db,
    $HabitStreakStateTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HabitStreakStateTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HabitStreakStateTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HabitStreakStateTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> habitId = const Value.absent(),
                Value<int> currentStreak = const Value.absent(),
                Value<int> longestStreak = const Value.absent(),
                Value<String?> lastSatisfiedPeriod = const Value.absent(),
                Value<int> freezeBalance = const Value.absent(),
                Value<int> freezesEarnedTotal = const Value.absent(),
                Value<int> totalCompletions = const Value.absent(),
                Value<String?> firstLogDate = const Value.absent(),
                Value<String?> computedThrough = const Value.absent(),
                Value<int> computedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HabitStreakStateCompanion(
                habitId: habitId,
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                lastSatisfiedPeriod: lastSatisfiedPeriod,
                freezeBalance: freezeBalance,
                freezesEarnedTotal: freezesEarnedTotal,
                totalCompletions: totalCompletions,
                firstLogDate: firstLogDate,
                computedThrough: computedThrough,
                computedAt: computedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String habitId,
                Value<int> currentStreak = const Value.absent(),
                Value<int> longestStreak = const Value.absent(),
                Value<String?> lastSatisfiedPeriod = const Value.absent(),
                Value<int> freezeBalance = const Value.absent(),
                Value<int> freezesEarnedTotal = const Value.absent(),
                Value<int> totalCompletions = const Value.absent(),
                Value<String?> firstLogDate = const Value.absent(),
                Value<String?> computedThrough = const Value.absent(),
                required int computedAt,
                Value<int> rowid = const Value.absent(),
              }) => HabitStreakStateCompanion.insert(
                habitId: habitId,
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                lastSatisfiedPeriod: lastSatisfiedPeriod,
                freezeBalance: freezeBalance,
                freezesEarnedTotal: freezesEarnedTotal,
                totalCompletions: totalCompletions,
                firstLogDate: firstLogDate,
                computedThrough: computedThrough,
                computedAt: computedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$HabitStreakStateTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({habitId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (habitId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.habitId,
                                referencedTable:
                                    $$HabitStreakStateTableReferences
                                        ._habitIdTable(db),
                                referencedColumn:
                                    $$HabitStreakStateTableReferences
                                        ._habitIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$HabitStreakStateTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HabitStreakStateTable,
      HabitStreak,
      $$HabitStreakStateTableFilterComposer,
      $$HabitStreakStateTableOrderingComposer,
      $$HabitStreakStateTableAnnotationComposer,
      $$HabitStreakStateTableCreateCompanionBuilder,
      $$HabitStreakStateTableUpdateCompanionBuilder,
      (HabitStreak, $$HabitStreakStateTableReferences),
      HabitStreak,
      PrefetchHooks Function({bool habitId})
    >;
typedef $$RoutineStacksTableCreateCompanionBuilder =
    RoutineStacksCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String name,
      Value<String?> startTime,
      Value<int> sortIndex,
      Value<int> rowid,
    });
typedef $$RoutineStacksTableUpdateCompanionBuilder =
    RoutineStacksCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> name,
      Value<String?> startTime,
      Value<int> sortIndex,
      Value<int> rowid,
    });

class $$RoutineStacksTableFilterComposer
    extends Composer<_$AppDatabase, $RoutineStacksTable> {
  $$RoutineStacksTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get startTime => $composableBuilder(
    column: $table.startTime,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );
}

class $$RoutineStacksTableOrderingComposer
    extends Composer<_$AppDatabase, $RoutineStacksTable> {
  $$RoutineStacksTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get startTime => $composableBuilder(
    column: $table.startTime,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$RoutineStacksTableAnnotationComposer
    extends Composer<_$AppDatabase, $RoutineStacksTable> {
  $$RoutineStacksTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get startTime =>
      $composableBuilder(column: $table.startTime, builder: (column) => column);

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);
}

class $$RoutineStacksTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $RoutineStacksTable,
          RoutineStack,
          $$RoutineStacksTableFilterComposer,
          $$RoutineStacksTableOrderingComposer,
          $$RoutineStacksTableAnnotationComposer,
          $$RoutineStacksTableCreateCompanionBuilder,
          $$RoutineStacksTableUpdateCompanionBuilder,
          (
            RoutineStack,
            BaseReferences<_$AppDatabase, $RoutineStacksTable, RoutineStack>,
          ),
          RoutineStack,
          PrefetchHooks Function()
        > {
  $$RoutineStacksTableTableManager(_$AppDatabase db, $RoutineStacksTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RoutineStacksTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RoutineStacksTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RoutineStacksTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> startTime = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => RoutineStacksCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                name: name,
                startTime: startTime,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String name,
                Value<String?> startTime = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => RoutineStacksCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                name: name,
                startTime: startTime,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$RoutineStacksTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $RoutineStacksTable,
      RoutineStack,
      $$RoutineStacksTableFilterComposer,
      $$RoutineStacksTableOrderingComposer,
      $$RoutineStacksTableAnnotationComposer,
      $$RoutineStacksTableCreateCompanionBuilder,
      $$RoutineStacksTableUpdateCompanionBuilder,
      (
        RoutineStack,
        BaseReferences<_$AppDatabase, $RoutineStacksTable, RoutineStack>,
      ),
      RoutineStack,
      PrefetchHooks Function()
    >;
typedef $$TasksTableCreateCompanionBuilder =
    TasksCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String title,
      Value<String?> description,
      Value<int> status,
      Value<int> priority,
      Value<String?> category,
      Value<String?> dueDate,
      Value<String?> dueTime,
      Value<int?> remindAt,
      Value<int?> completedAt,
      Value<int?> estimateMinutes,
      Value<int?> actualMinutes,
      Value<String?> parentTaskId,
      Value<String?> goalId,
      Value<String?> recurrenceRule,
      Value<String?> recurrenceParentId,
      Value<String?> imagePath,
      Value<int> sortIndex,
      Value<int> rowid,
    });
typedef $$TasksTableUpdateCompanionBuilder =
    TasksCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> title,
      Value<String?> description,
      Value<int> status,
      Value<int> priority,
      Value<String?> category,
      Value<String?> dueDate,
      Value<String?> dueTime,
      Value<int?> remindAt,
      Value<int?> completedAt,
      Value<int?> estimateMinutes,
      Value<int?> actualMinutes,
      Value<String?> parentTaskId,
      Value<String?> goalId,
      Value<String?> recurrenceRule,
      Value<String?> recurrenceParentId,
      Value<String?> imagePath,
      Value<int> sortIndex,
      Value<int> rowid,
    });

class $$TasksTableFilterComposer extends Composer<_$AppDatabase, $TasksTable> {
  $$TasksTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dueDate => $composableBuilder(
    column: $table.dueDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dueTime => $composableBuilder(
    column: $table.dueTime,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get remindAt => $composableBuilder(
    column: $table.remindAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get estimateMinutes => $composableBuilder(
    column: $table.estimateMinutes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actualMinutes => $composableBuilder(
    column: $table.actualMinutes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get parentTaskId => $composableBuilder(
    column: $table.parentTaskId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get goalId => $composableBuilder(
    column: $table.goalId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get recurrenceRule => $composableBuilder(
    column: $table.recurrenceRule,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get recurrenceParentId => $composableBuilder(
    column: $table.recurrenceParentId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get imagePath => $composableBuilder(
    column: $table.imagePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TasksTableOrderingComposer
    extends Composer<_$AppDatabase, $TasksTable> {
  $$TasksTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dueDate => $composableBuilder(
    column: $table.dueDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dueTime => $composableBuilder(
    column: $table.dueTime,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get remindAt => $composableBuilder(
    column: $table.remindAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get estimateMinutes => $composableBuilder(
    column: $table.estimateMinutes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actualMinutes => $composableBuilder(
    column: $table.actualMinutes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get parentTaskId => $composableBuilder(
    column: $table.parentTaskId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get goalId => $composableBuilder(
    column: $table.goalId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get recurrenceRule => $composableBuilder(
    column: $table.recurrenceRule,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get recurrenceParentId => $composableBuilder(
    column: $table.recurrenceParentId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get imagePath => $composableBuilder(
    column: $table.imagePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TasksTableAnnotationComposer
    extends Composer<_$AppDatabase, $TasksTable> {
  $$TasksTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<int> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<String> get dueDate =>
      $composableBuilder(column: $table.dueDate, builder: (column) => column);

  GeneratedColumn<String> get dueTime =>
      $composableBuilder(column: $table.dueTime, builder: (column) => column);

  GeneratedColumn<int> get remindAt =>
      $composableBuilder(column: $table.remindAt, builder: (column) => column);

  GeneratedColumn<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => column,
  );

  GeneratedColumn<int> get estimateMinutes => $composableBuilder(
    column: $table.estimateMinutes,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actualMinutes => $composableBuilder(
    column: $table.actualMinutes,
    builder: (column) => column,
  );

  GeneratedColumn<String> get parentTaskId => $composableBuilder(
    column: $table.parentTaskId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get goalId =>
      $composableBuilder(column: $table.goalId, builder: (column) => column);

  GeneratedColumn<String> get recurrenceRule => $composableBuilder(
    column: $table.recurrenceRule,
    builder: (column) => column,
  );

  GeneratedColumn<String> get recurrenceParentId => $composableBuilder(
    column: $table.recurrenceParentId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get imagePath =>
      $composableBuilder(column: $table.imagePath, builder: (column) => column);

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);
}

class $$TasksTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TasksTable,
          Task,
          $$TasksTableFilterComposer,
          $$TasksTableOrderingComposer,
          $$TasksTableAnnotationComposer,
          $$TasksTableCreateCompanionBuilder,
          $$TasksTableUpdateCompanionBuilder,
          (Task, BaseReferences<_$AppDatabase, $TasksTable, Task>),
          Task,
          PrefetchHooks Function()
        > {
  $$TasksTableTableManager(_$AppDatabase db, $TasksTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TasksTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TasksTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TasksTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String?> description = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<int> priority = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<String?> dueDate = const Value.absent(),
                Value<String?> dueTime = const Value.absent(),
                Value<int?> remindAt = const Value.absent(),
                Value<int?> completedAt = const Value.absent(),
                Value<int?> estimateMinutes = const Value.absent(),
                Value<int?> actualMinutes = const Value.absent(),
                Value<String?> parentTaskId = const Value.absent(),
                Value<String?> goalId = const Value.absent(),
                Value<String?> recurrenceRule = const Value.absent(),
                Value<String?> recurrenceParentId = const Value.absent(),
                Value<String?> imagePath = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TasksCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                title: title,
                description: description,
                status: status,
                priority: priority,
                category: category,
                dueDate: dueDate,
                dueTime: dueTime,
                remindAt: remindAt,
                completedAt: completedAt,
                estimateMinutes: estimateMinutes,
                actualMinutes: actualMinutes,
                parentTaskId: parentTaskId,
                goalId: goalId,
                recurrenceRule: recurrenceRule,
                recurrenceParentId: recurrenceParentId,
                imagePath: imagePath,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String title,
                Value<String?> description = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<int> priority = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<String?> dueDate = const Value.absent(),
                Value<String?> dueTime = const Value.absent(),
                Value<int?> remindAt = const Value.absent(),
                Value<int?> completedAt = const Value.absent(),
                Value<int?> estimateMinutes = const Value.absent(),
                Value<int?> actualMinutes = const Value.absent(),
                Value<String?> parentTaskId = const Value.absent(),
                Value<String?> goalId = const Value.absent(),
                Value<String?> recurrenceRule = const Value.absent(),
                Value<String?> recurrenceParentId = const Value.absent(),
                Value<String?> imagePath = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TasksCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                title: title,
                description: description,
                status: status,
                priority: priority,
                category: category,
                dueDate: dueDate,
                dueTime: dueTime,
                remindAt: remindAt,
                completedAt: completedAt,
                estimateMinutes: estimateMinutes,
                actualMinutes: actualMinutes,
                parentTaskId: parentTaskId,
                goalId: goalId,
                recurrenceRule: recurrenceRule,
                recurrenceParentId: recurrenceParentId,
                imagePath: imagePath,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TasksTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TasksTable,
      Task,
      $$TasksTableFilterComposer,
      $$TasksTableOrderingComposer,
      $$TasksTableAnnotationComposer,
      $$TasksTableCreateCompanionBuilder,
      $$TasksTableUpdateCompanionBuilder,
      (Task, BaseReferences<_$AppDatabase, $TasksTable, Task>),
      Task,
      PrefetchHooks Function()
    >;
typedef $$GoalsTableCreateCompanionBuilder =
    GoalsCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String name,
      Value<String?> description,
      Value<String?> whyNote,
      Value<String?> targetDate,
      Value<int> status,
      Value<String?> quote,
      Value<String?> coverImagePath,
      Value<int> progressMode,
      Value<int> manualProgress,
      Value<int?> completedAt,
      Value<int> sortIndex,
      Value<int> rowid,
    });
typedef $$GoalsTableUpdateCompanionBuilder =
    GoalsCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> name,
      Value<String?> description,
      Value<String?> whyNote,
      Value<String?> targetDate,
      Value<int> status,
      Value<String?> quote,
      Value<String?> coverImagePath,
      Value<int> progressMode,
      Value<int> manualProgress,
      Value<int?> completedAt,
      Value<int> sortIndex,
      Value<int> rowid,
    });

final class $$GoalsTableReferences
    extends BaseReferences<_$AppDatabase, $GoalsTable, Goal> {
  $$GoalsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$GoalMilestonesTable, List<GoalMilestone>>
  _goalMilestonesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.goalMilestones,
    aliasName: $_aliasNameGenerator(db.goals.id, db.goalMilestones.goalId),
  );

  $$GoalMilestonesTableProcessedTableManager get goalMilestonesRefs {
    final manager = $$GoalMilestonesTableTableManager(
      $_db,
      $_db.goalMilestones,
    ).filter((f) => f.goalId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(_goalMilestonesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$GoalLinksTable, List<GoalLink>>
  _goalLinksRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.goalLinks,
    aliasName: $_aliasNameGenerator(db.goals.id, db.goalLinks.goalId),
  );

  $$GoalLinksTableProcessedTableManager get goalLinksRefs {
    final manager = $$GoalLinksTableTableManager(
      $_db,
      $_db.goalLinks,
    ).filter((f) => f.goalId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(_goalLinksRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$GoalsTableFilterComposer extends Composer<_$AppDatabase, $GoalsTable> {
  $$GoalsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get whyNote => $composableBuilder(
    column: $table.whyNote,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get quote => $composableBuilder(
    column: $table.quote,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get coverImagePath => $composableBuilder(
    column: $table.coverImagePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get progressMode => $composableBuilder(
    column: $table.progressMode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get manualProgress => $composableBuilder(
    column: $table.manualProgress,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> goalMilestonesRefs(
    Expression<bool> Function($$GoalMilestonesTableFilterComposer f) f,
  ) {
    final $$GoalMilestonesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.goalMilestones,
      getReferencedColumn: (t) => t.goalId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalMilestonesTableFilterComposer(
            $db: $db,
            $table: $db.goalMilestones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> goalLinksRefs(
    Expression<bool> Function($$GoalLinksTableFilterComposer f) f,
  ) {
    final $$GoalLinksTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.goalLinks,
      getReferencedColumn: (t) => t.goalId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalLinksTableFilterComposer(
            $db: $db,
            $table: $db.goalLinks,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$GoalsTableOrderingComposer
    extends Composer<_$AppDatabase, $GoalsTable> {
  $$GoalsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get whyNote => $composableBuilder(
    column: $table.whyNote,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get quote => $composableBuilder(
    column: $table.quote,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get coverImagePath => $composableBuilder(
    column: $table.coverImagePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get progressMode => $composableBuilder(
    column: $table.progressMode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get manualProgress => $composableBuilder(
    column: $table.manualProgress,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$GoalsTableAnnotationComposer
    extends Composer<_$AppDatabase, $GoalsTable> {
  $$GoalsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<String> get whyNote =>
      $composableBuilder(column: $table.whyNote, builder: (column) => column);

  GeneratedColumn<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => column,
  );

  GeneratedColumn<int> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get quote =>
      $composableBuilder(column: $table.quote, builder: (column) => column);

  GeneratedColumn<String> get coverImagePath => $composableBuilder(
    column: $table.coverImagePath,
    builder: (column) => column,
  );

  GeneratedColumn<int> get progressMode => $composableBuilder(
    column: $table.progressMode,
    builder: (column) => column,
  );

  GeneratedColumn<int> get manualProgress => $composableBuilder(
    column: $table.manualProgress,
    builder: (column) => column,
  );

  GeneratedColumn<int> get completedAt => $composableBuilder(
    column: $table.completedAt,
    builder: (column) => column,
  );

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);

  Expression<T> goalMilestonesRefs<T extends Object>(
    Expression<T> Function($$GoalMilestonesTableAnnotationComposer a) f,
  ) {
    final $$GoalMilestonesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.goalMilestones,
      getReferencedColumn: (t) => t.goalId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalMilestonesTableAnnotationComposer(
            $db: $db,
            $table: $db.goalMilestones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> goalLinksRefs<T extends Object>(
    Expression<T> Function($$GoalLinksTableAnnotationComposer a) f,
  ) {
    final $$GoalLinksTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.goalLinks,
      getReferencedColumn: (t) => t.goalId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalLinksTableAnnotationComposer(
            $db: $db,
            $table: $db.goalLinks,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$GoalsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $GoalsTable,
          Goal,
          $$GoalsTableFilterComposer,
          $$GoalsTableOrderingComposer,
          $$GoalsTableAnnotationComposer,
          $$GoalsTableCreateCompanionBuilder,
          $$GoalsTableUpdateCompanionBuilder,
          (Goal, $$GoalsTableReferences),
          Goal,
          PrefetchHooks Function({bool goalMilestonesRefs, bool goalLinksRefs})
        > {
  $$GoalsTableTableManager(_$AppDatabase db, $GoalsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GoalsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GoalsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GoalsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> description = const Value.absent(),
                Value<String?> whyNote = const Value.absent(),
                Value<String?> targetDate = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<String?> quote = const Value.absent(),
                Value<String?> coverImagePath = const Value.absent(),
                Value<int> progressMode = const Value.absent(),
                Value<int> manualProgress = const Value.absent(),
                Value<int?> completedAt = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalsCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                name: name,
                description: description,
                whyNote: whyNote,
                targetDate: targetDate,
                status: status,
                quote: quote,
                coverImagePath: coverImagePath,
                progressMode: progressMode,
                manualProgress: manualProgress,
                completedAt: completedAt,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String name,
                Value<String?> description = const Value.absent(),
                Value<String?> whyNote = const Value.absent(),
                Value<String?> targetDate = const Value.absent(),
                Value<int> status = const Value.absent(),
                Value<String?> quote = const Value.absent(),
                Value<String?> coverImagePath = const Value.absent(),
                Value<int> progressMode = const Value.absent(),
                Value<int> manualProgress = const Value.absent(),
                Value<int?> completedAt = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalsCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                name: name,
                description: description,
                whyNote: whyNote,
                targetDate: targetDate,
                status: status,
                quote: quote,
                coverImagePath: coverImagePath,
                progressMode: progressMode,
                manualProgress: manualProgress,
                completedAt: completedAt,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) =>
                    (e.readTable(table), $$GoalsTableReferences(db, table, e)),
              )
              .toList(),
          prefetchHooksCallback:
              ({goalMilestonesRefs = false, goalLinksRefs = false}) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (goalMilestonesRefs) db.goalMilestones,
                    if (goalLinksRefs) db.goalLinks,
                  ],
                  addJoins: null,
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (goalMilestonesRefs)
                        await $_getPrefetchedData<
                          Goal,
                          $GoalsTable,
                          GoalMilestone
                        >(
                          currentTable: table,
                          referencedTable: $$GoalsTableReferences
                              ._goalMilestonesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$GoalsTableReferences(
                                db,
                                table,
                                p0,
                              ).goalMilestonesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.goalId == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (goalLinksRefs)
                        await $_getPrefetchedData<Goal, $GoalsTable, GoalLink>(
                          currentTable: table,
                          referencedTable: $$GoalsTableReferences
                              ._goalLinksRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$GoalsTableReferences(
                                db,
                                table,
                                p0,
                              ).goalLinksRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.goalId == item.id,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$GoalsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $GoalsTable,
      Goal,
      $$GoalsTableFilterComposer,
      $$GoalsTableOrderingComposer,
      $$GoalsTableAnnotationComposer,
      $$GoalsTableCreateCompanionBuilder,
      $$GoalsTableUpdateCompanionBuilder,
      (Goal, $$GoalsTableReferences),
      Goal,
      PrefetchHooks Function({bool goalMilestonesRefs, bool goalLinksRefs})
    >;
typedef $$GoalMilestonesTableCreateCompanionBuilder =
    GoalMilestonesCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String goalId,
      required String title,
      Value<String?> targetDate,
      Value<bool> done,
      Value<int?> doneAt,
      Value<int> sortIndex,
      Value<int> rowid,
    });
typedef $$GoalMilestonesTableUpdateCompanionBuilder =
    GoalMilestonesCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> goalId,
      Value<String> title,
      Value<String?> targetDate,
      Value<bool> done,
      Value<int?> doneAt,
      Value<int> sortIndex,
      Value<int> rowid,
    });

final class $$GoalMilestonesTableReferences
    extends BaseReferences<_$AppDatabase, $GoalMilestonesTable, GoalMilestone> {
  $$GoalMilestonesTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $GoalsTable _goalIdTable(_$AppDatabase db) => db.goals.createAlias(
    $_aliasNameGenerator(db.goalMilestones.goalId, db.goals.id),
  );

  $$GoalsTableProcessedTableManager get goalId {
    final $_column = $_itemColumn<String>('goal_id')!;

    final manager = $$GoalsTableTableManager(
      $_db,
      $_db.goals,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_goalIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$GoalMilestonesTableFilterComposer
    extends Composer<_$AppDatabase, $GoalMilestonesTable> {
  $$GoalMilestonesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get done => $composableBuilder(
    column: $table.done,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get doneAt => $composableBuilder(
    column: $table.doneAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );

  $$GoalsTableFilterComposer get goalId {
    final $$GoalsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableFilterComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalMilestonesTableOrderingComposer
    extends Composer<_$AppDatabase, $GoalMilestonesTable> {
  $$GoalMilestonesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get done => $composableBuilder(
    column: $table.done,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get doneAt => $composableBuilder(
    column: $table.doneAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );

  $$GoalsTableOrderingComposer get goalId {
    final $$GoalsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableOrderingComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalMilestonesTableAnnotationComposer
    extends Composer<_$AppDatabase, $GoalMilestonesTable> {
  $$GoalMilestonesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get targetDate => $composableBuilder(
    column: $table.targetDate,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get done =>
      $composableBuilder(column: $table.done, builder: (column) => column);

  GeneratedColumn<int> get doneAt =>
      $composableBuilder(column: $table.doneAt, builder: (column) => column);

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);

  $$GoalsTableAnnotationComposer get goalId {
    final $$GoalsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableAnnotationComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalMilestonesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $GoalMilestonesTable,
          GoalMilestone,
          $$GoalMilestonesTableFilterComposer,
          $$GoalMilestonesTableOrderingComposer,
          $$GoalMilestonesTableAnnotationComposer,
          $$GoalMilestonesTableCreateCompanionBuilder,
          $$GoalMilestonesTableUpdateCompanionBuilder,
          (GoalMilestone, $$GoalMilestonesTableReferences),
          GoalMilestone,
          PrefetchHooks Function({bool goalId})
        > {
  $$GoalMilestonesTableTableManager(
    _$AppDatabase db,
    $GoalMilestonesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GoalMilestonesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GoalMilestonesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GoalMilestonesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> goalId = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String?> targetDate = const Value.absent(),
                Value<bool> done = const Value.absent(),
                Value<int?> doneAt = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalMilestonesCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                goalId: goalId,
                title: title,
                targetDate: targetDate,
                done: done,
                doneAt: doneAt,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String goalId,
                required String title,
                Value<String?> targetDate = const Value.absent(),
                Value<bool> done = const Value.absent(),
                Value<int?> doneAt = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalMilestonesCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                goalId: goalId,
                title: title,
                targetDate: targetDate,
                done: done,
                doneAt: doneAt,
                sortIndex: sortIndex,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$GoalMilestonesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({goalId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (goalId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.goalId,
                                referencedTable: $$GoalMilestonesTableReferences
                                    ._goalIdTable(db),
                                referencedColumn:
                                    $$GoalMilestonesTableReferences
                                        ._goalIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$GoalMilestonesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $GoalMilestonesTable,
      GoalMilestone,
      $$GoalMilestonesTableFilterComposer,
      $$GoalMilestonesTableOrderingComposer,
      $$GoalMilestonesTableAnnotationComposer,
      $$GoalMilestonesTableCreateCompanionBuilder,
      $$GoalMilestonesTableUpdateCompanionBuilder,
      (GoalMilestone, $$GoalMilestonesTableReferences),
      GoalMilestone,
      PrefetchHooks Function({bool goalId})
    >;
typedef $$GoalLinksTableCreateCompanionBuilder =
    GoalLinksCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String goalId,
      required int entityType,
      required String entityId,
      Value<double> weight,
      Value<int> rowid,
    });
typedef $$GoalLinksTableUpdateCompanionBuilder =
    GoalLinksCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> goalId,
      Value<int> entityType,
      Value<String> entityId,
      Value<double> weight,
      Value<int> rowid,
    });

final class $$GoalLinksTableReferences
    extends BaseReferences<_$AppDatabase, $GoalLinksTable, GoalLink> {
  $$GoalLinksTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $GoalsTable _goalIdTable(_$AppDatabase db) => db.goals.createAlias(
    $_aliasNameGenerator(db.goalLinks.goalId, db.goals.id),
  );

  $$GoalsTableProcessedTableManager get goalId {
    final $_column = $_itemColumn<String>('goal_id')!;

    final manager = $$GoalsTableTableManager(
      $_db,
      $_db.goals,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_goalIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$GoalLinksTableFilterComposer
    extends Composer<_$AppDatabase, $GoalLinksTable> {
  $$GoalLinksTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get entityType => $composableBuilder(
    column: $table.entityType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnFilters(column),
  );

  $$GoalsTableFilterComposer get goalId {
    final $$GoalsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableFilterComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalLinksTableOrderingComposer
    extends Composer<_$AppDatabase, $GoalLinksTable> {
  $$GoalLinksTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get entityType => $composableBuilder(
    column: $table.entityType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnOrderings(column),
  );

  $$GoalsTableOrderingComposer get goalId {
    final $$GoalsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableOrderingComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalLinksTableAnnotationComposer
    extends Composer<_$AppDatabase, $GoalLinksTable> {
  $$GoalLinksTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<int> get entityType => $composableBuilder(
    column: $table.entityType,
    builder: (column) => column,
  );

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<double> get weight =>
      $composableBuilder(column: $table.weight, builder: (column) => column);

  $$GoalsTableAnnotationComposer get goalId {
    final $$GoalsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.goalId,
      referencedTable: $db.goals,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$GoalsTableAnnotationComposer(
            $db: $db,
            $table: $db.goals,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$GoalLinksTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $GoalLinksTable,
          GoalLink,
          $$GoalLinksTableFilterComposer,
          $$GoalLinksTableOrderingComposer,
          $$GoalLinksTableAnnotationComposer,
          $$GoalLinksTableCreateCompanionBuilder,
          $$GoalLinksTableUpdateCompanionBuilder,
          (GoalLink, $$GoalLinksTableReferences),
          GoalLink,
          PrefetchHooks Function({bool goalId})
        > {
  $$GoalLinksTableTableManager(_$AppDatabase db, $GoalLinksTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GoalLinksTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GoalLinksTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GoalLinksTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> goalId = const Value.absent(),
                Value<int> entityType = const Value.absent(),
                Value<String> entityId = const Value.absent(),
                Value<double> weight = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalLinksCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                goalId: goalId,
                entityType: entityType,
                entityId: entityId,
                weight: weight,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String goalId,
                required int entityType,
                required String entityId,
                Value<double> weight = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GoalLinksCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                goalId: goalId,
                entityType: entityType,
                entityId: entityId,
                weight: weight,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$GoalLinksTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({goalId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (goalId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.goalId,
                                referencedTable: $$GoalLinksTableReferences
                                    ._goalIdTable(db),
                                referencedColumn: $$GoalLinksTableReferences
                                    ._goalIdTable(db)
                                    .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$GoalLinksTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $GoalLinksTable,
      GoalLink,
      $$GoalLinksTableFilterComposer,
      $$GoalLinksTableOrderingComposer,
      $$GoalLinksTableAnnotationComposer,
      $$GoalLinksTableCreateCompanionBuilder,
      $$GoalLinksTableUpdateCompanionBuilder,
      (GoalLink, $$GoalLinksTableReferences),
      GoalLink,
      PrefetchHooks Function({bool goalId})
    >;
typedef $$FocusSessionsTableCreateCompanionBuilder =
    FocusSessionsCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required int startedAt,
      Value<int?> endedAt,
      required int plannedSeconds,
      Value<int> actualSeconds,
      Value<int?> resumedAt,
      Value<int> interruptions,
      Value<bool> completed,
      Value<String?> habitId,
      Value<String?> taskId,
      Value<String?> goalId,
      Value<String?> label,
      required String localDate,
      Value<int> rowid,
    });
typedef $$FocusSessionsTableUpdateCompanionBuilder =
    FocusSessionsCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<int> startedAt,
      Value<int?> endedAt,
      Value<int> plannedSeconds,
      Value<int> actualSeconds,
      Value<int?> resumedAt,
      Value<int> interruptions,
      Value<bool> completed,
      Value<String?> habitId,
      Value<String?> taskId,
      Value<String?> goalId,
      Value<String?> label,
      Value<String> localDate,
      Value<int> rowid,
    });

class $$FocusSessionsTableFilterComposer
    extends Composer<_$AppDatabase, $FocusSessionsTable> {
  $$FocusSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get startedAt => $composableBuilder(
    column: $table.startedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get endedAt => $composableBuilder(
    column: $table.endedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get plannedSeconds => $composableBuilder(
    column: $table.plannedSeconds,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actualSeconds => $composableBuilder(
    column: $table.actualSeconds,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get resumedAt => $composableBuilder(
    column: $table.resumedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get interruptions => $composableBuilder(
    column: $table.interruptions,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get completed => $composableBuilder(
    column: $table.completed,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get habitId => $composableBuilder(
    column: $table.habitId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get taskId => $composableBuilder(
    column: $table.taskId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get goalId => $composableBuilder(
    column: $table.goalId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get label => $composableBuilder(
    column: $table.label,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnFilters(column),
  );
}

class $$FocusSessionsTableOrderingComposer
    extends Composer<_$AppDatabase, $FocusSessionsTable> {
  $$FocusSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get startedAt => $composableBuilder(
    column: $table.startedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get endedAt => $composableBuilder(
    column: $table.endedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get plannedSeconds => $composableBuilder(
    column: $table.plannedSeconds,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actualSeconds => $composableBuilder(
    column: $table.actualSeconds,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get resumedAt => $composableBuilder(
    column: $table.resumedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get interruptions => $composableBuilder(
    column: $table.interruptions,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get completed => $composableBuilder(
    column: $table.completed,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get habitId => $composableBuilder(
    column: $table.habitId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get taskId => $composableBuilder(
    column: $table.taskId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get goalId => $composableBuilder(
    column: $table.goalId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get label => $composableBuilder(
    column: $table.label,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$FocusSessionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $FocusSessionsTable> {
  $$FocusSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<int> get startedAt =>
      $composableBuilder(column: $table.startedAt, builder: (column) => column);

  GeneratedColumn<int> get endedAt =>
      $composableBuilder(column: $table.endedAt, builder: (column) => column);

  GeneratedColumn<int> get plannedSeconds => $composableBuilder(
    column: $table.plannedSeconds,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actualSeconds => $composableBuilder(
    column: $table.actualSeconds,
    builder: (column) => column,
  );

  GeneratedColumn<int> get resumedAt =>
      $composableBuilder(column: $table.resumedAt, builder: (column) => column);

  GeneratedColumn<int> get interruptions => $composableBuilder(
    column: $table.interruptions,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get completed =>
      $composableBuilder(column: $table.completed, builder: (column) => column);

  GeneratedColumn<String> get habitId =>
      $composableBuilder(column: $table.habitId, builder: (column) => column);

  GeneratedColumn<String> get taskId =>
      $composableBuilder(column: $table.taskId, builder: (column) => column);

  GeneratedColumn<String> get goalId =>
      $composableBuilder(column: $table.goalId, builder: (column) => column);

  GeneratedColumn<String> get label =>
      $composableBuilder(column: $table.label, builder: (column) => column);

  GeneratedColumn<String> get localDate =>
      $composableBuilder(column: $table.localDate, builder: (column) => column);
}

class $$FocusSessionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $FocusSessionsTable,
          FocusSession,
          $$FocusSessionsTableFilterComposer,
          $$FocusSessionsTableOrderingComposer,
          $$FocusSessionsTableAnnotationComposer,
          $$FocusSessionsTableCreateCompanionBuilder,
          $$FocusSessionsTableUpdateCompanionBuilder,
          (
            FocusSession,
            BaseReferences<_$AppDatabase, $FocusSessionsTable, FocusSession>,
          ),
          FocusSession,
          PrefetchHooks Function()
        > {
  $$FocusSessionsTableTableManager(_$AppDatabase db, $FocusSessionsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$FocusSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$FocusSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$FocusSessionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<int> startedAt = const Value.absent(),
                Value<int?> endedAt = const Value.absent(),
                Value<int> plannedSeconds = const Value.absent(),
                Value<int> actualSeconds = const Value.absent(),
                Value<int?> resumedAt = const Value.absent(),
                Value<int> interruptions = const Value.absent(),
                Value<bool> completed = const Value.absent(),
                Value<String?> habitId = const Value.absent(),
                Value<String?> taskId = const Value.absent(),
                Value<String?> goalId = const Value.absent(),
                Value<String?> label = const Value.absent(),
                Value<String> localDate = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => FocusSessionsCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                startedAt: startedAt,
                endedAt: endedAt,
                plannedSeconds: plannedSeconds,
                actualSeconds: actualSeconds,
                resumedAt: resumedAt,
                interruptions: interruptions,
                completed: completed,
                habitId: habitId,
                taskId: taskId,
                goalId: goalId,
                label: label,
                localDate: localDate,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required int startedAt,
                Value<int?> endedAt = const Value.absent(),
                required int plannedSeconds,
                Value<int> actualSeconds = const Value.absent(),
                Value<int?> resumedAt = const Value.absent(),
                Value<int> interruptions = const Value.absent(),
                Value<bool> completed = const Value.absent(),
                Value<String?> habitId = const Value.absent(),
                Value<String?> taskId = const Value.absent(),
                Value<String?> goalId = const Value.absent(),
                Value<String?> label = const Value.absent(),
                required String localDate,
                Value<int> rowid = const Value.absent(),
              }) => FocusSessionsCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                startedAt: startedAt,
                endedAt: endedAt,
                plannedSeconds: plannedSeconds,
                actualSeconds: actualSeconds,
                resumedAt: resumedAt,
                interruptions: interruptions,
                completed: completed,
                habitId: habitId,
                taskId: taskId,
                goalId: goalId,
                label: label,
                localDate: localDate,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$FocusSessionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $FocusSessionsTable,
      FocusSession,
      $$FocusSessionsTableFilterComposer,
      $$FocusSessionsTableOrderingComposer,
      $$FocusSessionsTableAnnotationComposer,
      $$FocusSessionsTableCreateCompanionBuilder,
      $$FocusSessionsTableUpdateCompanionBuilder,
      (
        FocusSession,
        BaseReferences<_$AppDatabase, $FocusSessionsTable, FocusSession>,
      ),
      FocusSession,
      PrefetchHooks Function()
    >;
typedef $$MoodLogsTableCreateCompanionBuilder =
    MoodLogsCompanion Function({
      required String id,
      Value<String?> remoteId,
      required int createdAt,
      required int updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      required String logDate,
      required int score,
      Value<String?> note,
      required int loggedAt,
      Value<int> rowid,
    });
typedef $$MoodLogsTableUpdateCompanionBuilder =
    MoodLogsCompanion Function({
      Value<String> id,
      Value<String?> remoteId,
      Value<int> createdAt,
      Value<int> updatedAt,
      Value<int?> deletedAt,
      Value<bool> dirty,
      Value<String> logDate,
      Value<int> score,
      Value<String?> note,
      Value<int> loggedAt,
      Value<int> rowid,
    });

class $$MoodLogsTableFilterComposer
    extends Composer<_$AppDatabase, $MoodLogsTable> {
  $$MoodLogsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get logDate => $composableBuilder(
    column: $table.logDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get loggedAt => $composableBuilder(
    column: $table.loggedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$MoodLogsTableOrderingComposer
    extends Composer<_$AppDatabase, $MoodLogsTable> {
  $$MoodLogsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get remoteId => $composableBuilder(
    column: $table.remoteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get deletedAt => $composableBuilder(
    column: $table.deletedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get logDate => $composableBuilder(
    column: $table.logDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get loggedAt => $composableBuilder(
    column: $table.loggedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$MoodLogsTableAnnotationComposer
    extends Composer<_$AppDatabase, $MoodLogsTable> {
  $$MoodLogsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get remoteId =>
      $composableBuilder(column: $table.remoteId, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<int> get deletedAt =>
      $composableBuilder(column: $table.deletedAt, builder: (column) => column);

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);

  GeneratedColumn<String> get logDate =>
      $composableBuilder(column: $table.logDate, builder: (column) => column);

  GeneratedColumn<int> get score =>
      $composableBuilder(column: $table.score, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<int> get loggedAt =>
      $composableBuilder(column: $table.loggedAt, builder: (column) => column);
}

class $$MoodLogsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MoodLogsTable,
          MoodLog,
          $$MoodLogsTableFilterComposer,
          $$MoodLogsTableOrderingComposer,
          $$MoodLogsTableAnnotationComposer,
          $$MoodLogsTableCreateCompanionBuilder,
          $$MoodLogsTableUpdateCompanionBuilder,
          (MoodLog, BaseReferences<_$AppDatabase, $MoodLogsTable, MoodLog>),
          MoodLog,
          PrefetchHooks Function()
        > {
  $$MoodLogsTableTableManager(_$AppDatabase db, $MoodLogsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MoodLogsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MoodLogsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MoodLogsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> remoteId = const Value.absent(),
                Value<int> createdAt = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<String> logDate = const Value.absent(),
                Value<int> score = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<int> loggedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MoodLogsCompanion(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                logDate: logDate,
                score: score,
                note: note,
                loggedAt: loggedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> remoteId = const Value.absent(),
                required int createdAt,
                required int updatedAt,
                Value<int?> deletedAt = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                required String logDate,
                required int score,
                Value<String?> note = const Value.absent(),
                required int loggedAt,
                Value<int> rowid = const Value.absent(),
              }) => MoodLogsCompanion.insert(
                id: id,
                remoteId: remoteId,
                createdAt: createdAt,
                updatedAt: updatedAt,
                deletedAt: deletedAt,
                dirty: dirty,
                logDate: logDate,
                score: score,
                note: note,
                loggedAt: loggedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$MoodLogsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MoodLogsTable,
      MoodLog,
      $$MoodLogsTableFilterComposer,
      $$MoodLogsTableOrderingComposer,
      $$MoodLogsTableAnnotationComposer,
      $$MoodLogsTableCreateCompanionBuilder,
      $$MoodLogsTableUpdateCompanionBuilder,
      (MoodLog, BaseReferences<_$AppDatabase, $MoodLogsTable, MoodLog>),
      MoodLog,
      PrefetchHooks Function()
    >;
typedef $$ScreenTimeDailyTableCreateCompanionBuilder =
    ScreenTimeDailyCompanion Function({
      required String localDate,
      Value<int> totalForegroundMs,
      Value<int> unlockCount,
      Value<int?> firstUnlockAt,
      Value<String?> topAppsJson,
      required int collectedAt,
      Value<bool> isPartial,
      Value<int> rowid,
    });
typedef $$ScreenTimeDailyTableUpdateCompanionBuilder =
    ScreenTimeDailyCompanion Function({
      Value<String> localDate,
      Value<int> totalForegroundMs,
      Value<int> unlockCount,
      Value<int?> firstUnlockAt,
      Value<String?> topAppsJson,
      Value<int> collectedAt,
      Value<bool> isPartial,
      Value<int> rowid,
    });

class $$ScreenTimeDailyTableFilterComposer
    extends Composer<_$AppDatabase, $ScreenTimeDailyTable> {
  $$ScreenTimeDailyTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalForegroundMs => $composableBuilder(
    column: $table.totalForegroundMs,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get unlockCount => $composableBuilder(
    column: $table.unlockCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get firstUnlockAt => $composableBuilder(
    column: $table.firstUnlockAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get topAppsJson => $composableBuilder(
    column: $table.topAppsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get collectedAt => $composableBuilder(
    column: $table.collectedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isPartial => $composableBuilder(
    column: $table.isPartial,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ScreenTimeDailyTableOrderingComposer
    extends Composer<_$AppDatabase, $ScreenTimeDailyTable> {
  $$ScreenTimeDailyTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalForegroundMs => $composableBuilder(
    column: $table.totalForegroundMs,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get unlockCount => $composableBuilder(
    column: $table.unlockCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get firstUnlockAt => $composableBuilder(
    column: $table.firstUnlockAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get topAppsJson => $composableBuilder(
    column: $table.topAppsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get collectedAt => $composableBuilder(
    column: $table.collectedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isPartial => $composableBuilder(
    column: $table.isPartial,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ScreenTimeDailyTableAnnotationComposer
    extends Composer<_$AppDatabase, $ScreenTimeDailyTable> {
  $$ScreenTimeDailyTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localDate =>
      $composableBuilder(column: $table.localDate, builder: (column) => column);

  GeneratedColumn<int> get totalForegroundMs => $composableBuilder(
    column: $table.totalForegroundMs,
    builder: (column) => column,
  );

  GeneratedColumn<int> get unlockCount => $composableBuilder(
    column: $table.unlockCount,
    builder: (column) => column,
  );

  GeneratedColumn<int> get firstUnlockAt => $composableBuilder(
    column: $table.firstUnlockAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get topAppsJson => $composableBuilder(
    column: $table.topAppsJson,
    builder: (column) => column,
  );

  GeneratedColumn<int> get collectedAt => $composableBuilder(
    column: $table.collectedAt,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isPartial =>
      $composableBuilder(column: $table.isPartial, builder: (column) => column);
}

class $$ScreenTimeDailyTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ScreenTimeDailyTable,
          ScreenTimeDay,
          $$ScreenTimeDailyTableFilterComposer,
          $$ScreenTimeDailyTableOrderingComposer,
          $$ScreenTimeDailyTableAnnotationComposer,
          $$ScreenTimeDailyTableCreateCompanionBuilder,
          $$ScreenTimeDailyTableUpdateCompanionBuilder,
          (
            ScreenTimeDay,
            BaseReferences<_$AppDatabase, $ScreenTimeDailyTable, ScreenTimeDay>,
          ),
          ScreenTimeDay,
          PrefetchHooks Function()
        > {
  $$ScreenTimeDailyTableTableManager(
    _$AppDatabase db,
    $ScreenTimeDailyTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ScreenTimeDailyTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ScreenTimeDailyTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ScreenTimeDailyTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> localDate = const Value.absent(),
                Value<int> totalForegroundMs = const Value.absent(),
                Value<int> unlockCount = const Value.absent(),
                Value<int?> firstUnlockAt = const Value.absent(),
                Value<String?> topAppsJson = const Value.absent(),
                Value<int> collectedAt = const Value.absent(),
                Value<bool> isPartial = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ScreenTimeDailyCompanion(
                localDate: localDate,
                totalForegroundMs: totalForegroundMs,
                unlockCount: unlockCount,
                firstUnlockAt: firstUnlockAt,
                topAppsJson: topAppsJson,
                collectedAt: collectedAt,
                isPartial: isPartial,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String localDate,
                Value<int> totalForegroundMs = const Value.absent(),
                Value<int> unlockCount = const Value.absent(),
                Value<int?> firstUnlockAt = const Value.absent(),
                Value<String?> topAppsJson = const Value.absent(),
                required int collectedAt,
                Value<bool> isPartial = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ScreenTimeDailyCompanion.insert(
                localDate: localDate,
                totalForegroundMs: totalForegroundMs,
                unlockCount: unlockCount,
                firstUnlockAt: firstUnlockAt,
                topAppsJson: topAppsJson,
                collectedAt: collectedAt,
                isPartial: isPartial,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ScreenTimeDailyTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ScreenTimeDailyTable,
      ScreenTimeDay,
      $$ScreenTimeDailyTableFilterComposer,
      $$ScreenTimeDailyTableOrderingComposer,
      $$ScreenTimeDailyTableAnnotationComposer,
      $$ScreenTimeDailyTableCreateCompanionBuilder,
      $$ScreenTimeDailyTableUpdateCompanionBuilder,
      (
        ScreenTimeDay,
        BaseReferences<_$AppDatabase, $ScreenTimeDailyTable, ScreenTimeDay>,
      ),
      ScreenTimeDay,
      PrefetchHooks Function()
    >;
typedef $$ScreenTimeAppDailyTableCreateCompanionBuilder =
    ScreenTimeAppDailyCompanion Function({
      required String localDate,
      required String packageName,
      Value<String?> appLabel,
      Value<int> foregroundMs,
      Value<int> launchCount,
      Value<int> category,
      Value<int> rowid,
    });
typedef $$ScreenTimeAppDailyTableUpdateCompanionBuilder =
    ScreenTimeAppDailyCompanion Function({
      Value<String> localDate,
      Value<String> packageName,
      Value<String?> appLabel,
      Value<int> foregroundMs,
      Value<int> launchCount,
      Value<int> category,
      Value<int> rowid,
    });

class $$ScreenTimeAppDailyTableFilterComposer
    extends Composer<_$AppDatabase, $ScreenTimeAppDailyTable> {
  $$ScreenTimeAppDailyTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get packageName => $composableBuilder(
    column: $table.packageName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get appLabel => $composableBuilder(
    column: $table.appLabel,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get foregroundMs => $composableBuilder(
    column: $table.foregroundMs,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get launchCount => $composableBuilder(
    column: $table.launchCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ScreenTimeAppDailyTableOrderingComposer
    extends Composer<_$AppDatabase, $ScreenTimeAppDailyTable> {
  $$ScreenTimeAppDailyTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get packageName => $composableBuilder(
    column: $table.packageName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get appLabel => $composableBuilder(
    column: $table.appLabel,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get foregroundMs => $composableBuilder(
    column: $table.foregroundMs,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get launchCount => $composableBuilder(
    column: $table.launchCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ScreenTimeAppDailyTableAnnotationComposer
    extends Composer<_$AppDatabase, $ScreenTimeAppDailyTable> {
  $$ScreenTimeAppDailyTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localDate =>
      $composableBuilder(column: $table.localDate, builder: (column) => column);

  GeneratedColumn<String> get packageName => $composableBuilder(
    column: $table.packageName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get appLabel =>
      $composableBuilder(column: $table.appLabel, builder: (column) => column);

  GeneratedColumn<int> get foregroundMs => $composableBuilder(
    column: $table.foregroundMs,
    builder: (column) => column,
  );

  GeneratedColumn<int> get launchCount => $composableBuilder(
    column: $table.launchCount,
    builder: (column) => column,
  );

  GeneratedColumn<int> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);
}

class $$ScreenTimeAppDailyTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ScreenTimeAppDailyTable,
          ScreenTimeApp,
          $$ScreenTimeAppDailyTableFilterComposer,
          $$ScreenTimeAppDailyTableOrderingComposer,
          $$ScreenTimeAppDailyTableAnnotationComposer,
          $$ScreenTimeAppDailyTableCreateCompanionBuilder,
          $$ScreenTimeAppDailyTableUpdateCompanionBuilder,
          (
            ScreenTimeApp,
            BaseReferences<
              _$AppDatabase,
              $ScreenTimeAppDailyTable,
              ScreenTimeApp
            >,
          ),
          ScreenTimeApp,
          PrefetchHooks Function()
        > {
  $$ScreenTimeAppDailyTableTableManager(
    _$AppDatabase db,
    $ScreenTimeAppDailyTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ScreenTimeAppDailyTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ScreenTimeAppDailyTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ScreenTimeAppDailyTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> localDate = const Value.absent(),
                Value<String> packageName = const Value.absent(),
                Value<String?> appLabel = const Value.absent(),
                Value<int> foregroundMs = const Value.absent(),
                Value<int> launchCount = const Value.absent(),
                Value<int> category = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ScreenTimeAppDailyCompanion(
                localDate: localDate,
                packageName: packageName,
                appLabel: appLabel,
                foregroundMs: foregroundMs,
                launchCount: launchCount,
                category: category,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String localDate,
                required String packageName,
                Value<String?> appLabel = const Value.absent(),
                Value<int> foregroundMs = const Value.absent(),
                Value<int> launchCount = const Value.absent(),
                Value<int> category = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ScreenTimeAppDailyCompanion.insert(
                localDate: localDate,
                packageName: packageName,
                appLabel: appLabel,
                foregroundMs: foregroundMs,
                launchCount: launchCount,
                category: category,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ScreenTimeAppDailyTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ScreenTimeAppDailyTable,
      ScreenTimeApp,
      $$ScreenTimeAppDailyTableFilterComposer,
      $$ScreenTimeAppDailyTableOrderingComposer,
      $$ScreenTimeAppDailyTableAnnotationComposer,
      $$ScreenTimeAppDailyTableCreateCompanionBuilder,
      $$ScreenTimeAppDailyTableUpdateCompanionBuilder,
      (
        ScreenTimeApp,
        BaseReferences<_$AppDatabase, $ScreenTimeAppDailyTable, ScreenTimeApp>,
      ),
      ScreenTimeApp,
      PrefetchHooks Function()
    >;
typedef $$BadgesTableCreateCompanionBuilder =
    BadgesCompanion Function({
      required String key,
      required int earnedAt,
      Value<bool> popupShown,
      Value<bool> dirty,
      Value<int> rowid,
    });
typedef $$BadgesTableUpdateCompanionBuilder =
    BadgesCompanion Function({
      Value<String> key,
      Value<int> earnedAt,
      Value<bool> popupShown,
      Value<bool> dirty,
      Value<int> rowid,
    });

class $$BadgesTableFilterComposer
    extends Composer<_$AppDatabase, $BadgesTable> {
  $$BadgesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get earnedAt => $composableBuilder(
    column: $table.earnedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get popupShown => $composableBuilder(
    column: $table.popupShown,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );
}

class $$BadgesTableOrderingComposer
    extends Composer<_$AppDatabase, $BadgesTable> {
  $$BadgesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get earnedAt => $composableBuilder(
    column: $table.earnedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get popupShown => $composableBuilder(
    column: $table.popupShown,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$BadgesTableAnnotationComposer
    extends Composer<_$AppDatabase, $BadgesTable> {
  $$BadgesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<int> get earnedAt =>
      $composableBuilder(column: $table.earnedAt, builder: (column) => column);

  GeneratedColumn<bool> get popupShown => $composableBuilder(
    column: $table.popupShown,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);
}

class $$BadgesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $BadgesTable,
          Badge,
          $$BadgesTableFilterComposer,
          $$BadgesTableOrderingComposer,
          $$BadgesTableAnnotationComposer,
          $$BadgesTableCreateCompanionBuilder,
          $$BadgesTableUpdateCompanionBuilder,
          (Badge, BaseReferences<_$AppDatabase, $BadgesTable, Badge>),
          Badge,
          PrefetchHooks Function()
        > {
  $$BadgesTableTableManager(_$AppDatabase db, $BadgesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BadgesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BadgesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BadgesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<int> earnedAt = const Value.absent(),
                Value<bool> popupShown = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => BadgesCompanion(
                key: key,
                earnedAt: earnedAt,
                popupShown: popupShown,
                dirty: dirty,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String key,
                required int earnedAt,
                Value<bool> popupShown = const Value.absent(),
                Value<bool> dirty = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => BadgesCompanion.insert(
                key: key,
                earnedAt: earnedAt,
                popupShown: popupShown,
                dirty: dirty,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$BadgesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $BadgesTable,
      Badge,
      $$BadgesTableFilterComposer,
      $$BadgesTableOrderingComposer,
      $$BadgesTableAnnotationComposer,
      $$BadgesTableCreateCompanionBuilder,
      $$BadgesTableUpdateCompanionBuilder,
      (Badge, BaseReferences<_$AppDatabase, $BadgesTable, Badge>),
      Badge,
      PrefetchHooks Function()
    >;
typedef $$DailyRollupsTableCreateCompanionBuilder =
    DailyRollupsCompanion Function({
      required String localDate,
      Value<int> habitsScheduled,
      Value<int> habitsCompleted,
      Value<int> habitsFrozen,
      Value<int> tasksDue,
      Value<int> tasksCompleted,
      Value<int> focusMinutes,
      Value<int> screenMinutes,
      Value<int> score,
      Value<int> intensity,
      required int computedAt,
      Value<int> rowid,
    });
typedef $$DailyRollupsTableUpdateCompanionBuilder =
    DailyRollupsCompanion Function({
      Value<String> localDate,
      Value<int> habitsScheduled,
      Value<int> habitsCompleted,
      Value<int> habitsFrozen,
      Value<int> tasksDue,
      Value<int> tasksCompleted,
      Value<int> focusMinutes,
      Value<int> screenMinutes,
      Value<int> score,
      Value<int> intensity,
      Value<int> computedAt,
      Value<int> rowid,
    });

class $$DailyRollupsTableFilterComposer
    extends Composer<_$AppDatabase, $DailyRollupsTable> {
  $$DailyRollupsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get habitsScheduled => $composableBuilder(
    column: $table.habitsScheduled,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get habitsCompleted => $composableBuilder(
    column: $table.habitsCompleted,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get habitsFrozen => $composableBuilder(
    column: $table.habitsFrozen,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get tasksDue => $composableBuilder(
    column: $table.tasksDue,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get tasksCompleted => $composableBuilder(
    column: $table.tasksCompleted,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get focusMinutes => $composableBuilder(
    column: $table.focusMinutes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get screenMinutes => $composableBuilder(
    column: $table.screenMinutes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get intensity => $composableBuilder(
    column: $table.intensity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$DailyRollupsTableOrderingComposer
    extends Composer<_$AppDatabase, $DailyRollupsTable> {
  $$DailyRollupsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localDate => $composableBuilder(
    column: $table.localDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get habitsScheduled => $composableBuilder(
    column: $table.habitsScheduled,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get habitsCompleted => $composableBuilder(
    column: $table.habitsCompleted,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get habitsFrozen => $composableBuilder(
    column: $table.habitsFrozen,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get tasksDue => $composableBuilder(
    column: $table.tasksDue,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get tasksCompleted => $composableBuilder(
    column: $table.tasksCompleted,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get focusMinutes => $composableBuilder(
    column: $table.focusMinutes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get screenMinutes => $composableBuilder(
    column: $table.screenMinutes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get score => $composableBuilder(
    column: $table.score,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get intensity => $composableBuilder(
    column: $table.intensity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$DailyRollupsTableAnnotationComposer
    extends Composer<_$AppDatabase, $DailyRollupsTable> {
  $$DailyRollupsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localDate =>
      $composableBuilder(column: $table.localDate, builder: (column) => column);

  GeneratedColumn<int> get habitsScheduled => $composableBuilder(
    column: $table.habitsScheduled,
    builder: (column) => column,
  );

  GeneratedColumn<int> get habitsCompleted => $composableBuilder(
    column: $table.habitsCompleted,
    builder: (column) => column,
  );

  GeneratedColumn<int> get habitsFrozen => $composableBuilder(
    column: $table.habitsFrozen,
    builder: (column) => column,
  );

  GeneratedColumn<int> get tasksDue =>
      $composableBuilder(column: $table.tasksDue, builder: (column) => column);

  GeneratedColumn<int> get tasksCompleted => $composableBuilder(
    column: $table.tasksCompleted,
    builder: (column) => column,
  );

  GeneratedColumn<int> get focusMinutes => $composableBuilder(
    column: $table.focusMinutes,
    builder: (column) => column,
  );

  GeneratedColumn<int> get screenMinutes => $composableBuilder(
    column: $table.screenMinutes,
    builder: (column) => column,
  );

  GeneratedColumn<int> get score =>
      $composableBuilder(column: $table.score, builder: (column) => column);

  GeneratedColumn<int> get intensity =>
      $composableBuilder(column: $table.intensity, builder: (column) => column);

  GeneratedColumn<int> get computedAt => $composableBuilder(
    column: $table.computedAt,
    builder: (column) => column,
  );
}

class $$DailyRollupsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $DailyRollupsTable,
          DailyRollup,
          $$DailyRollupsTableFilterComposer,
          $$DailyRollupsTableOrderingComposer,
          $$DailyRollupsTableAnnotationComposer,
          $$DailyRollupsTableCreateCompanionBuilder,
          $$DailyRollupsTableUpdateCompanionBuilder,
          (
            DailyRollup,
            BaseReferences<_$AppDatabase, $DailyRollupsTable, DailyRollup>,
          ),
          DailyRollup,
          PrefetchHooks Function()
        > {
  $$DailyRollupsTableTableManager(_$AppDatabase db, $DailyRollupsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$DailyRollupsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$DailyRollupsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$DailyRollupsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> localDate = const Value.absent(),
                Value<int> habitsScheduled = const Value.absent(),
                Value<int> habitsCompleted = const Value.absent(),
                Value<int> habitsFrozen = const Value.absent(),
                Value<int> tasksDue = const Value.absent(),
                Value<int> tasksCompleted = const Value.absent(),
                Value<int> focusMinutes = const Value.absent(),
                Value<int> screenMinutes = const Value.absent(),
                Value<int> score = const Value.absent(),
                Value<int> intensity = const Value.absent(),
                Value<int> computedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DailyRollupsCompanion(
                localDate: localDate,
                habitsScheduled: habitsScheduled,
                habitsCompleted: habitsCompleted,
                habitsFrozen: habitsFrozen,
                tasksDue: tasksDue,
                tasksCompleted: tasksCompleted,
                focusMinutes: focusMinutes,
                screenMinutes: screenMinutes,
                score: score,
                intensity: intensity,
                computedAt: computedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String localDate,
                Value<int> habitsScheduled = const Value.absent(),
                Value<int> habitsCompleted = const Value.absent(),
                Value<int> habitsFrozen = const Value.absent(),
                Value<int> tasksDue = const Value.absent(),
                Value<int> tasksCompleted = const Value.absent(),
                Value<int> focusMinutes = const Value.absent(),
                Value<int> screenMinutes = const Value.absent(),
                Value<int> score = const Value.absent(),
                Value<int> intensity = const Value.absent(),
                required int computedAt,
                Value<int> rowid = const Value.absent(),
              }) => DailyRollupsCompanion.insert(
                localDate: localDate,
                habitsScheduled: habitsScheduled,
                habitsCompleted: habitsCompleted,
                habitsFrozen: habitsFrozen,
                tasksDue: tasksDue,
                tasksCompleted: tasksCompleted,
                focusMinutes: focusMinutes,
                screenMinutes: screenMinutes,
                score: score,
                intensity: intensity,
                computedAt: computedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$DailyRollupsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $DailyRollupsTable,
      DailyRollup,
      $$DailyRollupsTableFilterComposer,
      $$DailyRollupsTableOrderingComposer,
      $$DailyRollupsTableAnnotationComposer,
      $$DailyRollupsTableCreateCompanionBuilder,
      $$DailyRollupsTableUpdateCompanionBuilder,
      (
        DailyRollup,
        BaseReferences<_$AppDatabase, $DailyRollupsTable, DailyRollup>,
      ),
      DailyRollup,
      PrefetchHooks Function()
    >;
typedef $$SettingsTableCreateCompanionBuilder =
    SettingsCompanion Function({
      required String key,
      required String value,
      required int updatedAt,
      Value<int> rowid,
    });
typedef $$SettingsTableUpdateCompanionBuilder =
    SettingsCompanion Function({
      Value<String> key,
      Value<String> value,
      Value<int> updatedAt,
      Value<int> rowid,
    });

class $$SettingsTableFilterComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$SettingsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SettingsTable,
          Setting,
          $$SettingsTableFilterComposer,
          $$SettingsTableOrderingComposer,
          $$SettingsTableAnnotationComposer,
          $$SettingsTableCreateCompanionBuilder,
          $$SettingsTableUpdateCompanionBuilder,
          (Setting, BaseReferences<_$AppDatabase, $SettingsTable, Setting>),
          Setting,
          PrefetchHooks Function()
        > {
  $$SettingsTableTableManager(_$AppDatabase db, $SettingsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SettingsCompanion(
                key: key,
                value: value,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String key,
                required String value,
                required int updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => SettingsCompanion.insert(
                key: key,
                value: value,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SettingsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SettingsTable,
      Setting,
      $$SettingsTableFilterComposer,
      $$SettingsTableOrderingComposer,
      $$SettingsTableAnnotationComposer,
      $$SettingsTableCreateCompanionBuilder,
      $$SettingsTableUpdateCompanionBuilder,
      (Setting, BaseReferences<_$AppDatabase, $SettingsTable, Setting>),
      Setting,
      PrefetchHooks Function()
    >;
typedef $$AppMetaTableCreateCompanionBuilder =
    AppMetaCompanion Function({
      required String key,
      required String value,
      Value<int> rowid,
    });
typedef $$AppMetaTableUpdateCompanionBuilder =
    AppMetaCompanion Function({
      Value<String> key,
      Value<String> value,
      Value<int> rowid,
    });

class $$AppMetaTableFilterComposer
    extends Composer<_$AppDatabase, $AppMetaTable> {
  $$AppMetaTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );
}

class $$AppMetaTableOrderingComposer
    extends Composer<_$AppDatabase, $AppMetaTable> {
  $$AppMetaTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$AppMetaTableAnnotationComposer
    extends Composer<_$AppDatabase, $AppMetaTable> {
  $$AppMetaTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$AppMetaTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $AppMetaTable,
          MetaEntry,
          $$AppMetaTableFilterComposer,
          $$AppMetaTableOrderingComposer,
          $$AppMetaTableAnnotationComposer,
          $$AppMetaTableCreateCompanionBuilder,
          $$AppMetaTableUpdateCompanionBuilder,
          (MetaEntry, BaseReferences<_$AppDatabase, $AppMetaTable, MetaEntry>),
          MetaEntry,
          PrefetchHooks Function()
        > {
  $$AppMetaTableTableManager(_$AppDatabase db, $AppMetaTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AppMetaTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AppMetaTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AppMetaTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => AppMetaCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback:
              ({
                required String key,
                required String value,
                Value<int> rowid = const Value.absent(),
              }) =>
                  AppMetaCompanion.insert(key: key, value: value, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$AppMetaTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $AppMetaTable,
      MetaEntry,
      $$AppMetaTableFilterComposer,
      $$AppMetaTableOrderingComposer,
      $$AppMetaTableAnnotationComposer,
      $$AppMetaTableCreateCompanionBuilder,
      $$AppMetaTableUpdateCompanionBuilder,
      (MetaEntry, BaseReferences<_$AppDatabase, $AppMetaTable, MetaEntry>),
      MetaEntry,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$HabitsTableTableManager get habits =>
      $$HabitsTableTableManager(_db, _db.habits);
  $$HabitLogsTableTableManager get habitLogs =>
      $$HabitLogsTableTableManager(_db, _db.habitLogs);
  $$HabitFreezesTableTableManager get habitFreezes =>
      $$HabitFreezesTableTableManager(_db, _db.habitFreezes);
  $$HabitPeriodStatusTableTableManager get habitPeriodStatus =>
      $$HabitPeriodStatusTableTableManager(_db, _db.habitPeriodStatus);
  $$HabitStreakStateTableTableManager get habitStreakState =>
      $$HabitStreakStateTableTableManager(_db, _db.habitStreakState);
  $$RoutineStacksTableTableManager get routineStacks =>
      $$RoutineStacksTableTableManager(_db, _db.routineStacks);
  $$TasksTableTableManager get tasks =>
      $$TasksTableTableManager(_db, _db.tasks);
  $$GoalsTableTableManager get goals =>
      $$GoalsTableTableManager(_db, _db.goals);
  $$GoalMilestonesTableTableManager get goalMilestones =>
      $$GoalMilestonesTableTableManager(_db, _db.goalMilestones);
  $$GoalLinksTableTableManager get goalLinks =>
      $$GoalLinksTableTableManager(_db, _db.goalLinks);
  $$FocusSessionsTableTableManager get focusSessions =>
      $$FocusSessionsTableTableManager(_db, _db.focusSessions);
  $$MoodLogsTableTableManager get moodLogs =>
      $$MoodLogsTableTableManager(_db, _db.moodLogs);
  $$ScreenTimeDailyTableTableManager get screenTimeDaily =>
      $$ScreenTimeDailyTableTableManager(_db, _db.screenTimeDaily);
  $$ScreenTimeAppDailyTableTableManager get screenTimeAppDaily =>
      $$ScreenTimeAppDailyTableTableManager(_db, _db.screenTimeAppDaily);
  $$BadgesTableTableManager get badges =>
      $$BadgesTableTableManager(_db, _db.badges);
  $$DailyRollupsTableTableManager get dailyRollups =>
      $$DailyRollupsTableTableManager(_db, _db.dailyRollups);
  $$SettingsTableTableManager get settings =>
      $$SettingsTableTableManager(_db, _db.settings);
  $$AppMetaTableTableManager get appMeta =>
      $$AppMetaTableTableManager(_db, _db.appMeta);
}

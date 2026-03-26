import { LocalNotifications } from '@capacitor/local-notifications';

const ROUTINE_REMINDER_ID = 1001;

const reminderMessages = [
  'Time to update your routines! Keep that streak alive 🔥',
  'Have you logged your habits today? Stay consistent 💪',
  "Your routines are waiting. Don't break the chain! ⛓️",
  'Daily check-in time! Update your routines now 📋',
  'Stay hard, stay consistent. Log your routines! 🎯',
  'Your future self will thank you. Update routines now ✅',
  "Discipline = Freedom. Log today's habits! 🏆",
];

function getRandomReminderMessage(): string {
  return reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
}

export async function cancelRoutineReminder(): Promise<void> {
  await LocalNotifications.cancel({
    notifications: [{ id: ROUTINE_REMINDER_ID }],
  });
}

export async function scheduleRoutineReminder(time: string): Promise<void> {
  console.log('=== SCHEDULING REMINDER ===');
  console.log('Scheduling for time:', time);
  try {
    await cancelRoutineReminder();
  } catch {
    // ignore if no prior notification exists
  }

  const [hours, minutes] = time.split(':').map(Number);
  console.log('Hours:', hours, 'Minutes:', minutes);
  const scheduledDate = new Date();
  scheduledDate.setHours(Number.isFinite(hours) ? hours : 20, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (scheduledDate <= new Date()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    console.log('Time passed today, scheduling tomorrow');
  }
  console.log('Scheduled for:', scheduledDate.toISOString());
  console.log('Scheduling at:', scheduledDate.toString());

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ROUTINE_REMINDER_ID,
        title: 'StayHardy 💪',
        body: getRandomReminderMessage(),
        schedule: {
          at: scheduledDate,
          repeats: true,
          every: 'day',
          allowWhileIdle: true,
        },
        sound: 'stayhardy_reminder.wav',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#00E87A',
        channelId: 'stayhardy_reminders',
        extra: { type: 'routine_reminder', scheduledTime: time },
        actionTypeId: '',
        attachments: [],
      },
    ],
  });

  console.log('Notification scheduled ✅', scheduledDate.toString());
  const { notifications: pending } = await LocalNotifications.getPending();
  console.log('Pending count:', pending.length);
  console.log('Pending notifications:', JSON.stringify(pending));
}

export function formatRoutineReminderTime(time: string): string {
  if (!time) return '8:00 PM';
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch {
    return time;
  }
}


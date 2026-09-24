// Date helper utilities

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MONTHS_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatTime(date) {
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function formatDateTime(date) {
  return `${formatDate(date)} às ${formatTime(date)}`;
}

export function formatRelative(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 7) return `há ${days}d`;
  return formatDate(date);
}

export function getMonthName(monthIndex) {
  return MONTHS_PT[monthIndex];
}

export function getMonthShortName(monthIndex) {
  return MONTHS_SHORT_PT[monthIndex];
}

export function getDayName(dayIndex) {
  return DAYS_PT[dayIndex];
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function isSameWeek(d1, d2) {
  const w1 = getWeekStart(d1);
  const w2 = getWeekStart(d2);
  return isSameDay(w1, w2);
}

export function isSameMonth(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameYear(d1, d2) {
  return new Date(d1).getFullYear() === new Date(d2).getFullYear();
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  
  const days = [];
  
  // Previous month days
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month,
      year,
      isCurrentMonth: true
    });
  }
  
  // Next month days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    });
  }
  
  return days;
}

// Returns only the days of the given month (no previous/next month bleed).
// Blank cells (null) at the start align day 1 to the correct weekday column (Mon-start).
export function getCalendarDaysCurrentOnly(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-start: Mon=0, Tue=1, ... Sun=6
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days = [];

  // Empty cells for alignment
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }

  // Actual days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month,
      year,
      isCurrentMonth: true
    });
  }

  return days;
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

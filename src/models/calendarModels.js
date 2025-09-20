// Calendar Models for Web App

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Calendar Event
export class CalendarEvent {
  constructor({
    id = generateUUID(),
    title,
    description = '',
    startDate,
    endDate,
    isAllDay = false,
    location = '',
    alertId = null,
    createdBy,
    createdByUserId,
    createdAt = new Date(),
    updatedAt = new Date(),
    isRecurring = false,
    recurrencePattern = null,
    color = '#007AFF'
  }) {
    this.id = id
    this.title = title
    this.description = description
    this.startDate = startDate
    this.endDate = endDate
    this.isAllDay = isAllDay
    this.location = location
    this.alertId = alertId
    this.createdBy = createdBy
    this.createdByUserId = createdByUserId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.isRecurring = isRecurring
    this.recurrencePattern = recurrencePattern
    this.color = color
  }

  get duration() {
    return this.endDate.getTime() - this.startDate.getTime()
  }

  get isPast() {
    return this.endDate < new Date()
  }

  get isToday() {
    const today = new Date()
    return this.startDate.toDateString() === today.toDateString()
  }

  get isUpcoming() {
    return this.startDate > new Date()
  }
}

// Scheduled Alert
export class ScheduledAlert {
  constructor({
    id = generateUUID(),
    title,
    description,
    organizationId,
    organizationName,
    groupId = null,
    groupName = null,
    type,
    severity,
    location = null,
    scheduledDate,
    isRecurring = false,
    recurrencePattern = null,
    postedBy,
    postedByUserId,
    createdAt = new Date(),
    updatedAt = new Date(),
    isActive = true,
    imageURLs = [],
    expiresAt = null,
    calendarEventId = null
  }) {
    this.id = id
    this.title = title
    this.description = description
    this.organizationId = organizationId
    this.organizationName = organizationName
    this.groupId = groupId
    this.groupName = groupName
    this.type = type
    this.severity = severity
    this.location = location
    this.scheduledDate = scheduledDate
    this.isRecurring = isRecurring
    this.recurrencePattern = recurrencePattern
    this.postedBy = postedBy
    this.postedByUserId = postedByUserId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.isActive = isActive
    this.imageURLs = imageURLs
    this.expiresAt = expiresAt
    this.calendarEventId = calendarEventId
  }

  get isPast() {
    return this.scheduledDate < new Date()
  }

  get isToday() {
    const today = new Date()
    return this.scheduledDate.toDateString() === today.toDateString()
  }

  get isUpcoming() {
    return this.scheduledDate > new Date()
  }

  get timeUntilScheduled() {
    return this.scheduledDate.getTime() - new Date().getTime()
  }

  get daysUntilScheduled() {
    const diffTime = this.scheduledDate.getTime() - new Date().getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}

// Recurrence Pattern
export class RecurrencePattern {
  constructor({
    frequency,
    interval = 1,
    endDate = null,
    occurrences = null,
    daysOfWeek = null,
    dayOfMonth = null,
    weekOfMonth = null
  }) {
    this.frequency = frequency
    this.interval = interval
    this.endDate = endDate
    this.occurrences = occurrences
    this.daysOfWeek = daysOfWeek
    this.dayOfMonth = dayOfMonth
    this.weekOfMonth = weekOfMonth
  }

  toDictionary() {
    return {
      frequency: this.frequency,
      interval: this.interval,
      endDate: this.endDate,
      occurrences: this.occurrences,
      daysOfWeek: this.daysOfWeek,
      dayOfMonth: this.dayOfMonth,
      weekOfMonth: this.weekOfMonth
    }
  }

  static fromDictionary(dict) {
    return new RecurrencePattern(dict)
  }
}

// Recurrence Frequency
export const RecurrenceFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
}

export const RecurrenceFrequencyLabels = {
  [RecurrenceFrequency.DAILY]: 'Daily',
  [RecurrenceFrequency.WEEKLY]: 'Weekly',
  [RecurrenceFrequency.MONTHLY]: 'Monthly',
  [RecurrenceFrequency.YEARLY]: 'Yearly'
}

// Calendar View Mode
export const CalendarViewMode = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  AGENDA: 'agenda'
}

export const CalendarViewModeLabels = {
  [CalendarViewMode.MONTH]: 'Month',
  [CalendarViewMode.WEEK]: 'Week',
  [CalendarViewMode.DAY]: 'Day',
  [CalendarViewMode.AGENDA]: 'Agenda'
}

// Calendar Filter
export class CalendarFilter {
  constructor({
    showAlerts = true,
    showEvents = true,
    selectedTypes = new Set(),
    selectedSeverities = new Set(),
    selectedGroups = new Set(),
    dateRange = null
  }) {
    this.showAlerts = showAlerts
    this.showEvents = showEvents
    this.selectedTypes = selectedTypes
    this.selectedSeverities = selectedSeverities
    this.selectedGroups = selectedGroups
    this.dateRange = dateRange
  }

  get isFiltered() {
    return !this.showAlerts || 
           !this.showEvents || 
           this.selectedTypes.size > 0 || 
           this.selectedSeverities.size > 0 || 
           this.selectedGroups.size > 0 || 
           this.dateRange !== null
  }
}

// Calendar Event Colors
export const CalendarEventColors = {
  BLUE: '#007AFF',
  GREEN: '#34C759',
  ORANGE: '#FF9500',
  RED: '#FF3B30',
  PURPLE: '#AF52DE',
  PINK: '#FF2D92',
  TEAL: '#5AC8FA',
  INDIGO: '#5856D6',
  YELLOW: '#FFCC00',
  GRAY: '#8E8E93'
}

export const CalendarEventColorLabels = {
  [CalendarEventColors.BLUE]: 'Blue',
  [CalendarEventColors.GREEN]: 'Green',
  [CalendarEventColors.ORANGE]: 'Orange',
  [CalendarEventColors.RED]: 'Red',
  [CalendarEventColors.PURPLE]: 'Purple',
  [CalendarEventColors.PINK]: 'Pink',
  [CalendarEventColors.TEAL]: 'Teal',
  [CalendarEventColors.INDIGO]: 'Indigo',
  [CalendarEventColors.YELLOW]: 'Yellow',
  [CalendarEventColors.GRAY]: 'Gray'
}

// Incident Types (assuming these exist in your app)
export const IncidentType = {
  EMERGENCY: 'emergency',
  WEATHER: 'weather',
  TRAFFIC: 'traffic',
  CRIME: 'crime',
  FIRE: 'fire',
  MEDICAL: 'medical',
  UTILITY: 'utility',
  OTHER: 'other'
}

export const IncidentTypeLabels = {
  [IncidentType.EMERGENCY]: 'Emergency',
  [IncidentType.WEATHER]: 'Weather',
  [IncidentType.TRAFFIC]: 'Traffic',
  [IncidentType.CRIME]: 'Crime',
  [IncidentType.FIRE]: 'Fire',
  [IncidentType.MEDICAL]: 'Medical',
  [IncidentType.UTILITY]: 'Utility',
  [IncidentType.OTHER]: 'Other'
}

// Incident Severity
export const IncidentSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

export const IncidentSeverityLabels = {
  [IncidentSeverity.LOW]: 'Low',
  [IncidentSeverity.MEDIUM]: 'Medium',
  [IncidentSeverity.HIGH]: 'High',
  [IncidentSeverity.CRITICAL]: 'Critical'
}

export const IncidentSeverityColors = {
  [IncidentSeverity.LOW]: '#34C759',
  [IncidentSeverity.MEDIUM]: '#FF9500',
  [IncidentSeverity.HIGH]: '#FF3B30',
  [IncidentSeverity.CRITICAL]: '#8B0000'
}

import { useState } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { useAuth } from '../../contexts/AuthContext'
import { CalendarEventColors, RecurrenceFrequency, RecurrenceFrequencyLabels } from '../../models/calendarModels'
import { X, Calendar, Clock, MapPin, Palette, RotateCcw } from 'lucide-react'

export default function CreateEventModal({ isOpen, onClose }) {
  const { createEvent } = useCalendar()
  const { currentUser } = useAuth()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    isAllDay: false,
    location: '',
    color: CalendarEventColors.BLUE,
    isRecurring: false,
    recurrenceFrequency: RecurrenceFrequency.WEEKLY,
    recurrenceInterval: 1,
    recurrenceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days later
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.isAllDay 
          ? new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000) // Next day
          : formData.endDate,
        isAllDay: formData.isAllDay,
        location: formData.location,
        color: formData.color,
        createdBy: currentUser?.displayName || currentUser?.email || 'Unknown',
        createdByUserId: currentUser?.uid || 'unknown',
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? {
          frequency: formData.recurrenceFrequency,
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate
        } : null
      }

      await createEvent(eventData)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event description"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              {/* Start Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.startDate.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const newDate = new Date(formData.startDate)
                        const [year, month, day] = e.target.value.split('-')
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                        handleInputChange('startDate', newDate)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.startDate.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const newDate = new Date(formData.startDate)
                        const [hours, minutes] = e.target.value.split(':')
                        newDate.setHours(parseInt(hours), parseInt(minutes))
                        handleInputChange('startDate', newDate)
                      }}
                      disabled={formData.isAllDay}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
              
              {/* End Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.endDate.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const newDate = new Date(formData.endDate)
                        const [year, month, day] = e.target.value.split('-')
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                        handleInputChange('endDate', newDate)
                      }}
                      disabled={formData.isAllDay}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.endDate.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const newDate = new Date(formData.endDate)
                        const [hours, minutes] = e.target.value.split(':')
                        newDate.setHours(parseInt(hours), parseInt(minutes))
                        handleInputChange('endDate', newDate)
                      }}
                      disabled={formData.isAllDay}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => handleInputChange('isAllDay', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isAllDay" className="ml-2 text-sm text-gray-700">
                All Day Event
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event location"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(CalendarEventColors).map(([key, color]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleInputChange('color', color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={key}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
                  Repeat Event
                </label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.recurrenceFrequency}
                      onChange={(e) => handleInputChange('recurrenceFrequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(RecurrenceFrequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Every
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formData.recurrenceInterval}
                      onChange={(e) => handleInputChange('recurrenceInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate.toISOString().slice(0, 10)}
                      onChange={(e) => handleInputChange('recurrenceEndDate', new Date(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { 
  IncidentType, 
  IncidentTypeLabels, 
  IncidentSeverity, 
  IncidentSeverityLabels 
} from '../../models/calendarModels'
import { X, Filter, RotateCcw } from 'lucide-react'

export default function CalendarFilterModal({ isOpen, onClose }) {
  const { filter, setFilter } = useCalendar()
  
  const [localFilter, setLocalFilter] = useState({
    showAlerts: filter.showAlerts,
    showEvents: filter.showEvents,
    selectedTypes: new Set(filter.selectedTypes),
    selectedSeverities: new Set(filter.selectedSeverities),
    selectedGroups: new Set(filter.selectedGroups),
    dateRange: filter.dateRange
  })

  const handleApply = () => {
    setFilter(localFilter)
    onClose()
  }

  const handleReset = () => {
    const resetFilter = {
      showAlerts: true,
      showEvents: true,
      selectedTypes: new Set(),
      selectedSeverities: new Set(),
      selectedGroups: new Set(),
      dateRange: null
    }
    setLocalFilter(resetFilter)
    setFilter(resetFilter)
  }

  const handleTypeToggle = (type) => {
    const newTypes = new Set(localFilter.selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setLocalFilter(prev => ({ ...prev, selectedTypes: newTypes }))
  }

  const handleSeverityToggle = (severity) => {
    const newSeverities = new Set(localFilter.selectedSeverities)
    if (newSeverities.has(severity)) {
      newSeverities.delete(severity)
    } else {
      newSeverities.add(severity)
    }
    setLocalFilter(prev => ({ ...prev, selectedSeverities: newSeverities }))
  }

  const handleDateRangeChange = (field, value) => {
    const newDateRange = { ...localFilter.dateRange }
    if (field === 'start') {
      newDateRange.start = value ? new Date(value) : null
    } else {
      newDateRange.end = value ? new Date(value) : null
    }
    
    if (newDateRange.start && newDateRange.end) {
      setLocalFilter(prev => ({ ...prev, dateRange: newDateRange }))
    } else if (!newDateRange.start && !newDateRange.end) {
      setLocalFilter(prev => ({ ...prev, dateRange: null }))
    }
  }

  const isFiltered = localFilter.showAlerts !== true || 
                    localFilter.showEvents !== true || 
                    localFilter.selectedTypes.size > 0 || 
                    localFilter.selectedSeverities.size > 0 || 
                    localFilter.selectedGroups.size > 0 || 
                    localFilter.dateRange !== null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Filter className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Filter Calendar</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Content Types */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Content Types</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilter.showEvents}
                    onChange={(e) => setLocalFilter(prev => ({ ...prev, showEvents: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Events</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localFilter.showAlerts}
                    onChange={(e) => setLocalFilter(prev => ({ ...prev, showAlerts: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Alerts</span>
                </label>
              </div>
            </div>

            {/* Alert Types */}
            {localFilter.showAlerts && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Alert Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(IncidentTypeLabels).map(([value, label]) => (
                    <label key={value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilter.selectedTypes.has(value)}
                        onChange={() => handleTypeToggle(value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Severities */}
            {localFilter.showAlerts && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Alert Severities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(IncidentSeverityLabels).map(([value, label]) => (
                    <label key={value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilter.selectedSeverities.has(value)}
                        onChange={() => handleSeverityToggle(value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={localFilter.dateRange?.start ? localFilter.dateRange.start.toISOString().slice(0, 10) : ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={localFilter.dateRange?.end ? localFilter.dateRange.end.toISOString().slice(0, 10) : ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {localFilter.dateRange && (
                <button
                  type="button"
                  onClick={() => setLocalFilter(prev => ({ ...prev, dateRange: null }))}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Clear Date Range
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { collection, addDoc, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../services/firebase'
import { UserPlus, Plus, Users, MapPin, Phone, Mail, Settings, Eye, Edit, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Groups() {
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState('')
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    organizationId: '',
    isPublic: true,
    maxMembers: 50,
    category: '',
    location: '',
    contactEmail: '',
    contactPhone: ''
  })

  useEffect(() => {
    fetchGroups()
  }, [currentUser, organizations])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      
      if (!currentUser || !userProfile?.organizationId) {
        setGroups([])
        return
      }

      // Get groups for the user's organization
      const groupsQuery = query(
        collection(db, 'organizations', userProfile.organizationId, 'groups'),
        orderBy('createdAt', 'desc')
      )
      
      const groupsSnapshot = await getDocs(groupsQuery)
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setGroups(groupsData)
      console.log('✅ Loaded', groupsData.length, 'groups')
    } catch (error) {
      console.error('❌ Error fetching groups:', error)
      toast.error('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitGroup = async (e) => {
    e.preventDefault()
    
    if (!groupForm.name.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!groupForm.organizationId) {
      toast.error('Please select an organization')
      return
    }

    try {
      // Sanitize group name for use as document ID
      const sanitizedGroupName = groupForm.name
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase()

      const groupData = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        organizationId: groupForm.organizationId,
        isPublic: groupForm.isPublic,
        maxMembers: parseInt(groupForm.maxMembers) || 50,
        category: groupForm.category.trim(),
        location: groupForm.location.trim(),
        contactEmail: groupForm.contactEmail.trim(),
        contactPhone: groupForm.contactPhone.trim(),
        createdBy: currentUser.uid,
        createdByName: userProfile?.displayName || currentUser.displayName || 'Unknown',
        memberCount: 1,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Create group with sanitized name as document ID
      const groupDocRef = doc(db, 'organizations', groupForm.organizationId, 'groups', sanitizedGroupName)
      await setDoc(groupDocRef, groupData)
      
      console.log('✅ Group created:', sanitizedGroupName)
      toast.success('Group created successfully!')
      
      // Reset form and close modal
      setGroupForm({
        name: '',
        description: '',
        organizationId: '',
        isPublic: true,
        maxMembers: 50,
        category: '',
        location: '',
        contactEmail: '',
        contactPhone: ''
      })
      setShowAddGroupModal(false)
      
      // Refresh groups list
      fetchGroups()
      
    } catch (error) {
      console.error('❌ Error creating group:', error)
      toast.error('Failed to create group')
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesOrganization = !selectedOrganization || group.organizationId === selectedOrganization
    
    return matchesSearch && matchesOrganization
  })

  const getOrganizationName = (organizationId) => {
    const org = organizations.find(o => o.id === organizationId)
    return org?.name || 'Unknown Organization'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and join groups within your organizations
          </p>
        </div>
        <button
          onClick={() => setShowAddGroupModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Group</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
        <select
          value={selectedOrganization}
          onChange={(e) => setSelectedOrganization(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedOrganization 
              ? 'No groups match your search criteria'
              : 'Get started by creating your first group'
            }
          </p>
          {!searchTerm && !selectedOrganization && (
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="btn-primary"
            >
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredGroups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{group.description || 'No description'}</p>
                  
                  <div className="mt-4 space-y-2">
                    {group.category && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium">Category:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {group.category}
                        </span>
                      </div>
                    )}
                    
                    {group.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{group.location}</span>
                      </div>
                    )}
                    
                    {group.contactEmail && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>{group.contactEmail}</span>
                      </div>
                    )}
                    
                    {group.contactPhone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{group.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {group.memberCount || 0} members
                      </span>
                      <span className="text-xs">
                        Max: {group.maxMembers || 50}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.isPublic 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {getOrganizationName(group.organizationId)}
                </div>
                
                <div className="flex space-x-2">
                  <button className="btn-secondary text-sm px-3 py-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </button>
                  {group.createdBy === currentUser.uid && (
                    <>
                      <button className="btn-secondary text-sm px-3 py-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button className="btn-secondary text-sm px-3 py-1 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowAddGroupModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Create New Group</h3>
              </div>
              
              <form onSubmit={handleSubmitGroup} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization *
                  </label>
                  <select
                    value={groupForm.organizationId}
                    onChange={(e) => setGroupForm({ ...groupForm, organizationId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                    placeholder="Describe the group's purpose"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={groupForm.category}
                      onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="e.g., Sports, Study, Work"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Members
                    </label>
                    <input
                      type="number"
                      value={groupForm.maxMembers}
                      onChange={(e) => setGroupForm({ ...groupForm, maxMembers: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={groupForm.location}
                    onChange={(e) => setGroupForm({ ...groupForm, location: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Where does this group meet?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={groupForm.contactEmail}
                      onChange={(e) => setGroupForm({ ...groupForm, contactEmail: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="group@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={groupForm.contactPhone}
                      onChange={(e) => setGroupForm({ ...groupForm, contactPhone: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={groupForm.isPublic}
                    onChange={(e) => setGroupForm({ ...groupForm, isPublic: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                    Make this group public (visible to all organization members)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddGroupModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

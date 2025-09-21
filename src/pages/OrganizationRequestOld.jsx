import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { Building, MapPin, Phone, Mail, Users, Plus, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrganizationRequest() {
  const { currentUser, userProfile } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({
    organizationName: '',
    organizationType: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    officeEmail: '',
    contactEmail: '', // Admin contact email
    website: '',
    requestType: 'create', // 'create' for new organizations
    // Admin setup fields
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: ''
  })
  const [userRequests, setUserRequests] = useState([])

  useEffect(() => {
    fetchOrganizations()
    fetchUserRequests()
  }, [currentUser])

  const fetchOrganizations = async () => {
    try {
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      const orgsData = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRequests = async () => {
    if (!currentUser) return
    
    try {
      const requestsQuery = query(
        collection(db, 'organizationRequests'),
        where('userId', '==', currentUser.uid)
      )
      const requestsSnapshot = await getDocs(requestsQuery)
      
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setUserRequests(requestsData)
    } catch (error) {
      console.error('Error fetching user requests:', error)
    }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!requestForm.organizationName.trim()) {
      toast.error('Organization name is required')
      return
    }
    
    if (!requestForm.adminFirstName.trim()) {
      toast.error('Admin first name is required')
      return
    }
    
    if (!requestForm.adminLastName.trim()) {
      toast.error('Admin last name is required')
      return
    }
    
    if (!requestForm.adminEmail.trim()) {
      toast.error('Admin email is required')
      return
    }
    
    if (!requestForm.adminPassword.trim()) {
      toast.error('Admin password is required')
      return
    }
    
    if (requestForm.adminPassword !== requestForm.adminConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (requestForm.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const requestData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userDisplayName: userProfile?.displayName || currentUser.displayName || '',
        // Organization details
        organizationName: requestForm.organizationName.trim(),
        organizationType: requestForm.organizationType.trim(),
        description: requestForm.description.trim(),
        address: requestForm.address.trim(),
        city: requestForm.city.trim(),
        state: requestForm.state.trim(),
        zipCode: requestForm.zipCode.trim(),
        phone: requestForm.phone.trim(),
        officeEmail: requestForm.officeEmail.trim(),
        website: requestForm.website.trim(),
        // Admin details
        adminFirstName: requestForm.adminFirstName.trim(),
        adminLastName: requestForm.adminLastName.trim(),
        adminEmail: requestForm.adminEmail.trim(),
        adminPassword: requestForm.adminPassword, // Note: In production, this should be hashed
        contactEmail: requestForm.contactEmail.trim(),
        requestType: requestForm.requestType,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await addDoc(collection(db, 'organizationRequests'), requestData)
      
      toast.success('Organization request submitted successfully!')
      setRequestForm({
        organizationName: '',
        organizationType: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        officeEmail: '',
        contactEmail: '',
        website: '',
        requestType: 'create',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
        adminConfirmPassword: ''
      })
      setShowRequestForm(false)
      
      // Refresh user requests
      fetchUserRequests()
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />
      case 'pending':
        return <div className="h-4 w-4 rounded-full bg-yellow-600 animate-pulse" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-600" />
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request access to existing organizations or create new ones
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </button>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Submit Organization Request</h3>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Type
                    </label>
                    <select
                      value={requestForm.requestType}
                      onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="join">Join Existing Organization</option>
                      <option value="create">Create New Organization</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestForm.organizationName}
                      onChange={(e) => setRequestForm({ ...requestForm, organizationName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter organization name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe the organization or your request"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={requestForm.address}
                      onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Street address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={requestForm.city}
                      onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={requestForm.state}
                      onChange={(e) => setRequestForm({ ...requestForm, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="State"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={requestForm.zipCode}
                      onChange={(e) => setRequestForm({ ...requestForm, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="ZIP Code"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={requestForm.contact}
                      onChange={(e) => setRequestForm({ ...requestForm, contact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={requestForm.email}
                      onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Email address"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    value={requestForm.website}
                    onChange={(e) => setRequestForm({ ...requestForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User's Requests */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Requests</h2>
        
        {userRequests.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No requests submitted yet</p>
            <p className="text-sm text-gray-400 mt-1">Submit your first organization request above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userRequests.map((request) => (
              <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.organizationName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {request.description || 'No description provided'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      {request.address && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {[request.address, request.city, request.state, request.zipCode].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {request.contact && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {request.contact}
                        </div>
                      )}
                      {request.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {request.email}
                        </div>
                      )}
                      {request.website && (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          <a href={request.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">
                            {request.website}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-400">
                      Submitted: {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Organizations */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Organizations</h2>
        
        {organizations.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No organizations available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{org.name}</h3>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {org.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {org.memberCount > 0 && (
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {org.memberCount} members
                        </span>
                      )}
                      {org.followerCount > 0 && (
                        <span>{org.followerCount} followers</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setRequestForm({
                        ...requestForm,
                        organizationName: org.name,
                        requestType: 'join'
                      })
                      setShowRequestForm(true)
                    }}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Request Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { Building, MapPin, Phone, Mail, Users, Plus, CheckCircle, X, User, Lock } from 'lucide-react'
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
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <X className="h-4 w-4" />
      case 'pending':
        return <div className="h-4 w-4 rounded-full bg-yellow-600" />
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
            Request to create a new organization with admin account setup
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
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900">Create Organization Request</h3>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                {/* Organization Information */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                    Organization Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Type
                      </label>
                      <select
                        value={requestForm.organizationType}
                        onChange={(e) => setRequestForm({ ...requestForm, organizationType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select type</option>
                        <option value="business">Business</option>
                        <option value="nonprofit">Non-profit</option>
                        <option value="government">Government</option>
                        <option value="education">Education</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe the organization's purpose and activities"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={requestForm.phone}
                        onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Office Email
                      </label>
                      <input
                        type="email"
                        value={requestForm.officeEmail}
                        onChange={(e) => setRequestForm({ ...requestForm, officeEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="office@organization.com"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={requestForm.website}
                      onChange={(e) => setRequestForm({ ...requestForm, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Admin Setup */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-600" />
                    Admin Account Setup
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create the administrator account for this organization. This person will have full access to manage the organization.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={requestForm.adminFirstName}
                        onChange={(e) => setRequestForm({ ...requestForm, adminFirstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Admin first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={requestForm.adminLastName}
                        onChange={(e) => setRequestForm({ ...requestForm, adminLastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Admin last name"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={requestForm.adminEmail}
                      onChange={(e) => setRequestForm({ ...requestForm, adminEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="admin@organization.com"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={requestForm.adminPassword}
                        onChange={(e) => setRequestForm({ ...requestForm, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Create password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={requestForm.adminConfirmPassword}
                        onChange={(e) => setRequestForm({ ...requestForm, adminConfirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={requestForm.contactEmail}
                      onChange={(e) => setRequestForm({ ...requestForm, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Additional contact email (optional)"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
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
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Admin:</strong> {request.adminFirstName} {request.adminLastName}</p>
                      <p><strong>Admin Email:</strong> {request.adminEmail}</p>
                      <p><strong>Organization Type:</strong> {request.organizationType || 'Not specified'}</p>
                      {request.description && (
                        <p><strong>Description:</strong> {request.description}</p>
                      )}
                      {request.address && (
                        <p><strong>Address:</strong> {request.address}, {request.city}, {request.state} {request.zipCode}</p>
                      )}
                      {request.phone && (
                        <p><strong>Phone:</strong> {request.phone}</p>
                      )}
                      {request.officeEmail && (
                        <p><strong>Office Email:</strong> {request.officeEmail}</p>
                      )}
                      {request.website && (
                        <p><strong>Website:</strong> {request.website}</p>
                      )}
                      <p><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

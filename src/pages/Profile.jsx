import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { User, Mail, Calendar, Shield, Edit, Save, X, Crown, Building, Lock, LogOut, TestTube, CheckCircle, Clock, AlertCircle, CreditCard, UserCog, Bell, Download, Activity, Zap, Settings, Users, FileText, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db, auth } from '../services/firebase'
import adminService from '../services/adminService'
import SpecialAccessManager from '../components/SpecialAccessManager'
import AdminManagementModal from '../components/AdminManagementModal'

export default function Profile() {
  const { userProfile, currentUser, loading } = useAuth()
  const { organizations, loading: orgsLoading } = useOrganizations()
  const { subscription, usageStats, loading: subscriptionLoading } = useSubscription()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    email: ''
  })
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [adminOrganizations, setAdminOrganizations] = useState([])
  const [organizationRequests, setOrganizationRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [selectedAdminOrg, setSelectedAdminOrg] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showSpecialAccessModal, setShowSpecialAccessModal] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    // Push notifications
    pushEnabled: true,
    pushAlerts: true,
    pushAdminUpdates: true,
    pushGroupUpdates: true,
    
    // Email notifications
    emailEnabled: true,
    emailAlerts: true,
    emailAdminUpdates: true,
    emailGroupUpdates: false,
    
    // Quiet hours
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '08:00',
    quietDays: ['Saturday', 'Sunday'],
    
    // Alert types
    emergencyAlerts: true,
    warningAlerts: true,
    infoAlerts: false,
    scheduledAlerts: true,
    
    // Organization-specific settings
    orgSettings: {}
  })
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [grantingAccess, setGrantingAccess] = useState(false)


  // Function to update user's isOrganizationAdmin status in Firestore
  const updateUserOrgAdminStatus = async (isAdmin) => {
    try {
      if (!currentUser?.uid) return
      
      const userRef = doc(db, 'users', currentUser.uid)
      const updateData = {
        isOrganizationAdmin: isAdmin,
        updatedAt: serverTimestamp()
      }
      
      // If user is becoming an admin, also store organization info
      if (isAdmin && adminOrganizations.length > 0) {
        const primaryOrg = adminOrganizations[0] // Use first admin organization
        updateData.organizationId = primaryOrg.id
        updateData.organizationName = primaryOrg.name
        console.log('🔍 Profile: Storing organization info:', {
          organizationId: primaryOrg.id,
          organizationName: primaryOrg.name
        })
      }
      
      await updateDoc(userRef, updateData)
      console.log('✅ Profile: Updated user admin status and organization info')
      
    } catch (error) {
      console.error('❌ Error updating isOrganizationAdmin status:', error)
    }
  }


  // Function to open admin management modal
  const openAdminModal = (org) => {
    setSelectedAdminOrg(org)
    setShowAdminModal(true)
  }

  // Load notification settings from Firestore
  const loadNotificationSettings = async () => {
    try {
      if (!currentUser?.uid) return
      
      const userRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const settings = userData.notificationSettings || {}
        
        setNotificationSettings(prev => ({
          ...prev,
          ...settings
        }))
        
        console.log('✅ Loaded notification settings:', settings)
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error)
    }
  }

  // Save notification settings to Firestore
  const saveNotificationSettings = async () => {
    try {
      setNotificationLoading(true)
      
      if (!currentUser?.uid) {
        toast.error('User not authenticated')
        return
      }
      
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        notificationSettings: notificationSettings,
        updatedAt: serverTimestamp()
      })
      
      toast.success('Notification preferences saved!')
      console.log('✅ Saved notification settings:', notificationSettings)
      
    } catch (error) {
      console.error('❌ Error saving notification settings:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setNotificationLoading(false)
    }
  }

  // Update notification setting
  const updateNotificationSetting = (key, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Update organization-specific setting
  const updateOrgSetting = (orgId, key, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      orgSettings: {
        ...prev.orgSettings,
        [orgId]: {
          ...prev.orgSettings[orgId],
          [key]: value
        }
      }
    }))
  }

  // Function to change password
  const changePassword = async () => {
    try {
      setPasswordLoading(true)
      
      // Validate form
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('Please fill in all fields')
        return
      }
      
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match')
        return
      }
      
      if (passwordForm.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters long')
        return
      }
      
      if (passwordForm.currentPassword === passwordForm.newPassword) {
        toast.error('New password must be different from current password')
        return
      }
      
      console.log('🔐 Changing password for user:', currentUser?.email)
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordForm.currentPassword
      )
      
      await reauthenticateWithCredential(currentUser, credential)
      console.log('✅ User re-authenticated successfully')
      
      // Update password in Firebase Auth
      await updatePassword(currentUser, passwordForm.newPassword)
      console.log('✅ Password updated in Firebase Auth')
      
      // Update password in Firestore user document
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        passwordUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      console.log('✅ Password update timestamp saved to Firestore')
      
      // Reset form and close modal
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordModal(false)
      
      toast.success('Password changed successfully!')
      console.log('✅ Password change completed successfully')
      
    } catch (error) {
      console.error('❌ Error changing password:', error)
      
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect')
      } else if (error.code === 'auth/weak-password') {
        toast.error('New password is too weak')
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in before changing your password')
      } else {
        toast.error('Failed to change password: ' + error.message)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  // Debug function to check organizations
  const debugOrganizations = async () => {
    try {
      console.log('🔍 Debug: Checking organizations...')
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      console.log('🔍 Debug: Found', orgsSnapshot.size, 'organizations')
      
      for (const doc of orgsSnapshot.docs) {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        const adminRoles = orgData.adminRoles || {}
        
        console.log(`🔍 Organization: ${orgData.name} (${doc.id})`)
        console.log(`   - adminIds:`, adminIds)
        console.log(`   - adminIds keys:`, Object.keys(adminIds))
        console.log(`   - adminRoles:`, adminRoles)
        console.log(`   - Current user UID: ${currentUser?.uid}`)
        console.log(`   - Is current user admin: ${adminIds[currentUser?.uid] === true}`)
        
        if (currentUser?.uid && adminIds[currentUser.uid] === true) {
          const userRole = adminRoles[currentUser.uid] || 'admin'
          const canManageAdmins = userRole === 'organization_admin' || userRole === 'org_admin'
          console.log(`   - User role: ${userRole}`)
          console.log(`   - Can manage admins: ${canManageAdmins}`)
          console.log(`   ✅ USER IS ADMIN - SHOULD SHOW MANAGE BUTTON`)
        }
        console.log('---')
      }
    } catch (error) {
      console.error('❌ Debug error:', error)
    }
  }

  // Function to load admin organizations directly from Firestore
  const loadAdminOrganizationsFromFirestore = async () => {
    try {
      console.log('🔍 Loading admin organizations directly from Firestore...')
      console.log('🔍 Current user UID:', currentUser?.uid)
      
      // Check if user is platform admin first - Only Jed (Platform Creator)
      const platformAdminUIDs = ['z4a9tShrtmT5W88euqy92ihQiNB3']
      const isPlatformAdminUser = platformAdminUIDs.includes(currentUser?.uid)
      
      if (isPlatformAdminUser) {
        console.log('🔧 Platform Creator detected - loading all organizations for management')
        
        const orgsQuery = query(collection(db, 'organizations'))
        const orgsSnapshot = await getDocs(orgsQuery)
        
        const adminOrgs = []
        
        for (const doc of orgsSnapshot.docs) {
          const orgData = doc.data()
          
          // Platform creator has management access to ALL organizations
          const adminOrg = {
            id: doc.id,
            userRole: 'platform_creator',
            canManageAdmins: true,
            platformAdmin: true,
            platformCreator: true,
            ...orgData
          }
          
          adminOrgs.push(adminOrg)
          console.log(`✅ Platform creator management access to: ${orgData.name}`)
        }
        
        console.log(`\n🔍 FINAL RESULT (Platform Creator):`)
        console.log(`   Total organizations: ${adminOrgs.length}`)
        console.log(`   Admin organizations:`, adminOrgs)
        
        setAdminOrganizations(adminOrgs)
        setIsOrgAdmin(false) // Platform creator is NOT an org admin, but has platform access
        return adminOrgs
      } else {
        // Regular user logic
        const orgsQuery = query(collection(db, 'organizations'))
        const orgsSnapshot = await getDocs(orgsQuery)
        
        console.log(`🔍 Found ${orgsSnapshot.size} organizations in Firestore`)
        
        const adminOrgs = []
        
        for (const doc of orgsSnapshot.docs) {
          const orgData = doc.data()
          const adminIds = orgData.adminIds || {}
          const adminRoles = orgData.adminRoles || {}
          
          console.log(`\n🏢 Checking organization: ${orgData.name} (${doc.id})`)
          console.log(`   Admin IDs:`, adminIds)
          console.log(`   Admin Roles:`, adminRoles)
          console.log(`   Current user UID: ${currentUser?.uid}`)
          console.log(`   Is user in adminIds: ${adminIds[currentUser?.uid] === true}`)
          
          if (currentUser?.uid && adminIds[currentUser.uid] === true) {
            const userRole = adminRoles[currentUser.uid] || 'admin'
            const canManageAdmins = userRole === 'organization_admin' || userRole === 'org_admin'
            
            console.log(`   ✅ User is admin of this organization!`)
            console.log(`   User role: ${userRole}`)
            console.log(`   Can manage admins: ${canManageAdmins}`)
            
            const adminOrg = {
              id: doc.id,
              userRole: userRole,
              canManageAdmins: canManageAdmins,
              ...orgData
            }
            
            adminOrgs.push(adminOrg)
            
            console.log(`✅ Added admin organization:`, adminOrg)
          } else {
            console.log(`   ❌ User is not admin of this organization`)
          }
        }
        
        console.log(`\n🔍 FINAL RESULT:`)
        console.log(`   Total admin organizations found: ${adminOrgs.length}`)
        console.log(`   Admin organizations:`, adminOrgs)
        
        setAdminOrganizations(adminOrgs)
        setIsOrgAdmin(adminOrgs.length > 0)
        
        console.log(`🔍 State updated - isOrgAdmin: ${adminOrgs.length > 0}`)
        return adminOrgs
      }
    } catch (error) {
      console.error('❌ Error loading admin organizations from Firestore:', error)
      return []
    }
  }

  // Function to update user role to org_admin
  const updateUserRoleToOrgAdmin = async () => {
    try {
      console.log('🔧 Updating user role to org_admin...')
      
      // Find the organization where user is admin
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      for (const doc of orgsSnapshot.docs) {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        
        if (currentUser?.uid && adminIds[currentUser.uid] === true) {
          console.log(`🔧 Updating role for organization: ${orgData.name}`)
          console.log(`🔧 Current adminIds:`, adminIds)
          console.log(`🔧 Current adminRoles:`, orgData.adminRoles || {})
          
          // Update the adminRoles field
          const orgRef = doc(db, 'organizations', doc.id)
          await updateDoc(orgRef, {
            [`adminRoles.${currentUser.uid}`]: 'organization_admin',
            updatedAt: serverTimestamp()
          })
          
          console.log(`✅ Updated role to org_admin for organization: ${orgData.name}`)
          toast.success(`Updated role to org_admin for ${orgData.name}`)
          
          // Reload admin organizations
          await loadAdminOrganizationsFromFirestore()
          break
        }
      }
    } catch (error) {
      console.error('❌ Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  // Function to check and fix organization data
  const checkAndFixOrgData = async () => {
    try {
      console.log('🔍 Checking organization data...')
      
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      for (const doc of orgsSnapshot.docs) {
        const orgData = doc.data()
        const adminIds = orgData.adminIds || {}
        const adminRoles = orgData.adminRoles || {}
        
        console.log(`\n🏢 Organization: ${orgData.name} (${doc.id})`)
        console.log(`   Admin IDs:`, adminIds)
        console.log(`   Admin Roles:`, adminRoles)
        
        if (currentUser?.uid && adminIds[currentUser.uid] === true) {
          console.log(`   ✅ User ${currentUser.uid} is in adminIds`)
          
          const currentRole = adminRoles[currentUser.uid] || 'admin'
          console.log(`   Current role: ${currentRole}`)
          
          if (currentRole !== 'organization_admin') {
            console.log(`   🔧 Need to update role from ${currentRole} to organization_admin`)
            
            // Update the role
            const orgRef = doc(db, 'organizations', doc.id)
            await updateDoc(orgRef, {
              [`adminRoles.${currentUser.uid}`]: 'organization_admin',
              updatedAt: serverTimestamp()
            })
            
            console.log(`   ✅ Updated role to organization_admin`)
            toast.success(`Fixed role for ${orgData.name}`)
          } else {
            console.log(`   ✅ Role is already organization_admin`)
          }
        } else {
          console.log(`   ❌ User ${currentUser?.uid} not found in adminIds`)
        }
      }
      
      // Reload admin organizations
      await loadAdminOrganizationsFromFirestore()
      
    } catch (error) {
      console.error('❌ Error checking organization data:', error)
      toast.error('Failed to check organization data')
    }
  }

  // Function to fix admin status mismatch
  const fixAdminStatusMismatch = async () => {
    try {
      console.log('🔧 Fixing admin status mismatch...')
      console.log('🔧 User profile isOrganizationAdmin:', userProfile?.isOrganizationAdmin)
      console.log('🔧 User profile organizationId:', userProfile?.organizationId)
      console.log('🔧 User profile organizationName:', userProfile?.organizationName)
      
      if (!userProfile?.isOrganizationAdmin) {
        console.log('❌ User profile does not indicate organization admin status')
        return
      }
      
      // If user has organizationId in profile, add them to that organization
      if (userProfile.organizationId) {
        console.log('🔧 Adding user to organization based on profile data...')
        
        const orgRef = doc(db, 'organizations', userProfile.organizationId)
        const orgDoc = await getDoc(orgRef)
        
        if (orgDoc.exists()) {
          const orgData = orgDoc.data()
          const adminIds = orgData.adminIds || {}
          const adminRoles = orgData.adminRoles || {}
          
          // Add user to adminIds if not already there
          if (!adminIds[currentUser.uid]) {
            adminIds[currentUser.uid] = true
            adminRoles[currentUser.uid] = 'organization_admin'
            
            await updateDoc(orgRef, {
              adminIds: adminIds,
              adminRoles: adminRoles,
              updatedAt: serverTimestamp()
            })
            
            console.log('✅ Added user to organization admin list')
            toast.success(`Added you as admin to ${orgData.name}`)
          } else {
            console.log('✅ User already in organization admin list')
          }
        } else {
          console.log('❌ Organization not found:', userProfile.organizationId)
        }
      } else {
        console.log('❌ No organizationId in user profile')
      }
      
      // Reload admin organizations
      await loadAdminOrganizationsFromFirestore()
      
    } catch (error) {
      console.error('❌ Error fixing admin status mismatch:', error)
      toast.error('Failed to fix admin status mismatch')
    }
  }

  // Check if user is platform admin (app owner)
  const checkPlatformAdminStatus = async () => {
    // You can set this based on your email or user ID
    const platformAdminEmails = ['jed@onetrack-consulting.com']
    const platformAdminUIDs = ['z4a9tShrtmT5W88euqy92ihQiNB3']
    
    const isAdmin = (currentUser?.email && platformAdminEmails.includes(currentUser.email)) ||
                   (currentUser?.uid && platformAdminUIDs.includes(currentUser.uid))
    setIsPlatformAdmin(isAdmin)
    
    console.log('🔧 Platform admin check:', { 
      isAdmin, 
      email: currentUser?.email, 
      uid: currentUser?.uid,
      userProfileIsOrgAdmin: userProfile?.isOrganizationAdmin 
    })
    
    // If platform admin, ensure they have organization admin status
    if (isAdmin && userProfile && !userProfile.isOrganizationAdmin) {
      console.log('🔧 Platform admin detected - ensuring organization admin status')
      // Automatically grant organization admin status to platform admin
      await grantPlatformAdminOrgAccess()
    }
    
    return isAdmin
  }

  // Grant platform admin access to all organizations
  const grantPlatformAdminOrgAccess = async () => {
    if (!currentUser?.uid) return
    
    // Prevent multiple simultaneous calls
    if (grantingAccess) {
      console.log('⚠️ Already granting access, please wait...')
      return
    }
    
    try {
      setGrantingAccess(true)
      console.log('🔧 Granting platform admin access to all organizations...')
      
      // Update user profile to be organization admin
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        isOrganizationAdmin: true,
        platformAdmin: true,
        updatedAt: serverTimestamp()
      })
      
      // Get all organizations and add platform admin to each
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data()
        const orgId = orgDoc.id
        
        // Add platform admin to organization's admin list
        const adminIds = orgData.adminIds || {}
        const adminRoles = orgData.adminRoles || {}
        
        if (!adminIds[currentUser.uid]) {
          adminIds[currentUser.uid] = true
          adminRoles[currentUser.uid] = 'organization_admin'
          
          await updateDoc(orgDoc.ref, {
            adminIds,
            adminRoles,
            updatedAt: serverTimestamp()
          })
          
          // console.log(`✅ Added platform admin to organization: ${orgData.name}`)
        }
      }
      
      console.log('✅ Platform admin access granted to all organizations')
      // toast.success('Platform admin access granted!')
      
      // Reload admin organizations
      loadAdminOrganizationsFromFirestore()
      
    } catch (error) {
      console.error('❌ Error granting platform admin access:', error)
      toast.error('Failed to grant platform admin access')
    } finally {
      setGrantingAccess(false)
    }
  }

  // Fetch all organization requests for platform admin
  const fetchOrganizationRequests = async () => {
    if (!isPlatformAdmin) return
    
    setRequestsLoading(true)
    try {
      const requestsQuery = query(
        collection(db, 'organizationRequests'),
        orderBy('createdAt', 'desc')
      )
      const requestsSnapshot = await getDocs(requestsQuery)
      
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setOrganizationRequests(requestsData)
    } catch (error) {
      console.error('Error fetching organization requests:', error)
      toast.error('Failed to load organization requests')
    } finally {
      setRequestsLoading(false)
    }
  }

  // Approve organization request
  const approveRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'organizationRequests', requestId)
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp()
      })
      
      toast.success('Request approved successfully!')
      fetchOrganizationRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request')
    }
  }

  // Reject organization request
  const rejectRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'organizationRequests', requestId)
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        rejectedAt: serverTimestamp()
      })
      
      toast.success('Request rejected')
      fetchOrganizationRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    }
  }

  // Function to determine user's role and admin status
  const determineUserRole = async () => {
    try {
      if (!currentUser) {
        console.log('🔍 Profile: No current user, skipping admin check')
        return
      }
      
      console.log('🔍 Profile: Determining user role...')
      console.log('🔍 Profile: Admin service current user:', adminService.currentUser?.uid)
      console.log('🔍 Profile: Current user:', currentUser.uid)
      console.log('🔍 Profile: UserProfile:', userProfile)
      
      // Force sync admin service with current user
      adminService.setCurrentUser(currentUser)
      
      console.log('🔍 Profile: Checking admin status via admin service...')
      
      // Load admin organizations directly from Firestore
      const adminOrgs = await loadAdminOrganizationsFromFirestore()
      const hasOrgAdminAccess = adminOrgs.length > 0
      console.log('🔍 Profile: Admin check result:', hasOrgAdminAccess)
      
      // Check for admin status mismatch and fix automatically
      if (!hasOrgAdminAccess && userProfile?.isOrganizationAdmin) {
        console.log('🔧 Profile: Detected admin status mismatch - fixing automatically...')
        await fixAdminStatusMismatch()
        
        // Reload admin organizations after fix
        const fixedAdminOrgs = await loadAdminOrganizationsFromFirestore()
        const fixedHasOrgAdminAccess = fixedAdminOrgs.length > 0
        
        setIsOrgAdmin(fixedHasOrgAdminAccess)
        setAdminOrganizations(fixedAdminOrgs)
        
        console.log('🔧 Profile: Admin status fixed automatically:', {
          hasOrgAdminAccess: fixedHasOrgAdminAccess,
          adminOrgsCount: fixedAdminOrgs.length,
          adminOrgs: fixedAdminOrgs.map(org => org.name)
        })
      } else {
        setIsOrgAdmin(hasOrgAdminAccess)
        setAdminOrganizations(adminOrgs)
      }
      
      console.log('🔍 Profile: Admin status determined:', {
        hasOrgAdminAccess,
        adminOrgsCount: adminOrgs.length,
        adminOrgs: adminOrgs.map(org => org.name)
      })
      
      console.log('🔍 Profile: Final state after update:', {
        isOrgAdmin: hasOrgAdminAccess,
        adminOrganizations: adminOrgs.length
      })
      
    } catch (error) {
      console.error('❌ Error determining user role:', error)
    }
  }

  // Automatically update form data when userProfile changes
  useEffect(() => {
    if (userProfile) {
      // Try to get display name from multiple sources, prioritizing creatorName
      let displayName = ''
      if (userProfile.creatorName && userProfile.creatorName.trim()) {
        displayName = userProfile.creatorName.trim()
      } else if (userProfile.displayName && userProfile.displayName.trim()) {
        displayName = userProfile.displayName.trim()
      } else if (userProfile.name && userProfile.name.trim()) {
        displayName = userProfile.name.trim()
      } else if (currentUser?.displayName && currentUser.displayName.trim()) {
        displayName = currentUser.displayName.trim()
      }
      
      setFormData({
        displayName: displayName,
        email: currentUser?.email || userProfile.email || ''
      })
    }
  }, [userProfile, currentUser])

  // Wait for everything to be loaded before determining role
  useEffect(() => {
    if (!loading && currentUser && userProfile) {
      // Force sync admin service with current user
      if (typeof currentUser === 'string') {
        console.log('⚠️ WARNING: currentUser is string in Profile, skipping admin service sync')
        return
      }
      
      console.log('🔧 Profile: Syncing admin service with current user:', currentUser.uid)
      adminService.setCurrentUser(currentUser)
      
      // Check platform admin status
      checkPlatformAdminStatus()
      
      // Automatically determine user role and fix any mismatches
      determineUserRole()
      
      // Load notification settings
      loadNotificationSettings()
    }
  }, [loading, currentUser, userProfile])

  // Platform admin organization access check
  useEffect(() => {
    const handlePlatformAdminAccess = async () => {
      if (!currentUser?.uid || !userProfile) return
      
      const platformAdminUIDs = ['z4a9tShrtmT5W88euqy92ihQiNB3']
      const isPlatformAdmin = platformAdminUIDs.includes(currentUser.uid)
      
      console.log('🔧 Platform admin access check:', {
        isPlatformAdmin,
        userProfileIsOrgAdmin: userProfile.isOrganizationAdmin,
        adminOrganizationsLength: adminOrganizations.length
      })
      
      if (isPlatformAdmin && userProfile.isOrganizationAdmin && adminOrganizations.length === 0) {
        console.log('🔧 Platform admin detected with org admin status but no admin organizations - fixing...')
        await grantPlatformAdminOrgAccess()
      }
    }
    
    handlePlatformAdminAccess()
  }, [currentUser, userProfile, adminOrganizations.length])

  // Fetch organization requests when platform admin status changes
  useEffect(() => {
    if (isPlatformAdmin) {
      fetchOrganizationRequests()
    }
  }, [isPlatformAdmin])

  // Debug: Log when component mounts and when data changes
  useEffect(() => {
    // Component mounted
    console.log('🔍 Profile: Component mounted')
    if (currentUser) {
      console.log('🔍 Profile: Current user UID:', currentUser.uid)
      console.log('🔍 Profile: User email:', currentUser.email)
    }
  }, [])

  const handleSave = async () => {
    try {
      if (!currentUser?.uid) {
        toast.error('No user ID available')
        return
      }

      if (!formData.displayName.trim()) {
        toast.error('Full Name is required')
        return
      }

      // Show loading state
      toast.loading('Updating profile...')

      // Update the user profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        creatorName: formData.displayName.trim(),
        updatedAt: serverTimestamp()
      })

      // Update the local userProfile state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          creatorName: formData.displayName.trim(),
          updatedAt: new Date()
        })
      }

      toast.dismiss()
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error) {
      toast.dismiss()
      console.error('❌ Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    // Reset form data to current values
    let displayName = ''
    if (userProfile?.creatorName && userProfile.creatorName.trim()) {
      displayName = userProfile.creatorName.trim()
    } else if (userProfile?.displayName && userProfile.displayName.trim()) {
      displayName = userProfile.displayName.trim()
    } else if (userProfile?.name && userProfile.name.trim()) {
      displayName = userProfile.name.trim()
    }
    
    setFormData({
      displayName: displayName,
      email: currentUser?.email || userProfile?.email || ''
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Creator Header */}
      {isPlatformAdmin && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <Crown className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Platform Creator Dashboard</h1>
              <p className="text-purple-100">Full administrative access to the Chimeo platform</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {formData.displayName || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {currentUser?.email || 'Not available'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Created
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {userProfile?.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

            </div>
          </div>

          {/* Organization Admin Information */}
          {isOrgAdmin && adminOrganizations.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600" />
                Organization Admin
              </h2>
              
              <div className="space-y-4">
                {adminOrganizations.map((org) => (
                  <div key={org.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.userRole === 'organization_admin' || org.userRole === 'org_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {org.userRole === 'organization_admin' || org.userRole === 'org_admin' ? (
                              <>
                                <Crown className="h-3 w-3 mr-1" />
                                Organization Admin
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3 mr-1" />
                                Admin
                              </>
                            )}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Role:</strong> {org.userRole === 'organization_admin' || org.userRole === 'org_admin' ? 'Organization Administrator' : 'Administrator'}</p>
                          <p><strong>Can Manage Admins:</strong> {org.canManageAdmins ? 'Yes' : 'No'}</p>
                          {org.description && (
                            <p><strong>Description:</strong> {org.description}</p>
                          )}
                          {org.memberCount && (
                            <p><strong>Members:</strong> {org.memberCount}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        {org.canManageAdmins && (
                          <button
                            onClick={() => {
                              setSelectedAdminOrg(org)
                              setShowAdminModal(true)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                          >
                            <UserCog className="h-4 w-4 mr-1" />
                            Manage Admins
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Information */}
          <div className="card mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription</h2>
            
            <div className="space-y-4">
              {/* Current Subscription Tier */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full mr-4">
                  <CreditCard className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900">
                    {subscriptionLoading ? 'Loading...' : subscription?.planType?.toUpperCase() || 'FREE'}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {subscriptionLoading ? 'Loading subscription details...' : 
                     subscription?.name || 'Free Plan'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    ${subscription?.price || 0}/month
                  </div>
                  <div className="text-sm text-gray-500">
                    {subscription?.status || 'active'}
                  </div>
                </div>
              </div>
              
              {/* Usage Stats */}
              {usageStats && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Current Usage
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {usageStats.usage?.alertsSent || 0}
                      </div>
                      <div className="text-sm text-blue-800">Alerts Sent</div>
                      <div className="text-xs text-blue-600">
                        of {subscription?.limits?.alerts || '∞'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {usageStats.usage?.groupsCreated || 0}
                      </div>
                      <div className="text-sm text-blue-800">Groups Created</div>
                      <div className="text-xs text-blue-600">
                        of {subscription?.limits?.groups || '∞'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {usageStats.usage?.adminsAdded || 0}
                      </div>
                      <div className="text-sm text-blue-800">Admins Added</div>
                      <div className="text-xs text-blue-600">
                        of {subscription?.limits?.admins || '∞'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              


            </div>
          </div>
        </div>

        {/* Creator Dashboard - Only for Platform Admin */}
        {isPlatformAdmin && (
          <div className="space-y-6">
            {/* Platform Admin Status */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-purple-600" />
                Platform Admin Dashboard
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{organizations?.length || 0}</div>
                  <div className="text-sm text-purple-600">Total Organizations</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{organizationRequests?.length || 0}</div>
                  <div className="text-sm text-blue-600">Pending Requests</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <div className="text-sm text-green-600">Platform Status</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowSpecialAccessModal(true)}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Special Access
                </button>
                
                <button
                  onClick={grantPlatformAdminOrgAccess}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Grant Platform Admin Access
                </button>
                
                <button
                  onClick={() => window.open('/org-requests', '_blank')}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review Organization Requests
                </button>
                
                <button
                  onClick={() => window.open('/analytics', '_blank')}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Platform Analytics
                </button>
              </div>
            </div>

            {/* System Information */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                System Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Platform Version:</span>
                  <span className="text-sm font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Environment:</span>
                  <span className="text-sm font-medium">Production</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Database:</span>
                  <span className="text-sm font-medium">Firestore</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    console.log('Export all data')
                    toast.success('Data export feature coming soon!')
                  }}
                  className="btn-secondary flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </button>
                
                <button
                  onClick={() => {
                    console.log('System maintenance')
                    toast.success('Maintenance mode feature coming soon!')
                  }}
                  className="btn-secondary flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Maintenance
                </button>
                
                <button
                  onClick={() => {
                    console.log('User management')
                    toast.success('User management feature coming soon!')
                  }}
                  className="btn-secondary flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </button>
                
                <button
                  onClick={() => {
                    console.log('System logs')
                    toast.success('System logs feature coming soon!')
                  }}
                  className="btn-secondary flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  System Logs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="w-full btn-secondary text-left flex items-center"
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </button>
              <button 
                onClick={() => setShowNotificationModal(true)}
                className="w-full btn-secondary text-left flex items-center"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notification Preferences
              </button>
              <button 
                onClick={() => setShowPrivacyModal(true)}
                className="w-full btn-secondary text-left flex items-center"
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy Settings
              </button>
            </div>
          </div>

          {/* Organization Requests Management - Only for Platform Admin */}
          {isPlatformAdmin && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-purple-600" />
                Organization Requests Management
              </h3>
              
              {requestsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
                </div>
              ) : organizationRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No organization requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {organizationRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {request.organizationName}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {request.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                              {request.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Requested by:</strong> {request.userDisplayName || request.userEmail}</p>
                            <p><strong>Email:</strong> {request.userEmail}</p>
                            <p><strong>Type:</strong> {request.requestType}</p>
                            {request.description && (
                              <p><strong>Description:</strong> {request.description}</p>
                            )}
                            {request.address && (
                              <p><strong>Address:</strong> {request.address}, {request.city}, {request.state} {request.zipCode}</p>
                            )}
                            {request.contact && (
                              <p><strong>Contact:</strong> {request.contact}</p>
                            )}
                            {request.email && (
                              <p><strong>Organization Email:</strong> {request.email}</p>
                            )}
                            {request.website && (
                              <p><strong>Website:</strong> {request.website}</p>
                            )}
                            <p><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => approveRequest(request.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Danger Zone - Only show when editing */}
          {isEditing && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
              <button className="w-full btn-danger">
                Delete Account
              </button>
              <p className="mt-2 text-xs text-gray-500">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                <p className="text-sm text-gray-600 mt-1">Control how you receive notifications</p>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-8">
                {/* Push Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Bell className="h-5 w-5 mr-2 text-blue-500" />
                        Push Notifications
                      </h3>
                      <p className="text-sm text-gray-600">Receive notifications on your device</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushEnabled}
                        onChange={(e) => updateNotificationSetting('pushEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {notificationSettings.pushEnabled && (
                    <div className="ml-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Emergency Alerts</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.pushAlerts}
                            onChange={(e) => updateNotificationSetting('pushAlerts', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Admin Updates</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.pushAdminUpdates}
                            onChange={(e) => updateNotificationSetting('pushAdminUpdates', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Group Updates</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.pushGroupUpdates}
                            onChange={(e) => updateNotificationSetting('pushGroupUpdates', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-green-500" />
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailEnabled}
                        onChange={(e) => updateNotificationSetting('emailEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  
                  {notificationSettings.emailEnabled && (
                    <div className="ml-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Emergency Alerts</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.emailAlerts}
                            onChange={(e) => updateNotificationSetting('emailAlerts', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Admin Updates</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.emailAdminUpdates}
                            onChange={(e) => updateNotificationSetting('emailAdminUpdates', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Group Updates</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.emailGroupUpdates}
                            onChange={(e) => updateNotificationSetting('emailGroupUpdates', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quiet Hours */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-purple-500" />
                        Quiet Hours
                      </h3>
                      <p className="text-sm text-gray-600">Set times when you don't want notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.quietHoursEnabled}
                        onChange={(e) => updateNotificationSetting('quietHoursEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  {notificationSettings.quietHoursEnabled && (
                    <div className="ml-7 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={notificationSettings.quietStart}
                            onChange={(e) => updateNotificationSetting('quietStart', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={notificationSettings.quietEnd}
                            onChange={(e) => updateNotificationSetting('quietEnd', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quiet Days</label>
                        <div className="space-y-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <label key={day} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={notificationSettings.quietDays.includes(day)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...notificationSettings.quietDays, day]
                                    : notificationSettings.quietDays.filter(d => d !== day)
                                  updateNotificationSetting('quietDays', newDays)
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alert Types */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                      Alert Types
                    </h3>
                    <p className="text-sm text-gray-600">Choose which types of alerts to receive</p>
                  </div>
                  
                  <div className="ml-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">🚨 Emergency Alerts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emergencyAlerts}
                          onChange={(e) => updateNotificationSetting('emergencyAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">⚠️ Warning Alerts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.warningAlerts}
                          onChange={(e) => updateNotificationSetting('warningAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">ℹ️ Info Alerts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.infoAlerts}
                          onChange={(e) => updateNotificationSetting('infoAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">📅 Scheduled Alerts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.scheduledAlerts}
                          onChange={(e) => updateNotificationSetting('scheduledAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Organization-Specific Settings */}
                {adminOrganizations.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Building className="h-5 w-5 mr-2 text-orange-500" />
                        Organization Settings
                      </h3>
                      <p className="text-sm text-gray-600">Customize notifications per organization</p>
                    </div>
                    
                    <div className="ml-7 space-y-4">
                      {adminOrganizations.map(org => (
                        <div key={org.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">{org.name}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Mute this organization</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings.orgSettings[org.id]?.muted || false}
                                  onChange={(e) => updateOrgSetting(org.id, 'muted', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Priority notifications only</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings.orgSettings[org.id]?.priorityOnly || false}
                                  onChange={(e) => updateOrgSetting(org.id, 'priorityOnly', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={notificationLoading}
              >
                Cancel
              </button>
              <button
                onClick={saveNotificationSettings}
                disabled={notificationLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {notificationLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {notificationLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Control your privacy and data settings</p>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Profile Visibility */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-blue-500" />
                      Profile Visibility
                    </h3>
                    <p className="text-sm text-gray-600">Control who can see your profile information</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Make profile public</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userProfile?.isPublic || false}
                          onChange={(e) => {
                            console.log('Profile visibility changed:', e.target.checked)
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Show email to other users</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userProfile?.showEmail || false}
                          onChange={(e) => {
                            console.log('Email visibility changed:', e.target.checked)
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Data Sharing */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-green-500" />
                      Data Sharing
                    </h3>
                    <p className="text-sm text-gray-600">Control how your data is shared and used</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Allow analytics tracking</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userProfile?.allowAnalytics !== false}
                          onChange={(e) => {
                            console.log('Analytics tracking changed:', e.target.checked)
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Share usage data for improvements</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userProfile?.shareUsageData !== false}
                          onChange={(e) => {
                            console.log('Usage data sharing changed:', e.target.checked)
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Lock className="h-5 w-5 mr-2 text-red-500" />
                      Account Security
                    </h3>
                    <p className="text-sm text-gray-600">Manage your account security settings</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Two-factor authentication</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Coming Soon</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Login notifications</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userProfile?.loginNotifications !== false}
                          onChange={(e) => {
                            console.log('Login notifications changed:', e.target.checked)
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Download className="h-5 w-5 mr-2 text-purple-500" />
                      Data Management
                    </h3>
                    <p className="text-sm text-gray-600">Export or manage your data</p>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        console.log('Export data requested')
                        toast.success('Data export feature coming soon!')
                      }}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Export my data</span>
                        <span className="text-xs text-gray-500">JSON, CSV</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        console.log('Delete account requested')
                        toast.error('Account deletion feature coming soon!')
                      }}
                      className="w-full text-left px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Delete my account</span>
                        <span className="text-xs text-red-500">Permanent</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  console.log('Privacy settings saved')
                  toast.success('Privacy settings saved!')
                  setShowPrivacyModal(false)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-600 mt-1">Update your account password</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                onClick={changePassword}
                disabled={passwordLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {passwordLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showAdminModal && selectedAdminOrg && (
        <AdminManagementModal
          organization={selectedAdminOrg}
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
        />
      )}

      {/* Special Access Manager Modal */}
      {showSpecialAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Special Access Manager</h2>
                <p className="text-sm text-gray-600 mt-1">Manage special access and unlimited features for users</p>
              </div>
              <button
                onClick={() => setShowSpecialAccessModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <SpecialAccessManager />
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showAdminModal && selectedAdminOrg && (
        <AdminManagementModal
          isOpen={showAdminModal}
          onClose={() => {
            setShowAdminModal(false)
            setSelectedAdminOrg(null)
          }}
          organization={selectedAdminOrg}
        />
      )}
    </div>
  )
}

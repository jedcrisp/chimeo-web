import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

class GroupService {
  // Fetch all groups for a specific organization
  async getGroupsForOrganization(organizationId) {
    try {
      // Ensure organizationId is a string
      const orgIdString = typeof organizationId === 'string' ? organizationId : String(organizationId)
      
      // Use a simple query without composite index requirements
      const groupsQuery = query(
        collection(db, 'organizations', orgIdString, 'groups')
      )
      
      const groupsSnapshot = await getDocs(groupsQuery)
      let groups = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filter active groups in JavaScript (no index needed)
      const activeGroups = groups.filter(group => group.isActive !== false)
      
      // Sort by name in JavaScript (no index needed)
      activeGroups.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      
      return activeGroups
    } catch (error) {
      console.error('Error fetching groups:', error)
      return []
    }
  }

  // Fetch a specific group by ID
  async getGroupById(organizationId, groupId) {
    try {
      const groupDoc = await getDoc(doc(db, 'organizations', organizationId, 'groups', groupId))
      
      if (groupDoc.exists()) {
        return {
          id: groupDoc.id,
          ...groupDoc.data()
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching group:', error)
      return null
    }
  }

  // Create a new group
  async createGroup(organizationId, groupData) {
    try {
      const groupRef = doc(collection(db, 'organizations', organizationId, 'groups'))
      const newGroup = {
        id: groupRef.id,
        name: groupData.name,
        description: groupData.description || '',
        organizationId: organizationId,
        isActive: true,
        memberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await setDoc(groupRef, newGroup)
      return newGroup
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }

  // Update an existing group
  async updateGroup(organizationId, groupId, updateData) {
    try {
      const groupRef = doc(db, 'organizations', organizationId, 'groups', groupId)
      const updatePayload = {
        ...updateData,
        updatedAt: new Date()
      }
      
      await updateDoc(groupRef, updatePayload)
      return true
    } catch (error) {
      console.error('Error updating group:', error)
      throw error
    }
  }

  // Delete a group (soft delete by setting isActive to false)
  async deleteGroup(organizationId, groupId) {
    try {
      const groupRef = doc(db, 'organizations', organizationId, 'groups', groupId)
      await updateDoc(groupRef, {
        isActive: false,
        updatedAt: new Date()
      })
      
      return true
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }
}

export default new GroupService()

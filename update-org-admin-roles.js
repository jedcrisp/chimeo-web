// Script to update existing organizations to have proper admin roles
// Run this in the browser console on your app

async function updateOrganizationAdminRoles() {
  console.log('🔄 Updating organization admin roles...')
  
  try {
    // Import Firebase functions (assuming they're available globally)
    const { collection, getDocs, doc, updateDoc, serverTimestamp } = window.firebase.firestore
    
    // Get all organizations
    const orgsQuery = collection(db, 'organizations')
    const orgsSnapshot = await getDocs(orgsQuery)
    
    console.log(`🔍 Found ${orgsSnapshot.size} organizations`)
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data()
      const adminIds = orgData.adminIds || {}
      const adminRoles = orgData.adminRoles || {}
      
      console.log(`🔍 Processing organization: ${orgData.name}`)
      console.log(`   - Current adminIds:`, Object.keys(adminIds))
      console.log(`   - Current adminRoles:`, adminRoles)
      
      // If no adminRoles exist, create them
      if (Object.keys(adminRoles).length === 0) {
        console.log(`   - No adminRoles found, creating...`)
        
        const newAdminRoles = {}
        
        // Set the first admin as org_admin (organization creator)
        const adminUserIds = Object.keys(adminIds)
        if (adminUserIds.length > 0) {
          // Set the first admin as org_admin
          newAdminRoles[adminUserIds[0]] = 'org_admin'
          console.log(`   - Set ${adminUserIds[0]} as org_admin`)
          
          // Set remaining admins as regular admins
          for (let i = 1; i < adminUserIds.length; i++) {
            newAdminRoles[adminUserIds[i]] = 'admin'
            console.log(`   - Set ${adminUserIds[i]} as admin`)
          }
        }
        
        // Update the organization
        await updateDoc(doc(db, 'organizations', orgDoc.id), {
          adminRoles: newAdminRoles,
          updatedAt: serverTimestamp()
        })
        
        console.log(`✅ Updated ${orgData.name} with admin roles`)
      } else {
        console.log(`   - adminRoles already exist, skipping`)
      }
    }
    
    console.log('🎉 Organization admin roles update completed!')
    
  } catch (error) {
    console.error('❌ Error updating organization admin roles:', error)
  }
}

// Run the function
updateOrganizationAdminRoles()

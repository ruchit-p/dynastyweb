import { createClient } from '@supabase/supabase-js'
import { migrateFromFirebase } from '../src/lib/server/storage-admin'
import type { StorageBucket } from '../src/lib/client/storage'

// Initialize Firebase Admin
initializeApp()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// MARK: - Types

type MigrationStats = {
  total: number
  success: number
  failed: number
  skipped: number
}

// MARK: - Migration Functions

/**
 * Migrates user profile pictures
 */
async function migrateProfilePictures(): Promise<MigrationStats> {
  console.log('Starting profile pictures migration...')
  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 }

  try {
    const firestore = getFirestore()
    const storage = getStorage()
    const bucket = storage.bucket()

    // Get all users with profile pictures
    const usersSnapshot = await firestore
      .collection('users')
      .where('profilePicture', '!=', null)
      .get()

    stats.total = usersSnapshot.size
    console.log(`Found ${stats.total} users with profile pictures`)

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data()
      try {
        if (!userData.profilePicture) {
          stats.skipped++
          continue
        }

        // Download from Firebase
        const file = bucket.file(userData.profilePicture)
        const [exists] = await file.exists()

        if (!exists) {
          console.log(`File ${userData.profilePicture} does not exist in Firebase`)
          stats.skipped++
          continue
        }

        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 3600 * 1000, // 1 hour
        })

        // Upload to Supabase
        await migrateFromFirebase('avatars' as StorageBucket, url)
        stats.success++

        // Update user record in Supabase
        const { error } = await supabase
          .from('users')
          .update({ profile_picture: `avatars/${doc.id}/profile.jpg` })
          .eq('id', doc.id)

        if (error) {
          console.error(`Failed to update user ${doc.id} record:`, error)
        }
      } catch (error) {
        console.error(`Failed to migrate profile picture for user ${doc.id}:`, error)
        stats.failed++
      }
    }
  } catch (error) {
    console.error('Profile pictures migration failed:', error)
    throw error
  }

  return stats
}

/**
 * Migrates story media files
 */
async function migrateStoryMedia(): Promise<MigrationStats> {
  console.log('Starting story media migration...')
  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 }

  try {
    const firestore = getFirestore()
    const storage = getStorage()
    const bucket = storage.bucket()

    // Get all stories with media
    const storiesSnapshot = await firestore
      .collection('stories')
      .where('mediaUrls', '!=', null)
      .get()

    stats.total = storiesSnapshot.size
    console.log(`Found ${stats.total} stories with media`)

    for (const doc of storiesSnapshot.docs) {
      const storyData = doc.data()
      try {
        if (!storyData.mediaUrls?.length) {
          stats.skipped++
          continue
        }

        for (const mediaUrl of storyData.mediaUrls) {
          // Download from Firebase
          const file = bucket.file(mediaUrl)
          const [exists] = await file.exists()

          if (!exists) {
            console.log(`File ${mediaUrl} does not exist in Firebase`)
            stats.skipped++
            continue
          }

          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 3600 * 1000, // 1 hour
          })

          // Upload to Supabase
          await migrateFromFirebase('stories' as StorageBucket, url)
          stats.success++
        }

        // Update story record in Supabase
        const newMediaUrls = storyData.mediaUrls.map(
          (url: string) => `stories/${doc.id}/${url.split('/').pop()}`
        )

        const { error } = await supabase
          .from('stories')
          .update({ media_urls: newMediaUrls })
          .eq('id', doc.id)

        if (error) {
          console.error(`Failed to update story ${doc.id} record:`, error)
        }
      } catch (error) {
        console.error(`Failed to migrate media for story ${doc.id}:`, error)
        stats.failed++
      }
    }
  } catch (error) {
    console.error('Story media migration failed:', error)
    throw error
  }

  return stats
}

/**
 * Migrates family tree documents
 */
async function migrateDocuments(): Promise<MigrationStats> {
  console.log('Starting documents migration...')
  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 }

  try {
    const firestore = getFirestore()
    const storage = getStorage()
    const bucket = storage.bucket()

    // Get all family trees with documents
    const treesSnapshot = await firestore
      .collection('familyTrees')
      .where('documents', '!=', null)
      .get()

    stats.total = treesSnapshot.size
    console.log(`Found ${stats.total} family trees with documents`)

    for (const doc of treesSnapshot.docs) {
      const treeData = doc.data()
      try {
        if (!treeData.documents?.length) {
          stats.skipped++
          continue
        }

        for (const documentUrl of treeData.documents) {
          // Download from Firebase
          const file = bucket.file(documentUrl)
          const [exists] = await file.exists()

          if (!exists) {
            console.log(`File ${documentUrl} does not exist in Firebase`)
            stats.skipped++
            continue
          }

          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 3600 * 1000, // 1 hour
          })

          // Upload to Supabase
          await migrateFromFirebase('documents' as StorageBucket, url)
          stats.success++
        }

        // Update family tree record in Supabase
        const newDocumentUrls = treeData.documents.map(
          (url: string) => `documents/${doc.id}/${url.split('/').pop()}`
        )

        const { error } = await supabase
          .from('family_trees')
          .update({ document_urls: newDocumentUrls })
          .eq('id', doc.id)

        if (error) {
          console.error(`Failed to update family tree ${doc.id} record:`, error)
        }
      } catch (error) {
        console.error(`Failed to migrate documents for family tree ${doc.id}:`, error)
        stats.failed++
      }
    }
  } catch (error) {
    console.error('Documents migration failed:', error)
    throw error
  }

  return stats
}

// MARK: - Main Migration Function

async function main() {
  console.log('Starting Firebase to Supabase migration...')

  try {
    // Migrate profile pictures
    const profileStats = await migrateProfilePictures()
    console.log('Profile pictures migration complete:', profileStats)

    // Migrate story media
    const mediaStats = await migrateStoryMedia()
    console.log('Story media migration complete:', mediaStats)

    // Migrate documents
    const documentStats = await migrateDocuments()
    console.log('Documents migration complete:', documentStats)

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
main() 
import { NextResponse } from 'next/server'
import { createFamilyTree, getFamilyTree, getUserFamilyTrees } from '@/app/actions/family-tree'

// Create a new family tree
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createFamilyTree(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Create family tree error:', error)
    return NextResponse.json(
      { error: 'Failed to create family tree' },
      { status: 500 }
    )
  }
}

// Get all family trees for the current user
export async function GET() {
  try {
    const result = await getUserFamilyTrees()

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get family trees error:', error)
    return NextResponse.json(
      { error: 'Failed to get family trees' },
      { status: 500 }
    )
  }
} 
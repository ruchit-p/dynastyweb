import { NextResponse } from 'next/server'
import { addFamilyRelationship } from '@/app/actions/family-tree'

// Add a new family relationship
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await addFamilyRelationship(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Add family relationship error:', error)
    return NextResponse.json(
      { error: 'Failed to add family relationship' },
      { status: 500 }
    )
  }
} 
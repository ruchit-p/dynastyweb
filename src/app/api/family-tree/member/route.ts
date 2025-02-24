import { NextResponse } from 'next/server'
import { addFamilyMember } from '@/app/actions/family-tree'

// Add a new family member
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await addFamilyMember(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Add family member error:', error)
    return NextResponse.json(
      { error: 'Failed to add family member' },
      { status: 500 }
    )
  }
} 
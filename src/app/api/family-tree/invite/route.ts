import { NextResponse } from 'next/server'
import { inviteFamilyMember } from '@/app/actions/family-tree'

// Create a new invitation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await inviteFamilyMember(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Invite family member error:', error)
    return NextResponse.json(
      { error: 'Failed to invite family member' },
      { status: 500 }
    )
  }
} 
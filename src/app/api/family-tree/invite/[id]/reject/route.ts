import { NextResponse } from 'next/server'
import { rejectInvitation } from '@/app/actions/family-tree'

// Reject an invitation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await rejectInvitation(params.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Reject invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    )
  }
} 
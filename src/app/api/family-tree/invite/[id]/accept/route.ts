import { NextResponse } from 'next/server'
import { acceptInvitation } from '@/app/actions/family-tree'

// Accept an invitation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await acceptInvitation(params.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
} 
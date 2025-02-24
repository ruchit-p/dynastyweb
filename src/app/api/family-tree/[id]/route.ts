import { NextResponse } from 'next/server'
import { getFamilyTree } from '@/app/actions/family-tree'

// Get a specific family tree
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getFamilyTree(params.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get family tree error:', error)
    return NextResponse.json(
      { error: 'Failed to get family tree' },
      { status: 500 }
    )
  }
} 
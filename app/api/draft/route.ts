import { NextResponse } from 'next/server'
import { AnthropicProvider } from '../../../lib/llm/anthropic/index'
import { FollowUpContext } from '../../../lib/llm/provider'

const provider = new AnthropicProvider()

export async function POST(request: Request) {
  const context = (await request.json()) as FollowUpContext

  try {
    const draft = await provider.generateFollowUp(context)
    return NextResponse.json({ draft })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

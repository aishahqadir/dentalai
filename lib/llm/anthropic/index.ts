import { LlmProvider, FollowUpContext } from '../provider'

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-3.5-mini'

export class AnthropicProvider implements LlmProvider {
  async generateFollowUp(context: FollowUpContext): Promise<string> {
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const systemPrompt = `You are an assistant that drafts follow-up messages for patients who have been recommended dental treatment. The tone should be ${context.tone}, professional, and supportive. Do not pressure the patient or invent urgency. Keep the message focussed on the treatment already recommended and offer to answer any questions.`

    const prompt = `Patient first name: ${context.patientFirstName}\nProposed treatment: ${context.proposedTreatmentSummary}\nDays since presented: ${context.daysSincePresented}\nPractice name: ${context.practiceName}\n\nWrite a warm follow-up message for approval by the treatment coordinator.`

    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
      },
      body: JSON.stringify({
        model: anthropicModel,
        prompt: `${systemPrompt}\n\n${prompt}`,
        max_tokens_to_sample: 400,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.completion ?? ''
  }
}

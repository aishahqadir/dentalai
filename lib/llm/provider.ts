export interface FollowUpContext {
  patientFirstName: string
  proposedTreatmentSummary: string
  daysSincePresented: number
  practiceName: string
  tone: 'warm' | 'neutral'
}

export interface LlmProvider {
  generateFollowUp(context: FollowUpContext): Promise<string>
}

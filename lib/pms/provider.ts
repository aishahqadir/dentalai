export interface TreatmentItem {
  description: string
  valuePence: number
}

export interface OpenTreatmentPlan {
  pmsPlanId: string
  pmsPatientId: string
  items: TreatmentItem[]
  totalValuePence: number
  presentedAt: Date
  status: string
}

export interface PatientContact {
  firstName: string
  lastName: string
  phone?: string
  email?: string
}

export interface PmsProvider {
  listOpenTreatmentPlans(): Promise<OpenTreatmentPlan[]>
  getPatientContact(pmsPatientId: string): Promise<PatientContact>
  isPlanBookedOrCompleted(pmsPlanId: string): Promise<boolean>
  sendMessage?(pmsPatientId: string, body: string): Promise<void>
}

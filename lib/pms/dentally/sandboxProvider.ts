import { PmsProvider, OpenTreatmentPlan, PatientContact, TreatmentItem } from '../provider'

interface DentallyPlanResponse {
  id: string
  patient_id: string
  planned_private_treatment_value: number
  presented_at: string
  status: string
  items: Array<{ description: string; planned_private_treatment_value: number }>
}

interface DentallyPatientResponse {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
}

const safeParseDate = (value: string) => {
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

export class DentallySandboxProvider implements PmsProvider {
  constructor(private baseUrl: string, private apiKey: string) {}

  private async fetchJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Dentally API error ${res.status}: ${body}`)
    }
    return res.json()
  }

  private mapPlan(plan: DentallyPlanResponse): OpenTreatmentPlan {
    const items: TreatmentItem[] = plan.items.map(item => ({
      description: item.description,
      valuePence: Math.round(item.planned_private_treatment_value),
    }))

    return {
      pmsPlanId: plan.id,
      pmsPatientId: plan.patient_id,
      items,
      totalValuePence: Math.round(plan.planned_private_treatment_value),
      presentedAt: safeParseDate(plan.presented_at),
      status: plan.status,
    }
  }

  async listOpenTreatmentPlans(): Promise<OpenTreatmentPlan[]> {
    const query = `treatment_plan?status=open`
    const data = await this.fetchJson<{ data: DentallyPlanResponse[] }>(query)
    return data.data.map(this.mapPlan.bind(this))
  }

  async getPatientContact(pmsPatientId: string): Promise<PatientContact> {
    const data = await this.fetchJson<{ data: DentallyPatientResponse }>(`patients/${pmsPatientId}`)
    return {
      firstName: data.data.first_name,
      lastName: data.data.last_name,
      phone: data.data.phone,
      email: data.data.email,
    }
  }

  async isPlanBookedOrCompleted(pmsPlanId: string): Promise<boolean> {
    const data = await this.fetchJson<{ data: DentallyPlanResponse }>(`treatment_plan/${pmsPlanId}`)
    return data.data.status === 'booked' || data.data.status === 'completed'
  }
}

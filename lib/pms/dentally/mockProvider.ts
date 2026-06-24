import { PmsProvider, OpenTreatmentPlan, TreatmentItem, PatientContact } from '../provider'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export class MockDentallyProvider implements PmsProvider {
  async listOpenTreatmentPlans(): Promise<OpenTreatmentPlan[]> {
    const plans: OpenTreatmentPlan[] = [
      {
        pmsPlanId: 'plan_1',
        pmsPatientId: 'patient_1',
        items: [
          { description: 'Composite filling (front)', valuePence: 12000 } as TreatmentItem,
        ],
        totalValuePence: 12000,
        presentedAt: daysAgo(7),
        status: 'proposed',
      },
      {
        pmsPlanId: 'plan_2',
        pmsPatientId: 'patient_2',
        items: [
          { description: 'Scale & polish + 1 filling', valuePence: 8000 } as TreatmentItem,
        ],
        totalValuePence: 8000,
        presentedAt: daysAgo(30),
        status: 'proposed',
      },
    ]

    return plans
  }

  async getPatientContact(pmsPatientId: string): Promise<PatientContact> {
    return {
      firstName: pmsPatientId === 'patient_1' ? 'Sofia' : 'Liam',
      lastName: 'Patient',
      email: `${pmsPatientId}@example.test`,
    }
  }

  async isPlanBookedOrCompleted(_pmsPlanId: string): Promise<boolean> {
    return false
  }
}

export const dentallyProvider = new MockDentallyProvider()

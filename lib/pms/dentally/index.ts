import { dentallyProvider as mock } from './mockProvider'
import { DentallySandboxProvider } from './sandboxProvider'

const apiKey = process.env.DENTALLY_API_KEY
const baseUrl = process.env.DENTALLY_BASE_URL

export const dentallyProvider = apiKey && baseUrl
  ? new DentallySandboxProvider(baseUrl, apiKey)
  : mock

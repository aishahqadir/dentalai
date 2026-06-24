import { dentallyProvider as mock } from './mockProvider'

// DentallyProvider scaffold: if DENTALLY_API_KEY and DENTALLY_BASE_URL are set,
// a real provider would be used. For now, default to the mock provider but
// expose where to implement the real provider.

// Placeholder for a future real implementation
// export const dentallyProvider = new DentallyProvider(process.env.DENTALLY_API_KEY, process.env.DENTALLY_BASE_URL)

export const dentallyProvider = mock

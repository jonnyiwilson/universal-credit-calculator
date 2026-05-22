import { createEntityId, zeroGbp } from "../../../shared/src"
import type { CreateCaseRequestV2 } from "../../../validation/src"
import type { UniversalCreditCase } from "./types"

export function createUniversalCreditCaseFromCreateRequest(request: CreateCaseRequestV2, now: string): UniversalCreditCase {
  const caseId = createEntityId("case")
  const adults = request.household.adults.map((adult) => ({
    adultId: createEntityId("adult"),
    role: adult.role,
    dateOfBirth: adult.dateOfBirth,
    immigrationStatus: adult.immigrationStatus,
    habitualResidenceStatus: adult.habitualResidenceStatus,
    studentStatus: adult.studentStatus,
    prisonStatus: adult.prisonStatus,
    caringResponsibilities: [],
    employmentStatuses: []
  }))

  return {
    caseId,
    caseVersion: 1,
    status: "draft",
    jurisdiction: "GB",
    createdAt: now,
    updatedAt: now,
    household: {
      adults,
      children: [],
      nonDependants: [],
      housing: request.household.housing
        ? {
            housingId: createEntityId("housing"),
            tenure: request.household.housing.tenure,
            postcode: request.household.housing.postcode,
            localAuthorityCode: request.household.housing.localAuthorityCode,
            localAuthorityName: request.household.housing.localAuthorityName,
            brmaCode: request.household.housing.brmaCode,
            brmaName: request.household.housing.brmaName,
            lhaBedroomCategory: request.household.housing.lhaBedroomCategory,
            lhaMonthlyRate: request.household.housing.lhaMonthlyRate,
            lhaWeeklyRate: request.household.housing.lhaWeeklyRate,
            lhaDatasetVersion: request.household.housing.lhaDatasetVersion,
            lhaDatasetChecksum: request.household.housing.lhaDatasetChecksum,
            eligibleRent: request.household.housing.eligibleRent ?? zeroGbp(),
            eligibleServiceCharges: request.household.housing.eligibleServiceCharges ?? zeroGbp(),
            rentFrequency: request.household.housing.rentFrequency,
            liabilityVerified: request.household.housing.liabilityVerified,
            landlordVerified: request.household.housing.landlordVerified,
            nonDependants: [],
            evidenceRefs: []
          }
        : undefined
    },
    timeline: [
      {
        eventId: createEntityId("event"),
        caseId,
        type: "case_created",
        occurredAt: request.assessmentPeriod.startDate,
        reportedAt: now,
        effectiveFrom: request.assessmentPeriod.startDate,
        payload: { schemaVersion: request.schemaVersion },
        evidenceRefs: []
      }
    ],
    evidence: [],
    incomeEvents: [],
    capitalAssets: [],
    metadata: {
      source: "web",
      schemaVersion: request.schemaVersion
    }
  }
}

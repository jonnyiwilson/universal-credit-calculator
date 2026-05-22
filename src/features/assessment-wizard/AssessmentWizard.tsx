import { ChevronLeft, ChevronRight, FileText, Printer, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRef } from "react"
import { type UseFormReturn, useFieldArray, useForm } from "react-hook-form"
import { Button } from "../../components/ui/button"
import { ErrorSummary, WarningSummary, fieldId } from "../../components/govuk/ErrorSummary"
import { FormField } from "../../components/govuk/FormField"
import { Fieldset, InsetHelp } from "../../components/govuk/InterviewPrimitives"
import { PageShell } from "../../components/layout/PageShell"
import { V2ArtifactResult } from "../../components/results/V2ArtifactResult"
import { poundsToPence } from "../../lib/money/format"
import {
  appendInterviewEventsToCase,
  calculateAssessmentPeriodV2,
  createCaseFromInterviewDraft,
  listBrmaRegionsV2,
  resolveHousingAreaV2,
  type BrmaRegionOption,
  type CalculationResponseV2,
  type LhaRateOption
} from "../../lib/api-client/v2AssessmentApi"
import { useAssessmentDraftStore, type AssessmentStep } from "../../store/assessmentDraft.store"
import { buildCaseEventDrafts, createDefaultInterviewDraft, type ClaimantInterviewDraft } from "./interviewDraft"
import { gbp } from "../../domain/types/money"
import { childLabel, claimantTerms, householdOwner, personLabel, sourceLabel, tenureLabel } from "./claimantWording"
import { blockingIssues, validateInterviewDraft, warningIssues, type InterviewValidationIssue } from "./interviewValidation"

const steps: Array<{ id: AssessmentStep; label: string }> = [
  { id: "household", label: "Household" },
  { id: "children", label: "Children" },
  { id: "earnings", label: "Earnings" },
  { id: "selfEmployment", label: "Self-employment" },
  { id: "housing", label: "Housing" },
  { id: "childcare", label: "Childcare" },
  { id: "capital", label: "Capital" },
  { id: "health", label: "Health" },
  { id: "deductions", label: "Deductions" },
  { id: "transitionalProtection", label: "Transitional protection" },
  { id: "review", label: "Review" },
  { id: "results", label: "Results" }
]

export function AssessmentWizard() {
  const draftStore = useAssessmentDraftStore()
  const [v2Result, setV2Result] = useState<CalculationResponseV2 | null>(null)
  const [v2Error, setV2Error] = useState<string | null>(null)
  const [validationIssues, setValidationIssues] = useState<InterviewValidationIssue[]>([])
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const form = useForm<ClaimantInterviewDraft>({
    defaultValues: draftStore.interview,
    mode: "onBlur"
  })
  const currentIndex = steps.findIndex((step) => step.id === draftStore.currentStep)
  const currentStep = steps[currentIndex] ?? steps[0]
  const progress = useMemo(() => `${currentIndex + 1} of ${steps.length}`, [currentIndex])

  function persistInterview() {
    const interview = form.getValues()
    draftStore.setInterview({ ...interview, currentStep: draftStore.currentStep })
    return interview
  }

  function goNext() {
    const interview = persistInterview()
    const issues = validateInterviewDraft(interview).filter((issue) => issue.path && stepForPath(issue.path) === currentStep.id)
    setValidationIssues(issues)
    if (blockingIssues(issues).length) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }
    draftStore.setCurrentStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  }

  function goBack() {
    persistInterview()
    draftStore.setCurrentStep(steps[Math.max(currentIndex - 1, 0)].id)
  }

  async function calculate() {
    const interview = persistInterview()
    const issues = validateInterviewDraft(interview)
    setValidationIssues(issues)
    if (blockingIssues(issues).length) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }
    try {
      setV2Error(null)
      const created = await createCaseFromInterviewDraft(interview)
      await appendInterviewEventsToCase(interview, created)
      const artifact = await calculateAssessmentPeriodV2({
        assessmentPeriodId: created.assessmentPeriodId,
        accessToken: created.accessToken
      })
      setV2Result(artifact)
      draftStore.setCurrentStep("results")
    } catch (error) {
      setV2Result(null)
      setV2Error(error instanceof Error ? error.message : "V2 calculation failed")
      draftStore.setCurrentStep("results")
    }
  }

  return (
    <PageShell>
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="no-print border-r border-gov-border pr-6">
          <p className="mb-3 text-sm font-bold text-gov-grey">Step {progress}</p>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={`w-full border-l-4 px-3 py-2 text-left ${step.id === currentStep.id ? "border-gov-blue bg-gov-light font-bold" : "border-transparent"}`}
                  onClick={() => {
                    persistInterview()
                    draftStore.setCurrentStep(step.id)
                  }}
                >
                  <span className="mr-2 text-sm text-gov-grey">{index + 1}</span>
                  {step.label}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold">{currentStep.label}</h1>
            <p className="mt-3 max-w-3xl text-lg text-gov-grey">
              Estimate only. Your answers are converted into assessment-period events and calculated by the server.
            </p>
          </div>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              if (currentStep.id === "review") void calculate()
              else goNext()
            }}
          >
            <ErrorSummary ref={errorSummaryRef} issues={blockingIssues(validationIssues)} />
            <WarningSummary issues={warningIssues(validationIssues)} />
            <div aria-live="polite" className="sr-only">
              {blockingIssues(validationIssues).length ? `${blockingIssues(validationIssues).length} errors need fixing.` : "No blocking errors on this step."}
            </div>
            {currentStep.id === "household" ? <HouseholdStep form={form} /> : null}
            {currentStep.id === "children" ? <ChildrenStep form={form} /> : null}
            {currentStep.id === "earnings" ? <EarningsStep form={form} /> : null}
            {currentStep.id === "selfEmployment" ? <SelfEmploymentStep form={form} /> : null}
            {currentStep.id === "housing" ? <HousingStep form={form} /> : null}
            {currentStep.id === "childcare" ? <ChildcareStep form={form} /> : null}
            {currentStep.id === "capital" ? <CapitalStep form={form} /> : null}
            {currentStep.id === "health" ? <HealthStep form={form} /> : null}
            {currentStep.id === "deductions" ? <DeductionsStep form={form} /> : null}
            {currentStep.id === "transitionalProtection" ? <TransitionalStep form={form} /> : null}
            {currentStep.id === "review" ? <ReviewStep draft={form.getValues()} /> : null}
            {currentStep.id === "results" && v2Result ? <V2ArtifactResult result={v2Result} /> : null}
            {currentStep.id === "results" && v2Error ? <p className="mt-4 font-bold text-red-700">V2 artifact calculation failed: {v2Error}. No prototype fallback is used for claimant-visible results.</p> : null}

            <div className="no-print mt-10 flex flex-wrap gap-3">
              {currentIndex > 0 ? (
                <Button type="button" className="bg-gov-grey hover:bg-gov-dark" onClick={goBack}>
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
              ) : null}
              {currentStep.id !== "results" ? (
                <Button type="submit">
                  {currentStep.id === "review" ? (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Calculate award
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button type="button" onClick={() => window.print()}>
                    <Printer className="mr-2 h-5 w-5" />
                    Print report
                  </Button>
                  <Button
                    type="button"
                    className="bg-gov-grey hover:bg-gov-dark"
                    onClick={() => {
                      draftStore.resetDraft()
                      form.reset(createDefaultInterviewDraft())
                      setV2Result(null)
                      setV2Error(null)
                    }}
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    New assessment
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  )
}

type FormHandle = UseFormReturn<ClaimantInterviewDraft>

function HouseholdStep({ form }: { form: FormHandle }) {
  const adults = form.watch("adults")
  const hasPartner = adults.some((adult) => adult.role === "partner")
  function setHasPartner(enabled: boolean) {
    if (enabled && !hasPartner) {
      form.setValue("adults", [...adults, { ...adults[0], draftId: "partner", role: "partner" }], { shouldDirty: true })
    }
    if (!enabled) form.setValue("adults", adults.filter((adult) => adult.role !== "partner"), { shouldDirty: true })
  }
  return (
    <section>
      <InsetHelp>A Universal Credit claim has one claimant and, if relevant, one partner. Other adults are captured later as people living with you for housing.</InsetHelp>
      <FormField id={fieldId("adults.0.firstName")} label="Claimant first name (optional)" hint="This is only used to make the questions easier to read. It is not used in the calculation." {...form.register("adults.0.firstName")} />
      <FormField id={fieldId("adults.0.dateOfBirth")} label={`${personLabel(form.watch(), "claimant")} date of birth`} type="date" {...form.register("adults.0.dateOfBirth")} />
      <label className="mb-4 flex max-w-2xl items-start gap-3 text-lg">
        <input type="checkbox" className="mt-1 h-6 w-6 border-2 border-gov-dark" checked={hasPartner} onChange={(event) => setHasPartner(event.currentTarget.checked)} />
        <span>Do you have a partner on this claim?</span>
      </label>
      {hasPartner ? (
        <>
          <FormField label="Partner first name (optional)" hint="This is only used to personalize the interview." {...form.register(`adults.${adults.findIndex((adult) => adult.role === "partner")}.firstName` as const)} />
          <FormField label={`${personLabel(form.watch(), "partner")} date of birth`} type="date" {...form.register(`adults.${adults.findIndex((adult) => adult.role === "partner")}.dateOfBirth` as const)} />
        </>
      ) : null}
    </section>
  )
}

function ChildrenStep({ form }: { form: FormHandle }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "children" })
  const draft = form.watch()
  return (
    <section>
      <p className="mb-6 max-w-2xl text-gov-grey">Only add children or qualifying young people who live with you and may be included in the award.</p>
      <div className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="border-2 border-gov-border p-4">
            <h2 className="mb-4 text-xl font-bold">{childLabel(draft, index)}</h2>
            <FormField label="Child first name (optional)" hint="This is only used to make the questions easier to read." {...form.register(`children.${index}.firstName`)} />
            <FormField label="Date of birth" type="date" {...form.register(`children.${index}.dateOfBirth`)} />
            <SelectField label="Education status" name={`children.${index}.educationStatus`} form={form} options={["not_applicable", "eligible_education", "not_eligible", "unknown"]} />
            <SelectField label="Disability status" name={`children.${index}.disabilityStatus`} form={form} options={["none", "lower", "higher"]} />
            <Checkbox label="Foster child" name={`children.${index}.fosterChild`} form={form} />
            <Checkbox label="Born before April 2017" name={`children.${index}.bornBeforeApril2017`} form={form} />
            <Checkbox label="Two-child-limit exception applies" name={`children.${index}.twoChildLimitException`} form={form} />
            <Button type="button" className="mt-2 bg-gov-grey hover:bg-gov-dark" onClick={() => remove(index)}>Remove child</Button>
          </div>
        ))}
      </div>
      <Button type="button" className="mt-4" onClick={() => append({ draftId: crypto.randomUUID(), firstName: "", dateOfBirth: "", disabilityStatus: "none", educationStatus: "not_applicable", fosterChild: false, bornBeforeApril2017: false, twoChildLimitException: false })}>
        Add another child for {householdOwner(draft)}
      </Button>
    </section>
  )
}

function EarningsStep({ form }: { form: FormHandle }) {
  const hasIncome = form.watch("hasEmploymentIncome")
  const adults = form.watch("adults")
  const draft = form.watch()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "employmentIncomes" })
  return (
    <section>
      <InsetHelp>We ask about employment payments because Universal Credit is based on income received during each assessment period.</InsetHelp>
      <Checkbox label="Do you or your partner have employment income?" name="hasEmploymentIncome" form={form} />
      {hasIncome ? (
        <>
          <p className="mb-6 max-w-2xl text-gov-grey">Add each payment separately. This supports multiple jobs and more than one wage in an assessment period.</p>
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border-2 border-gov-border p-4">
                <h2 className="mb-4 text-xl font-bold">Employment payment for {personLabel(draft, form.watch(`employmentIncomes.${index}.adultRole`) ?? "claimant")}</h2>
                <SelectField label="Who received this payment?" name={`employmentIncomes.${index}.adultRole`} form={form} options={adults.map((adult) => adult.role)} />
                <FormField label="Employer name" {...form.register(`employmentIncomes.${index}.employerName`)} />
                <FormField label="Payment received date" type="date" {...form.register(`employmentIncomes.${index}.receivedDate`)} />
                <MoneyField label="Net pay" name={`employmentIncomes.${index}.netAmount.amountPence`} form={form} />
                <MoneyField label="Pension deduction from this pay" name={`employmentIncomes.${index}.pensionContribution.amountPence`} form={form} />
                <SelectField label="How was this payment added?" name={`employmentIncomes.${index}.source`} form={form} options={["employment_manual", "employment_rti"]} labels={{ employment_manual: sourceLabel("employment_manual"), employment_rti: sourceLabel("employment_rti") }} />
                <SelectField label="Pay frequency" name={`employmentIncomes.${index}.payrollFrequency`} form={form} options={["weekly", "fortnightly", "four_weekly", "monthly"]} />
                <SelectField label="Payroll date movement" name={`employmentIncomes.${index}.payrollDateMovedReason`} form={form} options={["", "weekend", "bank_holiday", "employer_change", "unknown"]} />
                <Button type="button" className="mt-2 bg-gov-grey hover:bg-gov-dark" onClick={() => remove(index)}>Remove payment</Button>
              </div>
            ))}
          </div>
          <Button type="button" className="mt-4" onClick={() => append({ draftId: crypto.randomUUID(), adultRole: "claimant", source: "employment_manual", receivedDate: form.getValues("assessmentPeriod.startDate"), netAmount: gbp(0), pensionContribution: gbp(0), payrollFrequency: "monthly" })}>
            Add another payment
          </Button>
        </>
      ) : <p className="text-gov-grey">No employment income events will be sent.</p>}
    </section>
  )
}

function SelfEmploymentStep({ form }: { form: FormHandle }) {
  const applies = form.watch("selfEmployment.applies")
  return (
    <section>
      <Checkbox label="Are you self-employed?" name="selfEmployment.applies" form={form} />
      {applies ? (
        <>
          <SelectField label="Who is self-employed?" name="selfEmployment.adultRole" form={form} options={form.watch("adults").map((adult) => adult.role)} />
          <MoneyField label="Business income this assessment period" name="selfEmployment.businessIncome.amountPence" form={form} />
          <MoneyField label="Allowable expenses this assessment period" name="selfEmployment.allowableExpenses.amountPence" form={form} />
          <Checkbox label="Gainfully self-employed decision applies" name="selfEmployment.gainfullySelfEmployed" form={form} />
          <Checkbox label="Start-up period applies" name="selfEmployment.startupPeriodApplies" form={form} />
          <Checkbox label="Company director" name="selfEmployment.director" form={form} />
          <MoneyField label="Loss carried forward" name="selfEmployment.lossCarriedForward.amountPence" form={form} />
        </>
      ) : <p className="text-gov-grey">Self-employment questions are skipped.</p>}
    </section>
  )
}

function HousingStep({ form }: { form: FormHandle }) {
  const [brmaRegions, setBrmaRegions] = useState<BrmaRegionOption[]>([])
  const [rates, setRates] = useState<LhaRateOption[]>([])
  const [resolutionMessage, setResolutionMessage] = useState<string | null>("Postcode lookup is not available in this local build because postcode-to-area mapping data has not yet been loaded. Select your local rent area manually for now.")
  const [resolvingArea, setResolvingArea] = useState(false)
  const tenure = form.watch("housing.tenure")
  const selectedBrma = form.watch("housing.brmaCode")
  const selectedBedroomCategory = form.watch("housing.lhaBedroomCategory")
  const nonDependants = useFieldArray({ control: form.control, name: "nonDependants" })

  useEffect(() => {
    void listBrmaRegionsV2().then(setBrmaRegions).catch(() => setResolutionMessage("BRMA regions are not loaded yet."))
  }, [])

  useEffect(() => {
    if (!selectedBrma || tenure !== "private_rent") return
    void resolveHousingAreaV2({ brmaId: selectedBrma }).then(applyResolvedArea).catch(() => setResolutionMessage("BRMA rates could not be loaded."))
  }, [selectedBrma, tenure])

  async function resolveByPostcode() {
    setResolvingArea(true)
    try {
      applyResolvedArea(await resolveHousingAreaV2({ postcode: String(form.getValues("housing.postcode") ?? "") }))
    } catch {
      setResolutionMessage("Postcode lookup is not available in this local build because postcode-to-area mapping data has not yet been loaded. Select your local rent area manually for now.")
    } finally {
      setResolvingArea(false)
    }
  }

  function applyResolvedArea(resolved: Awaited<ReturnType<typeof resolveHousingAreaV2>>) {
    if (resolved.status !== "resolved" || !resolved.region || !resolved.rates) {
      setRates([])
      setResolutionMessage(resolved.message ?? "Area could not be resolved. Select your BRMA manually.")
      return
    }
    setResolutionMessage(null)
    setRates(resolved.rates)
    form.setValue("housing.brmaCode", resolved.region.brmaId, { shouldDirty: true })
    form.setValue("housing.brmaName", resolved.region.name, { shouldDirty: true })
    const category = selectedBedroomCategory || "one_bedroom"
    form.setValue("housing.lhaBedroomCategory", category, { shouldDirty: true })
    const rate = resolved.rates.find((item) => item.bedroomCategory === category) ?? resolved.rates[0]
    if (rate) applyRate(rate)
  }

  function applyRate(rate: LhaRateOption) {
    form.setValue("housing.lhaBedroomCategory", rate.bedroomCategory, { shouldDirty: true })
    form.setValue("housing.lhaMonthlyRate", rate.monthlyRate, { shouldDirty: true })
    form.setValue("housing.lhaWeeklyRate", rate.weeklyRate, { shouldDirty: true })
    form.setValue("housing.lhaDatasetVersion", rate.sourceDatasetVersion, { shouldDirty: true })
    form.setValue("housing.lhaDatasetChecksum", rate.checksum, { shouldDirty: true })
  }

  return (
    <section>
      <SelectField label="What type of housing do you have?" name="housing.tenure" form={form} options={["none", "private_rent", "social_rent", "owner", "temporary_accommodation", "specified_supported", "refuge"]} labels={{ none: tenureLabel("none"), private_rent: tenureLabel("private_rent"), social_rent: tenureLabel("social_rent"), owner: tenureLabel("owner"), temporary_accommodation: tenureLabel("temporary_accommodation"), specified_supported: tenureLabel("specified_supported"), refuge: tenureLabel("refuge") }} />
      {["temporary_accommodation", "specified_supported", "refuge"].includes(tenure) ? <p className="mb-4 border-l-4 border-red-700 bg-gov-light p-4 font-bold">This situation cannot yet be calculated safely because this housing type may use a different route for housing costs.</p> : null}
      {tenure === "private_rent" ? (
        <>
          <InsetHelp>Universal Credit uses local rent limits based on where you live. Select the local rent area manually unless postcode mapping data has been loaded.</InsetHelp>
          <MoneyField label="Monthly rent" name="housing.eligibleRentMonthly.amountPence" form={form} />
          <MoneyField label="Monthly eligible service charges" name="housing.eligibleServiceChargesMonthly.amountPence" form={form} />
          <FormField label="Postcode (optional)" {...form.register("housing.postcode")} />
          <Button type="button" className="mb-4" onClick={resolveByPostcode} disabled={resolvingArea}>Resolve postcode</Button>
          <SelectField label="Select the local rent area that covers where you live" name="housing.brmaCode" form={form} options={["", ...brmaRegions.map((region) => region.brmaId)]} labels={Object.fromEntries(brmaRegions.map((region) => [region.brmaId, region.name]))} />
          <SelectField label="Local housing limit bedroom category" name="housing.lhaBedroomCategory" form={form} options={["", ...rates.map((rate) => rate.bedroomCategory)]} labels={Object.fromEntries(rates.map((rate) => [rate.bedroomCategory, `${rate.bedroomCategory.replaceAll("_", " ")} - GBP ${(rate.monthlyRate.amountPence / 100).toFixed(2)} monthly`]))} onValue={(value) => {
            const rate = rates.find((item) => item.bedroomCategory === value)
            if (rate) applyRate(rate)
          }} />
        </>
      ) : null}
      {tenure === "social_rent" ? (
        <>
          <MoneyField label="Eligible rent per month" name="housing.eligibleRentMonthly.amountPence" form={form} />
          <MoneyField label="Eligible service charges per month" name="housing.eligibleServiceChargesMonthly.amountPence" form={form} />
          <NumberField label="Bedrooms occupied" name="housing.bedroomsOccupied" form={form} />
        </>
      ) : null}
      {tenure === "owner" ? <p className="text-gov-grey">Owner-occupier support for mortgage interest is routed separately from the monthly UC housing element.</p> : null}
      {resolutionMessage ? <p className="mb-4 font-bold text-red-700">{resolutionMessage}</p> : null}
      <details className="mb-6">
        <summary className="cursor-pointer font-bold">Technical area reference</summary>
        <p className="mt-2 text-gov-grey">The local rent area is stored as a BRMA reference for audit and replay.</p>
      </details>
      <h2 className="mt-8 text-xl font-bold">Other adults living with you</h2>
      {nonDependants.fields.map((field, index) => (
        <div key={field.id} className="my-4 border-2 border-gov-border p-4">
          <FormField label="Date of birth" type="date" {...form.register(`nonDependants.${index}.dateOfBirth`)} />
          <FormField label="Relationship to claimant" {...form.register(`nonDependants.${index}.relationshipToClaimant`)} />
          <Checkbox label="Exempt from housing contribution" name={`nonDependants.${index}.exemptFromDeduction`} form={form} />
          <Checkbox label="Housing contribution may apply" name={`nonDependants.${index}.housingContributionMayApply`} form={form} />
          <FormField label="Benefits received, if known" {...form.register(`nonDependants.${index}.benefitsReceived`)} />
          <Button type="button" className="mt-2 bg-gov-grey hover:bg-gov-dark" onClick={() => nonDependants.remove(index)}>Remove non-dependant</Button>
        </div>
      ))}
      <Button type="button" className="mt-4" onClick={() => nonDependants.append({ draftId: crypto.randomUUID(), dateOfBirth: "", relationshipToClaimant: "", exemptFromDeduction: false, benefitsReceived: "", housingContributionMayApply: true })}>Add non-dependant</Button>
    </section>
  )
}

function ChildcareStep({ form }: { form: FormHandle }) {
  const applies = form.watch("hasChildcareCosts")
  return (
    <section>
      <Checkbox label="Do you pay approved childcare costs?" name="hasChildcareCosts" form={form} />
      {applies ? (
        <>
          <MoneyField label="Approved childcare costs per month" name="childcare.monthlyCosts.amountPence" form={form} />
          <Checkbox label="Provider is approved" name="childcare.approvedProvider" form={form} />
          <SelectField label="Children for childcare cap" name="childcare.childCountForCap" form={form} options={["0", "1", "2"]} />
        </>
      ) : <p className="text-gov-grey">No childcare event will be sent.</p>}
    </section>
  )
}

function CapitalStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <MoneyField label="Cash savings" name="capital.cashSavings.amountPence" form={form} />
      <MoneyField label="Investments" name="capital.investments.amountPence" form={form} />
      <MoneyField label="Property capital" name="capital.propertyCapital.amountPence" form={form} />
      <MoneyField label="Notional capital" name="capital.notionalCapital.amountPence" form={form} />
      <Checkbox label="Possible deprivation of capital" name="capital.deprivationOfCapital" form={form} />
    </section>
  )
}

function HealthStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <Checkbox label="Limited capability for work" name="health.lcw" form={form} />
      <Checkbox label="Limited capability for work and work-related activity" name="health.lcwra" form={form} />
    </section>
  )
}

function DeductionsStep({ form }: { form: FormHandle }) {
  const hasDeductions = form.watch("hasDeductions")
  const sanctionApplies = form.watch("sanction.applies")
  const deductions = useFieldArray({ control: form.control, name: "deductions" })
  return (
    <section>
      <Checkbox label="Do you have deductions from your UC?" name="hasDeductions" form={form} />
      {hasDeductions ? (
        <>
          {deductions.fields.map((field, index) => (
            <div key={field.id} className="my-4 border-2 border-gov-border p-4">
              <SelectField label="Deduction type" name={`deductions.${index}.type`} form={form} options={["advance_repayment", "overpayment", "third_party", "rent_arrears", "hardship_repayment", "child_maintenance", "fraud_penalty"]} />
              <MoneyField label="Amount per month" name={`deductions.${index}.amountMonthly.amountPence`} form={form} />
              <FormField label="Start date" type="date" {...form.register(`deductions.${index}.startDate`)} />
              <FormField label="End date" type="date" {...form.register(`deductions.${index}.endDate`)} />
              <FormField label="Notes" {...form.register(`deductions.${index}.notes`)} />
              <Button type="button" className="mt-2 bg-gov-grey hover:bg-gov-dark" onClick={() => deductions.remove(index)}>Remove deduction</Button>
            </div>
          ))}
          <Button type="button" className="mt-4" onClick={() => deductions.append({ draftId: crypto.randomUUID(), type: "advance_repayment", amountMonthly: gbp(0) })}>Add deduction</Button>
        </>
      ) : <p className="text-gov-grey">No deduction events will be sent.</p>}
      <div className="mt-8">
        <Checkbox label="Have you been sanctioned?" name="sanction.applies" form={form} />
        {sanctionApplies ? (
          <>
            <SelectField label="Sanction level" name="sanction.level" form={form} options={["low", "medium", "high"]} />
            <MoneyField label="Sanction amount per month" name="sanction.amountMonthly.amountPence" form={form} />
            <FormField label="Start date" type="date" {...form.register("sanction.startDate")} />
            <FormField label="End date" type="date" {...form.register("sanction.endDate")} />
          </>
        ) : null}
      </div>
    </section>
  )
}

function TransitionalStep({ form }: { form: FormHandle }) {
  const applies = form.watch("transitionalProtection.managedMigration")
  return (
    <section>
      <Checkbox label="Is this a managed migration case?" name="transitionalProtection.managedMigration" form={form} />
      {applies ? <MoneyField label="Transitional element per month" name="transitionalProtection.transitionalElementMonthly.amountPence" form={form} /> : <p className="text-gov-grey">Transitional protection is skipped.</p>}
    </section>
  )
}

function ReviewStep({ draft }: { draft: ClaimantInterviewDraft }) {
  const events = buildCaseEventDrafts(draft)
  const issues = validateInterviewDraft(draft)
  return (
    <section className="space-y-4">
      <p className="max-w-2xl text-gov-grey">Check your answers before the server calculates the estimate. The frontend does not calculate the award.</p>
      <WarningSummary issues={warningIssues(issues)} />
      <dl className="grid gap-3 md:grid-cols-2">
        <ReviewItem label="Claimant" value={personLabel(draft, "claimant")} />
        <ReviewItem label="Housing" value={tenureLabel(draft.housing.tenure)} />
        <ReviewItem label="Employment payments" value={String(draft.employmentIncomes.length)} />
        <ReviewItem label="Local rent area" value={draft.housing.brmaName || "Not selected"} />
      </dl>
      <details className="border-2 border-gov-border p-4">
        <summary className="cursor-pointer text-xl font-bold">Technical details</summary>
        <pre className="mt-4 max-h-[32rem] overflow-auto bg-gov-light p-4 text-sm">{JSON.stringify(events, null, 2)}</pre>
      </details>
    </section>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function MoneyField({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  const rawValue = form.watch(name as never) as unknown as number | undefined
  return (
    <FormField
      label={label}
      id={fieldId(name)}
      type="number"
      step="0.01"
      min="0"
      value={(rawValue ?? 0) / 100}
      suffix="GBP"
      onChange={(event) => {
        form.setValue(name as never, poundsToPence(event.currentTarget.value) as never, { shouldDirty: true, shouldValidate: true })
      }}
    />
  )
}

function NumberField({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  return <FormField id={fieldId(name)} label={label} type="number" min="0" {...form.register(name as never, { valueAsNumber: true })} />
}

function Checkbox({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  return (
    <label className="mb-4 flex max-w-2xl items-start gap-3 text-lg">
      <input
        type="checkbox"
        className="mt-1 h-6 w-6 border-2 border-gov-dark"
        checked={Boolean(form.watch(name as never))}
        onChange={(event) => form.setValue(name as never, event.currentTarget.checked as never, { shouldDirty: true })}
      />
      <span>{label}</span>
    </label>
  )
}

function SelectField({ label, name, form, options, labels, onValue }: { label: string; name: string; form: FormHandle; options: string[]; labels?: Record<string, string>; onValue?: (value: string) => void }) {
  return (
    <>
      <label className="mb-2 block text-lg font-bold" htmlFor={name}>{label}</label>
      <select
        id={fieldId(name)}
        className="mb-6 w-full max-w-xl border-2 border-gov-dark px-3 py-2"
        value={String(form.watch(name as never) ?? "")}
        onChange={(event) => {
          const value = event.currentTarget.value
          const coerced = name === "childcare.childCountForCap" ? Number(value) : value
          form.setValue(name as never, coerced as never, { shouldDirty: true })
          onValue?.(value)
        }}
      >
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option.replaceAll("_", " ")}</option>)}
      </select>
    </>
  )
}

function stepForPath(path: string): AssessmentStep {
  if (path.startsWith("adults")) return "household"
  if (path.startsWith("children")) return "children"
  if (path.startsWith("employmentIncomes") || path.startsWith("hasEmploymentIncome")) return "earnings"
  if (path.startsWith("selfEmployment")) return "selfEmployment"
  if (path.startsWith("housing") || path.startsWith("nonDependants")) return "housing"
  if (path.startsWith("childcare") || path.startsWith("hasChildcareCosts")) return "childcare"
  if (path.startsWith("capital")) return "capital"
  if (path.startsWith("health")) return "health"
  if (path.startsWith("deductions") || path.startsWith("hasDeductions") || path.startsWith("sanction")) return "deductions"
  if (path.startsWith("transitionalProtection")) return "transitionalProtection"
  return "review"
}

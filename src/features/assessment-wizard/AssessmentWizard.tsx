import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeft, ChevronRight, FileText, Printer, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, type Resolver, type UseFormReturn, useForm } from "react-hook-form"
import { AssessmentInputSchema, type AssessmentInputFormData } from "../../domain/validation"
import { Button } from "../../components/ui/button"
import { FormField } from "../../components/govuk/FormField"
import { PageShell } from "../../components/layout/PageShell"
import { V2ArtifactResult } from "../../components/results/V2ArtifactResult"
import { poundsToPence } from "../../lib/money/format"
import { appendPrototypeEventsToCase, calculateAssessmentPeriodV2, createCaseFromPrototypeInput, type CalculationResponseV2 } from "../../lib/api-client/v2AssessmentApi"
import { useAssessmentDraftStore, type AssessmentStep } from "../../store/assessmentDraft.store"
import { createDefaultAssessmentInput } from "../../tests/fixtures/defaultAssessment"

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
  const draft = useAssessmentDraftStore()
  const [v2Result, setV2Result] = useState<CalculationResponseV2 | null>(null)
  const [v2Error, setV2Error] = useState<string | null>(null)

  const form = useForm<AssessmentInputFormData>({
    resolver: zodResolver(AssessmentInputSchema) as Resolver<AssessmentInputFormData>,
    defaultValues: draft.input,
    mode: "onBlur"
  })

  const currentIndex = steps.findIndex((step) => step.id === draft.currentStep)
  const currentStep = steps[currentIndex] ?? steps[0]
  const watchedInput = form.watch()

  const progress = useMemo(() => `${currentIndex + 1} of ${steps.length}`, [currentIndex])

  async function goNext() {
    const valid = await form.trigger()
    if (!valid) return
    const input = form.getValues()
    draft.setInput(input)
    const next = steps[Math.min(currentIndex + 1, steps.length - 1)]
    draft.setCurrentStep(next.id)
  }

  function goBack() {
    const previous = steps[Math.max(currentIndex - 1, 0)]
    draft.setCurrentStep(previous.id)
  }

  async function calculate() {
    const input = form.getValues()
    try {
      setV2Error(null)
      const created = await createCaseFromPrototypeInput(input)
      await appendPrototypeEventsToCase(input, created)
      const artifact = await calculateAssessmentPeriodV2({
        assessmentPeriodId: created.assessmentPeriodId,
        accessToken: created.accessToken
      })
      draft.setInput(input)
      setV2Result(artifact)
      draft.setCurrentStep("results")
    } catch (error) {
      setV2Result(null)
      setV2Error(error instanceof Error ? error.message : "V2 calculation failed")
      draft.setCurrentStep("results")
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
                  className={`w-full border-l-4 px-3 py-2 text-left ${
                    step.id === currentStep.id ? "border-gov-blue bg-gov-light font-bold" : "border-transparent"
                  }`}
                  onClick={() => draft.setCurrentStep(step.id)}
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
              Estimate only. The calculation is traceable and versioned, but it is not a DWP decision.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (currentStep.id === "review") void calculate()
              else void goNext()
            }}
          >
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
            {currentStep.id === "review" ? <ReviewStep input={watchedInput} /> : null}
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
                      draft.resetDraft()
                      form.reset(createDefaultAssessmentInput())
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

type FormHandle = UseFormReturn<AssessmentInputFormData>

function HouseholdStep({ form }: { form: FormHandle }) {
  const claimType = form.watch("household.claimType")
  return (
    <section>
      <label className="mb-2 block text-lg font-bold" htmlFor="claimType">
        Claim type
      </label>
      <select id="claimType" className="mb-6 border-2 border-gov-dark px-3 py-2" {...form.register("household.claimType")}>
        <option value="single">Single claimant</option>
        <option value="couple">Couple</option>
      </select>
      <MoneyLikeNumber label="Claimant age" name="household.claimantAge" form={form} />
      {claimType === "couple" ? <MoneyLikeNumber label="Partner age" name="household.partnerAge" form={form} /> : null}
      <Checkbox label="Has caring responsibilities" name="household.hasCaringResponsibilities" form={form} />
      <MoneyLikeNumber label="Caring hours per week" name="household.caringHoursPerWeek" form={form} />
    </section>
  )
}

function ChildrenStep({ form }: { form: FormHandle }) {
  const children = form.watch("children")
  return (
    <section>
      <p className="mb-6 max-w-2xl text-gov-grey">Add dependent children. Disability and two-child-limit flags are captured per child for traceable entitlement rules.</p>
      <div className="space-y-6">
        {children.map((_, index) => (
          <div key={index} className="border-2 border-gov-border p-4">
            <h2 className="mb-4 text-xl font-bold">Child {index + 1}</h2>
            <FormField label="Date of birth" type="date" {...form.register(`children.${index}.dateOfBirth`)} />
            <Checkbox label="Born before April 2017" name={`children.${index}.bornBeforeApril2017`} form={form} />
            <Checkbox label="Disabled child element applies" name={`children.${index}.disabled`} form={form} />
            <Checkbox label="Severely disabled child element applies" name={`children.${index}.severelyDisabled`} form={form} />
            <Checkbox label="Two-child-limit exception applies" name={`children.${index}.twoChildLimitException`} form={form} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          onClick={() =>
            form.setValue("children", [
              ...children,
              { dateOfBirth: new Date().toISOString().slice(0, 10), bornBeforeApril2017: false, disabled: false, severelyDisabled: false, twoChildLimitException: false }
            ])
          }
        >
          Add child
        </Button>
        {children.length ? (
          <Button type="button" className="bg-gov-grey hover:bg-gov-dark" onClick={() => form.setValue("children", children.slice(0, -1))}>
            Remove last child
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function EarningsStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <MoneyField label="Net employment earnings per month" name="earnings.employmentNetMonthly.amountPence" form={form} />
      <MoneyField label="Pension contributions per month" name="earnings.pensionContributionsMonthly.amountPence" form={form} />
      <MoneyField label="Other income per month" name="earnings.otherIncomeMonthly.amountPence" form={form} />
    </section>
  )
}

function SelfEmploymentStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <Checkbox label="Self-employed claimant" name="selfEmployment.enabled" form={form} />
      <MoneyField label="Business income per month" name="selfEmployment.incomeMonthly.amountPence" form={form} />
      <MoneyField label="Allowable expenses per month" name="selfEmployment.allowableExpensesMonthly.amountPence" form={form} />
      <Checkbox label="Gainfully self-employed" name="selfEmployment.gainfullySelfEmployed" form={form} />
      <Checkbox label="Start-up period applies" name="selfEmployment.startupPeriodApplies" form={form} />
    </section>
  )
}

function HousingStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <label className="mb-2 block text-lg font-bold" htmlFor="tenure">
        Housing tenure
      </label>
      <select id="tenure" className="mb-6 border-2 border-gov-dark px-3 py-2" {...form.register("housing.tenure")}>
        <option value="none">No housing costs</option>
        <option value="private_rent">Private rent</option>
        <option value="social_rent">Social rent</option>
        <option value="owner">Owner occupier</option>
      </select>
      <MoneyField label="Eligible rent per month" name="housing.eligibleRentMonthly.amountPence" form={form} />
      <MoneyField label="Eligible service charges per month" name="housing.eligibleServiceChargesMonthly.amountPence" form={form} />
      <MoneyField label="Local Housing Allowance cap per month" name="housing.localHousingAllowanceMonthly.amountPence" form={form} />
      <MoneyField label="Non-dependant deductions per month" name="housing.nonDependantDeductionsMonthly.amountPence" form={form} />
      <MoneyField label="Bedroom tax reduction per month" name="housing.bedroomTaxReductionMonthly.amountPence" form={form} />
    </section>
  )
}

function ChildcareStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <MoneyField label="Approved childcare costs per month" name="childcare.monthlyCosts.amountPence" form={form} />
      <Checkbox label="Provider is approved" name="childcare.approvedProvider" form={form} />
      <label className="mb-2 block text-lg font-bold" htmlFor="childcareCap">
        Children for childcare cap
      </label>
      <select id="childcareCap" className="mb-6 border-2 border-gov-dark px-3 py-2" {...form.register("childcare.childCountForCap", { valueAsNumber: true })}>
        <option value={0}>None</option>
        <option value={1}>One child</option>
        <option value={2}>Two or more children</option>
      </select>
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
  return (
    <section>
      <label className="mb-2 block text-lg font-bold" htmlFor="sanctionLevel">
        Sanction level
      </label>
      <select id="sanctionLevel" className="mb-6 border-2 border-gov-dark px-3 py-2" {...form.register("sanction.level")}>
        <option value="none">None</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <MoneyField label="Sanction amount per month" name="sanction.amountMonthly.amountPence" form={form} />
      <MoneyField label="Advance repayment per month" name="deductions.0.amountMonthly.amountPence" form={form} />
      <input type="hidden" value="advance_repayment" {...form.register("deductions.0.type")} />
    </section>
  )
}

function TransitionalStep({ form }: { form: FormHandle }) {
  return (
    <section>
      <Checkbox label="Managed migration case" name="transitionalProtection.managedMigration" form={form} />
      <MoneyField label="Transitional element per month" name="transitionalProtection.transitionalElementMonthly.amountPence" form={form} />
    </section>
  )
}

function ReviewStep({ input }: { input: AssessmentInputFormData }) {
  return (
    <section className="space-y-4">
      <p className="max-w-2xl text-gov-grey">Review the structured assessment input before calculating. The result page will show the calculation stages and rule trace.</p>
      <pre className="max-h-[32rem] overflow-auto border-2 border-gov-border bg-gov-light p-4 text-sm">{JSON.stringify(input, null, 2)}</pre>
    </section>
  )
}

function MoneyField({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  const rawValue = form.watch(name as never) as unknown as number | undefined
  return (
    <FormField
      label={label}
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

function MoneyLikeNumber({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  return <FormField label={label} type="number" min="0" {...form.register(name as never, { valueAsNumber: true })} />
}

function Checkbox({ label, name, form }: { label: string; name: string; form: FormHandle }) {
  return (
    <Controller
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <label className="mb-4 flex max-w-2xl items-start gap-3 text-lg">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 border-2 border-gov-dark"
            checked={Boolean(field.value)}
            onChange={(event) => field.onChange(event.currentTarget.checked)}
          />
          <span>{label}</span>
        </label>
      )}
    />
  )
}

import type { CalculationResult, CalculationTraceEntry } from "../../domain/types/calculation"
import { displayMoney } from "../../lib/money/format"

export function ResultBreakdown({ result, trace }: { result: CalculationResult; trace: CalculationTraceEntry[] }) {
  return (
    <section className="space-y-8">
      <div className="border-l-8 border-gov-blue bg-gov-light p-6">
        <p className="text-lg font-bold">Estimated monthly Universal Credit award</p>
        <p className="mt-2 text-5xl font-bold">{displayMoney(result.finalAward)}</p>
        {!result.eligibility.eligible ? (
          <p className="mt-4 font-bold text-red-700">{result.eligibility.reasons.join(" ")}</p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BreakdownTable
          title="Maximum entitlement"
          rows={result.elements.map((element) => ({
            label: element.label,
            amount: displayMoney(element.amount)
          }))}
          total={displayMoney(result.maximumEntitlement)}
        />
        <BreakdownTable
          title="Deductions"
          rows={[
            { label: "Earnings deductions", amount: displayMoney(result.earningsDeduction) },
            { label: "Capital deductions", amount: displayMoney(result.capitalDeduction) },
            { label: "Other deductions", amount: displayMoney(result.otherDeductions) }
          ]}
          total={displayMoney({
            amountPence: result.earningsDeduction.amountPence + result.capitalDeduction.amountPence + result.otherDeductions.amountPence,
            currency: "GBP"
          })}
        />
      </div>

      {result.warnings.length ? (
        <div className="border-2 border-gov-yellow p-4">
          <h2 className="text-xl font-bold">Warnings and assumptions</h2>
          <ul className="mt-3 list-disc pl-6">
            {result.warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="border-2 border-gov-border p-4">
        <summary className="cursor-pointer text-xl font-bold">Detailed maths and rule trace</summary>
        <div className="mt-4 space-y-4">
          {trace.map((entry, index) => (
            <article key={`${entry.ruleId}-${index}`} className="border-t border-gov-border pt-4">
              <h3 className="font-bold">
                {entry.ruleId}: {entry.label}
              </h3>
              {entry.formula ? <p className="mt-1 font-mono text-sm">{entry.formula}</p> : null}
              <p className="mt-2 text-sm text-gov-grey">
                Sources: {entry.legislationRefs.map((ref) => ref.title).join(", ")}
              </p>
            </article>
          ))}
        </div>
      </details>
    </section>
  )
}

function BreakdownTable({ title, rows, total }: { title: string; rows: Array<{ label: string; amount: string }>; total: string }) {
  return (
    <div>
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      <table className="w-full border-collapse text-left">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-gov-border">
              <th className="py-3 pr-4 font-normal">{row.label}</th>
              <td className="py-3 text-right font-bold">{row.amount}</td>
            </tr>
          ))}
          <tr>
            <th className="py-3 pr-4 text-lg">Total</th>
            <td className="py-3 text-right text-lg font-bold">{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

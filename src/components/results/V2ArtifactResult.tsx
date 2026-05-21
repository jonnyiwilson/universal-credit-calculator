import type { CalculationResponseV2 } from "../../lib/api-client/v2AssessmentApi"
import { displayMoney } from "../../lib/money/format"

export function V2ArtifactResult({ result }: { result: CalculationResponseV2 }) {
  return (
    <section className="space-y-8">
      <div className="border-l-8 border-gov-blue bg-gov-light p-6">
        <p className="text-lg font-bold">V2 calculation artifact</p>
        <p className="mt-2 text-4xl font-bold capitalize">{result.status}</p>
        {result.finalAward ? <p className="mt-2 text-2xl font-bold">{displayMoney(result.finalAward)}</p> : null}
        {!result.finalAward ? <p className="mt-3 text-gov-grey">No confident final award is available for this artifact.</p> : null}
      </div>

      {result.unsupportedCases.length ? (
        <div className="border-4 border-red-700 p-4">
          <h2 className="text-2xl font-bold">Cannot safely estimate</h2>
          <ul className="mt-3 list-disc pl-6">
            {result.unsupportedCases.map((item) => (
              <li key={item.unsupportedCaseId}>
                <strong>{item.code}:</strong> {item.userMessage}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.assumptions.length ? (
        <div className="border-2 border-gov-yellow p-4">
          <h2 className="text-2xl font-bold">Assumptions</h2>
          <ul className="mt-3 list-disc pl-6">
            {result.assumptions.map((item) => (
              <li key={item.assumptionId}>
                <strong>{item.code}:</strong> {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="text-2xl font-bold">Artifact metadata</h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          <Meta label="Artifact ID" value={result.artifactId} />
          <Meta label="Rate pack" value={result.summary.ratePackVersion} />
          <Meta label="Rule pack" value={result.summary.rulePackVersion} />
          <Meta label="Input hash" value={result.summary.inputHash} />
          <Meta label="Output hash" value={result.summary.outputHash} />
        </dl>
      </div>

      <details className="border-2 border-gov-border p-4">
        <summary className="cursor-pointer text-xl font-bold">Derived artifacts and trace preview</summary>
        <div className="mt-4 space-y-4">
          {result.derivedArtifacts.map((artifact, index) => (
            <article key={`${artifact.artifactType}-${index}`} className="border-t border-gov-border pt-4">
              <h3 className="font-bold">{artifact.artifactType}</h3>
              <pre className="mt-2 max-h-48 overflow-auto bg-gov-light p-3 text-xs">{JSON.stringify(artifact.value, null, 2)}</pre>
            </article>
          ))}
        </div>
      </details>
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold">{label}</dt>
      <dd className="break-all font-mono text-sm">{value}</dd>
    </div>
  )
}

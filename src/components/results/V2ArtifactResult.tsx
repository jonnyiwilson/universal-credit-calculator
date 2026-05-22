import type { CalculationResponseV2 } from "../../lib/api-client/v2AssessmentApi"
import { displayMoney } from "../../lib/money/format"
import { TechnicalDetails } from "../govuk/InterviewPrimitives"

export function V2ArtifactResult({ result }: { result: CalculationResponseV2 }) {
  const supportedSlice = result.derivedArtifacts.find((artifact) => artifact.artifactType === "supported_slice_rev8")?.value as { status?: string; claimantMessage?: string; blockingReasons?: string[] } | undefined
  return (
    <section className="space-y-8">
      <div className="border-l-8 border-gov-blue bg-gov-light p-6">
        <p className="text-lg font-bold">Universal Credit estimate</p>
        <p className="mt-2 text-4xl font-bold capitalize">{result.status}</p>
        {supportedSlice?.status === "supported" ? <p className="mt-3 inline-block bg-green-700 px-3 py-1 font-bold text-white">Verified REV8 journey</p> : null}
        {result.finalAward ? <p className="mt-2 text-2xl font-bold">{displayMoney(result.finalAward)}</p> : null}
        {!result.finalAward ? <p className="mt-3 text-gov-grey">No confident final award is available for this artifact.</p> : null}
        {supportedSlice?.claimantMessage ? <p className="mt-3 max-w-2xl">{supportedSlice.claimantMessage}</p> : null}
      </div>

      {result.unsupportedCases.length ? (
        <div className="border-4 border-red-700 p-4">
          <h2 className="text-2xl font-bold">This situation cannot yet be calculated safely</h2>
          <ul className="mt-3 list-disc pl-6">
            {result.unsupportedCases.map((item) => (
              <li key={item.unsupportedCaseId}>
                {item.userMessage}
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
        <h2 className="text-2xl font-bold">Calculation breakdown</h2>
        <p className="mt-2 text-gov-grey">This shows the main parts used by the server calculation.</p>
      </div>

      <TechnicalDetails>
        <h2 className="text-2xl font-bold">Artifact metadata</h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          <Meta label="Artifact ID" value={result.artifactId} />
          <Meta label="Rate pack" value={result.summary.ratePackVersion} />
          <Meta label="Rule pack" value={result.summary.rulePackVersion} />
          <Meta label="Input hash" value={result.summary.inputHash} />
          <Meta label="Output hash" value={result.summary.outputHash} />
          {result.summary.replayStatus ? <Meta label="Replay" value={result.summary.replayStatus} /> : null}
        </dl>
      </TechnicalDetails>

      <div className="border-2 border-gov-border p-4">
        <h2 className="text-2xl font-bold">Assessment-period timeline</h2>
        <p className="mt-2 text-gov-grey">
          This result is a persisted AP artifact. Revisions, supersessions, appeals, and replay comparisons must create new artifacts or replay records rather than changing this result.
        </p>
      </div>

      <TechnicalDetails summary="Technical calculation details">
        <div className="mt-4 space-y-4">
          {result.derivedArtifacts.map((artifact, index) => (
            <article key={`${artifact.artifactType}-${index}`} className="border-t border-gov-border pt-4">
              <h3 className="font-bold">{artifact.artifactType}</h3>
              <pre className="mt-2 max-h-48 overflow-auto bg-gov-light p-3 text-xs">{JSON.stringify(artifact.value, null, 2)}</pre>
            </article>
          ))}
        </div>
      </TechnicalDetails>
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

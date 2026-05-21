import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { AssessmentInput } from "../domain/types/assessment"
import type { CalculationResult, CalculationTraceEntry } from "../domain/types/calculation"
import { formatMoney } from "../domain/types/money"

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0b0c0c" },
  title: { fontSize: 22, marginBottom: 12, fontWeight: "bold" },
  heading: { fontSize: 14, marginTop: 16, marginBottom: 8, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1 solid #b1b4b6", paddingVertical: 4 },
  muted: { color: "#505a5f" }
})

export function AssessmentReport({
  input,
  result,
  trace,
  generatedAt
}: {
  input: AssessmentInput
  result: CalculationResult
  trace: CalculationTraceEntry[]
  generatedAt: string
}) {
  return (
    <Document title="Universal Credit assessment report">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Universal Credit assessment report</Text>
        <Text style={styles.muted}>Generated {generatedAt}. Estimate only; not a DWP decision.</Text>

        <Text style={styles.heading}>Award summary</Text>
        <View style={styles.row}>
          <Text>Maximum entitlement</Text>
          <Text>{formatMoney(result.maximumEntitlement)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Earnings deductions</Text>
          <Text>{formatMoney(result.earningsDeduction)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Capital deductions</Text>
          <Text>{formatMoney(result.capitalDeduction)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Other deductions</Text>
          <Text>{formatMoney(result.otherDeductions)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Final award</Text>
          <Text>{formatMoney(result.finalAward)}</Text>
        </View>

        <Text style={styles.heading}>Household</Text>
        <Text>Claim type: {input.household.claimType}</Text>
        <Text>Claimant age: {input.household.claimantAge}</Text>
        <Text>Children: {input.children.length}</Text>

        <Text style={styles.heading}>Calculation trace</Text>
        {trace.slice(0, 28).map((entry) => (
          <View key={`${entry.ruleId}-${entry.label}`} style={{ marginBottom: 6 }}>
            <Text>
              {entry.ruleId}: {entry.label}
            </Text>
            {entry.formula ? <Text style={styles.muted}>{entry.formula}</Text> : null}
          </View>
        ))}
      </Page>
    </Document>
  )
}

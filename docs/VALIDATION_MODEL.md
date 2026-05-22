# Validation Model

Frontend validation helps claimants correct answers before the server calculation.

It is not the source of truth for entitlement.

Validation issue types:

- `error`: blocks moving forward or calculating until fixed.
- `warning`: allows progress but asks the claimant to check an answer.

Examples:

- Missing employment payment when employment income is yes is an error.
- Duplicate payments from the same employer on the same date is a warning.
- Rent much higher than the selected local housing limit is a warning.

Backend unsupported-case rules remain authoritative.

# Accessibility

REV10 targets WCAG 2.2 AA direction for the claimant interview.

Implementation standards:

- Every input has a visible label.
- Hints and errors are connected with `aria-describedby`.
- Invalid fields use `aria-invalid`.
- Blocking validation errors appear in an error summary before the form.
- The error summary is focusable and receives focus after blocking validation.
- Status changes use an `aria-live` region.
- Optional question groups use semantic fieldsets where practical.
- Keyboard focus must remain visible with a high-contrast outline.
- Buttons and form controls use touch-friendly sizing.

This is not a substitute for a full manual WCAG audit before public launch.

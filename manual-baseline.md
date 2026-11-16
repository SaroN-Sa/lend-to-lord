# Manual testing baseline (before automation)

Date: 16 November 2026
Method: 9 checks run by hand in the browser, timed with a stopwatch.

| # | Check | Result |
|---|-------|--------|
| 1 | Open the home page | Pass |
| 2 | Switch the language | Pass |
| 3 | Click each main menu link | Pass |
| 4 | Open a page that doesn't exist | Pass |
| 5 | Open the contribute page | Pass |
| 6 | Submit that form empty | Pass |
| 7 | Submit the form with invalid data | FAIL (no error message appeared) |
| 8 | Open /api/keep-alive | Pass |
| 9 | Open the admin page without logging in | Pass |



Note on check 7: the browser's built-in validation tooltip ("value must be
greater than or equal to ...") blocked the submission. No custom in-page
error message is shown. I initially recorded this as a failure; on review
the validation works through native HTML5 validation.

Total checks: 9
Total time: 4 min 24 s
Problems found: 1 (check 7)
Run automatically on every push: No
Test coverage measured: No
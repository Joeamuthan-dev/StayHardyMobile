# Mandatory Development Constraints

This project follows a strict set of global rules that all future AI-generated changes must follow. These constraints are mandatory and apply to every update, modification, or feature addition.

---

### Rule 1 — Feature Protection
No existing feature should be removed or disabled unless explicitly instructed by an admin command.
- **Requirement**: AI must not delete or remove any existing feature.
- **Requirement**: Features may only be modified or improved.
- **Requirement**: Feature removal must only occur when an explicit admin instruction is given.

### Rule 2 — Data Safety
User data must always be protected.
- **Requirement**: AI must never delete user data automatically.
- **Requirement**: User data can only be deleted if the user or admin deletes it through the UI.
- **Requirement**: No backend process, update, or modification should remove user data without user-initiated delete actions.

### Rule 3 — Responsive Design
All new changes must maintain responsiveness across all devices.
- **Requirement**: Every feature must work properly on both **Desktop** and **Mobile** views.
- **Requirement**: Layout changes must not break existing responsiveness.
- **Requirement**: UI elements must remain accessible and readable on all screen sizes.

### Rule 4 — Stability Check
Before finalizing any update or feature implementation:
- **Requirement**: Ensure the application builds successfully (e.g., `npm run build`).
- **Requirement**: Confirm that the system runs without breaking existing functionality.
- **Note**: All changes must pass the build process before the task is considered complete.

### Rule 5 — Git Commit Control
Code changes must not be committed automatically.
- **Requirement**: The AI system must not commit code to Git automatically.
- **Requirement**: Git commits should only occur when explicitly instructed by an admin/user command.

### Rule 6 — Backward Compatibility
All updates must maintain compatibility with existing system behavior.
- **Requirement**: Existing workflows must remain functional.
- **Requirement**: Updates should extend functionality rather than breaking existing logic.

### Rule 7 — Clean Development Practices
All updates must follow clean and structured development practices.
- **Requirement**: Avoid unnecessary code duplication.
- **Requirement**: Maintain consistent naming conventions (camelCase for TSX, kebab-case for CSS classes).
- **Requirement**: Ensure readability and maintainability of code.

---

**Final Instruction**: These rules are mandatory. All future AI-generated changes must strictly follow these rules unless an admin explicitly overrides them.

// src/components/BudgetDisplay.js

/**
 * Updates the budget display in the UI.
 * @param {number} newBudget - The player's current budget.
 */
export function updateBudgetDisplay(newBudget) {
  const budgetElement = document.getElementById('budget-display');
  if (budgetElement) {
    budgetElement.textContent = `Budget: ${newBudget.toLocaleString()} €`;
  }
}
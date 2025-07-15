// src/components/ESGDashboard.js

const dashboardElement = document.getElementById('esg-dashboard');

/**
 * Displays the ESG report dashboard with the final tour results.
 * @param {object} report - The final report object from ESGCalculator.
 */
export function showESGDashboard(report) {
    if (!dashboardElement) return;

    // Populate the report fields with raw numbers
    document.getElementById('report-co2').textContent = report.totalCO2.toFixed(2);
    document.getElementById('report-distance').textContent = report.totalDistance.toFixed(2);
    document.getElementById('report-duration').textContent = report.tourDuration.toFixed(2);
    document.getElementById('report-punctuality').textContent = report.punctuality;
    document.getElementById('report-cost').textContent = report.operationalCost.toFixed(2);
    document.getElementById('report-final-budget').textContent = report.finalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Make the dashboard visible
    dashboardElement.classList.remove('hidden');
}

// Add event listener to the restart button
document.getElementById('restart-button').addEventListener('click', () => {
    // Simply reload the page to restart the game
    window.location.reload();
});
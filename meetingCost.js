/**
 * meetingCost.js
 * Main logic for the Meeting Cost Calculator.
 * Features a mode switcher, a live timer with shareable links,
 * and a static calculator with a duration grid.
 */

// --- STATE & CONFIGURATION ---
let currentMode = 'live';
let timerId = null;
let liveTotalCost = 0;
let liveElapsedSeconds = 0;
let meetingStartTime = 0;
let selectedDuration = 30; // Default duration in minutes
const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 135];
const WORKING_DAYS_PER_YEAR = 252;
const HOURS_PER_DAY = 8;
const SECONDS_PER_HOUR = 3600;
const MILESTONES = [
    { cost: 15, item: 'a couple of coffees ☕️' },
    { cost: 75, item: 'a new video game 🎮' },
    { cost: 500, item: 'a PlayStation 5 🕹️' },
    { cost: 2000, item: 'a vacation to Mexico ✈️' }
];
let lastMilestoneIndex = -1;

// --- DOM ELEMENTS ---
const liveModeBtn = document.getElementById('live-mode-btn');
const calcModeBtn = document.getElementById('calc-mode-btn');
const liveTimerSection = document.getElementById('live-timer-section');
const calculatorSection = document.getElementById('calculator-section');
const liveCostDisplay = document.getElementById('live-cost-display');
const liveTimeDisplay = document.getElementById('live-time-display');
const milestoneDisplay = document.getElementById('milestone-display');
const toggleMeetingBtn = document.getElementById('toggle-meeting-btn');
const shareBtn = document.getElementById('share-btn');
const staticCostDisplay = document.getElementById('static-cost-display');
const durationGrid = document.getElementById('duration-grid');
const attendeesInput = document.getElementById('attendees-input');
const salarySlider = document.getElementById('salary-slider');
const salaryTextInput = document.getElementById('salary-text-input');

// --- INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Sets up all initial event listeners when the page loads.
 */
function initializeApp() {
    setupDurationGrid();
    liveModeBtn.addEventListener('click', () => setMode('live'));
    calcModeBtn.addEventListener('click', () => setMode('calc'));
    toggleMeetingBtn.addEventListener('click', handleToggleMeeting);
    shareBtn.addEventListener('click', handleShare);
    durationGrid.addEventListener('click', handleDurationClick);
    salarySlider.addEventListener('input', () => syncSalaryInputs('slider'));
    salaryTextInput.addEventListener('input', () => syncSalaryInputs('text'));
    attendeesInput.addEventListener('input', updateCalculations);
    handleUrlParams();
}

// --- CORE LOGIC & HANDLERS ---

/**
 * Handles the Start/Pause/Resume functionality of the live timer.
 */
function handleToggleMeeting() {
    if (timerId) {
        stopTimer();
    } else {
        if (liveTotalCost === 0) {
            meetingStartTime = Date.now();
            liveElapsedSeconds = 0;
            lastMilestoneIndex = -1;
            milestoneDisplay.textContent = '';
        }
        startTimer();
    }
}

/**
 * Generates and copies a shareable link for the live timer to the clipboard.
 */
function handleShare() {
    if (!meetingStartTime) {
        alert("Start the meeting first to generate a shareable live link.");
        return;
    }
    const params = new URLSearchParams({
        attendees: attendeesInput.value,
        salary: parseCurrency(salaryTextInput.value),
        start: meetingStartTime
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Live ticker link copied to clipboard!');
    });
}

/**
 * Checks for URL parameters on page load and initializes the timer if present.
 */
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('start')) {
        setMode('live');
        attendeesInput.value = params.get('attendees') || '5';
        const salary = parseInt(params.get('salary'), 10) || 80000;
        salarySlider.value = salary;
        syncSalaryInputs('slider');
        meetingStartTime = parseInt(params.get('start'), 10);
        const elapsedTimeMs = Date.now() - meetingStartTime;
        liveElapsedSeconds = Math.floor(elapsedTimeMs / 1000);
        const costPerSecond = calculateCostPerSecond();
        liveTotalCost = liveElapsedSeconds * costPerSecond;
        startTimer();
    }
}

/**
 * Calculates and displays the cost for the static calculator mode.
 */
function handleStaticCalculate() {
    const durationSeconds = selectedDuration * 60;
    const costPerSecond = calculateCostPerSecond();
    const totalCost = durationSeconds * costPerSecond;
    staticCostDisplay.textContent = formatCurrency(totalCost);
}

/**
 * Handles clicks on the duration grid buttons.
 * @param {Event} event - The click event object.
 */
function handleDurationClick(event) {
    const button = event.target.closest('.duration-btn');
    if (!button) return;

    selectedDuration = parseInt(button.dataset.duration, 10);
    
    document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    handleStaticCalculate();
}

// --- UI & HELPER FUNCTIONS ---

/**
 * Sets the active mode ('live' or 'calc') and updates the UI accordingly.
 * @param {'live' | 'calc'} mode - The mode to switch to.
 */
function setMode(mode) {
    currentMode = mode;
    stopTimer(); // Always stop timer when switching modes
    if (mode === 'live') {
        liveModeBtn.classList.add('active');
        calcModeBtn.classList.remove('active');
        liveTimerSection.classList.remove('hidden');
        calculatorSection.classList.add('hidden');
    } else {
        liveModeBtn.classList.remove('active');
        calcModeBtn.classList.add('active');
        liveTimerSection.classList.add('hidden');
        calculatorSection.classList.remove('hidden');
        handleStaticCalculate(); // Perform initial calculation for calc mode
    }
}

/**
 * Dynamically creates the duration buttons and adds them to the grid.
 */
function setupDurationGrid() {
    DURATION_OPTIONS.forEach(minutes => {
        const button = document.createElement('button');
        button.className = 'duration-btn';
        button.dataset.duration = minutes;
        button.textContent = formatDurationForButton(minutes);
        if (minutes === selectedDuration) {
            button.classList.add('active');
        }
        durationGrid.appendChild(button);
    });
}

/**
 * Formats minutes into a human-readable string (e.g., "1h 30m").
 * @param {number} minutes - The duration in minutes.
 * @returns {string} The formatted duration string.
 */
function formatDurationForButton(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
}

/**
 * Calculates the total cost per second based on current settings.
 * @returns {number} The cost accumulated every second.
 */
function calculateCostPerSecond() {
    const attendees = parseInt(attendeesInput.value, 10) || 0;
    const annualSalary = parseCurrency(salaryTextInput.value) || 0;
    
    if (attendees === 0 || annualSalary === 0) return 0;

    const salaryPerHour = annualSalary / WORKING_DAYS_PER_YEAR / HOURS_PER_DAY;
    return (salaryPerHour / SECONDS_PER_HOUR) * attendees;
}

/**
 * Triggers a recalculation in the static calculator when settings change.
 */
function updateCalculations() {
    if (currentMode === 'calc') {
        handleStaticCalculate();
    }
}

/**
 * Starts the live timer interval.
 */
function startTimer() {
    const costPerSecond = calculateCostPerSecond();
    if (costPerSecond === 0) {
        alert("Please set the number of attendees and salary first.");
        return;
    }

    timerId = setInterval(() => {
        liveTotalCost += costPerSecond;
        liveElapsedSeconds++;
        updateLiveDisplay();
    }, 1000);

    toggleMeetingBtn.textContent = 'Pause Meeting';
    toggleMeetingBtn.classList.replace('bg-indigo-600', 'bg-yellow-600');
    toggleMeetingBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-yellow-700');
}

/**
 * Stops the live timer interval.
 */
function stopTimer() {
    clearInterval(timerId);
    timerId = null;
    toggleMeetingBtn.textContent = liveTotalCost > 0 ? 'Resume Meeting' : 'Start Meeting';
    toggleMeetingBtn.classList.replace('bg-yellow-600', 'bg-indigo-600');
    toggleMeetingBtn.classList.replace('hover:bg-yellow-700', 'hover:bg-indigo-700');
}

/**
 * Updates the live display for cost, time, and milestones.
 */
function updateLiveDisplay() {
    liveCostDisplay.textContent = formatCurrency(liveTotalCost);
    liveTimeDisplay.textContent = formatTime(liveElapsedSeconds);
    
    const nextMilestoneIndex = lastMilestoneIndex + 1;
    if (MILESTONES[nextMilestoneIndex] && liveTotalCost >= MILESTONES[nextMilestoneIndex].cost) {
        milestoneDisplay.textContent = `This meeting could have paid for ${MILESTONES[nextMilestoneIndex].item}`;
        lastMilestoneIndex = nextMilestoneIndex;
    }
}

/**
 * Keeps the salary slider and text input synchronized.
 * @param {'slider' | 'text'} source - The input that triggered the change.
 */
function syncSalaryInputs(source) {
    if (source === 'slider') {
        salaryTextInput.value = formatCurrency(parseInt(salarySlider.value, 10), 0);
    } else {
        salarySlider.value = parseCurrency(salaryTextInput.value);
    }
    updateCalculations();
}

/**
 * Formats a number as a currency string (e.g., $1,234.56).
 * @param {number} amount - The number to format.
 * @param {number} minimumFractionDigits - Minimum decimal places to show.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount, minimumFractionDigits = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits,
    }).format(amount);
}

/**
 * Parses a formatted currency string back into a plain number.
 * @param {string} currencyString - The string to parse (e.g., "$80,000").
 * @returns {number} The parsed number.
 */
function parseCurrency(currencyString) {
    return Number(String(currencyString).replace(/[^0-9.-]+/g, ""));
}

/**
 * Formats a total number of seconds into a MM:SS string.
 * @param {number} totalSeconds - The total seconds to format.
 * @returns {string} The formatted time string (e.g., "05:32").
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
}
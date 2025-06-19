/**
 * meetingCost.js
 * Main logic for the Advanced Meeting Cost Calculator.
 * v3: Implements advanced sharing for both average and individual salary modes.
 */

// --- I. STATE & CONFIGURATION ---
let currentMode = 'live';
let calculationMode = 'average';
let salaryType = 'annual';
let timerId = null;
let liveTotalCost = 0;
let liveElapsedSeconds = 0;
let meetingStartTime = 0;
let individualSalaries = [0];

const WEEKS_PER_YEAR = 52;
const SECONDS_PER_HOUR = 3600;
const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 135];
const MILESTONES = [
    { cost: 15, item: 'a couple of coffees ☕️' },
    { cost: 75, item: 'a new video game 🎮' },
    { cost: 500, item: 'a PlayStation 5 🕹️' },
    { cost: 2000, item: 'a vacation to Mexico ✈️' }
];
let lastMilestoneIndex = -1;

// --- II. DOM ELEMENTS ---
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
const individualModeToggle = document.getElementById('individual-mode-toggle');
const averageSalaryModeDiv = document.getElementById('average-salary-mode');
const individualSalariesModeDiv = document.getElementById('individual-salaries-mode');
const attendeesInput = document.getElementById('attendees-input');
const salarySlider = document.getElementById('salary-slider');
const salaryTextInput = document.getElementById('salary-text-input');
const annualBtn = document.getElementById('annual-btn');
const hourlyBtn = document.getElementById('hourly-btn');
const individualSalariesList = document.getElementById('individual-salaries-list');
const hoursPerWeekInput = document.getElementById('hours-per-week');

// --- III. INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Sets up the application on page load.
 */
function initializeApp() {
    setupDurationGrid();
    renderIndividualSalaries();
    liveModeBtn.addEventListener('click', () => setAppMode('live'));
    calcModeBtn.addEventListener('click', () => setAppMode('calc'));
    toggleMeetingBtn.addEventListener('click', handleToggleMeeting);
    shareBtn.addEventListener('click', handleShare);
    individualModeToggle.addEventListener('change', handleCalculationModeChange);
    attendeesInput.addEventListener('input', updateCalculations);
    salarySlider.addEventListener('input', () => syncAverageSalaryInputs('slider'));
    salaryTextInput.addEventListener('input', () => syncAverageSalaryInputs('text'));
    hoursPerWeekInput.addEventListener('input', updateCalculations);
    annualBtn.addEventListener('click', () => setSalaryType('annual'));
    hourlyBtn.addEventListener('click', () => setSalaryType('hourly'));
    individualSalariesList.addEventListener('input', handleIndividualSalaryInput);
    durationGrid.addEventListener('click', handleDurationClick);
    handleUrlParams();
}

// --- IV. CORE LOGIC & HANDLERS ---

/**
 * The central calculation function. Determines cost per second based on current settings.
 * @returns {number} The total cost per second for all attendees.
 */
function calculateCostPerSecond() {
    const hoursPerWeek = parseFloat(hoursPerWeekInput.value) || 40;
    let totalHourlyRate = 0;
    if (calculationMode === 'average') {
        const attendees = parseInt(attendeesInput.value, 10) || 0;
        const annualSalary = parseCurrency(salaryTextInput.value) || 0;
        if (attendees === 0 || annualSalary === 0) return 0;
        const averageHourlyRate = annualSalary / WEEKS_PER_YEAR / hoursPerWeek;
        totalHourlyRate = averageHourlyRate * attendees;
    } else {
        individualSalaries.forEach(salary => {
            if (salary > 0) {
                totalHourlyRate += (salaryType === 'annual') ? (salary / WEEKS_PER_YEAR / hoursPerWeek) : salary;
            }
        });
    }
    return totalHourlyRate / SECONDS_PER_HOUR;
}

/**
 * Toggles the main meeting timer.
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
 * Handles clicks on the duration grid for the static calculator.
 * @param {Event} event The click event.
 */
function handleDurationClick(event) {
    const button = event.target.closest('.duration-btn');
    if (!button) return;
    document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    handleStaticCalculate();
}

/**
 * Calculates and displays the total cost for the static calculator.
 */
function handleStaticCalculate() {
    const activeButton = durationGrid.querySelector('.duration-btn.active');
    if (!activeButton) return;
    const durationMinutes = parseInt(activeButton.dataset.duration, 10);
    const durationSeconds = durationMinutes * 60;
    const costPerSecond = calculateCostPerSecond();
    const totalCost = durationSeconds * costPerSecond;
    staticCostDisplay.textContent = formatCurrency(totalCost);
}

/**
 * Handles the dynamic addition of new salary inputs.
 * @param {Event} event The input event on the salary list.
 */
function handleIndividualSalaryInput(event) {
    const target = event.target;
    const index = parseInt(target.dataset.index, 10);
    individualSalaries[index] = parseFloat(target.value) || 0;
    if (index === individualSalaries.length - 1 && individualSalaries[index] > 0) {
        individualSalaries.push(0);
        renderIndividualSalaries();
        individualSalariesList.querySelector(`[data-index="${index}"]`).focus();
    }
    updateCalculations();
}

// --- V. SHARING & URL HANDLING ---

/**
 * Generates and copies a shareable link that encodes the entire meeting state.
 */
function handleShare() {
    if (!meetingStartTime) {
        alert("Start the meeting first to generate a shareable live link.");
        return;
    }
    const params = new URLSearchParams({
        mode: calculationMode,
        hours: hoursPerWeekInput.value,
        start: meetingStartTime
    });
    if (calculationMode === 'average') {
        params.set('attendees', attendeesInput.value);
        params.set('salary', parseCurrency(salaryTextInput.value));
    } else {
        params.set('type', salaryType);
        const validSalaries = individualSalaries.filter(s => s > 0);
        if(validSalaries.length > 0) {
            params.set('salaries', validSalaries.join(','));
        }
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Live ticker link copied to clipboard!');
    });
}

/**
 * Parses URL parameters on page load to restore a shared meeting state.
 */
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('start')) return;

    setAppMode('live');
    const mode = params.get('mode') || 'average';
    hoursPerWeekInput.value = params.get('hours') || '40';
    
    if (mode === 'individual') {
        individualModeToggle.checked = true;
        handleCalculationModeChange();
        const type = params.get('type') || 'annual';
        setSalaryType(type);
        const salariesStr = params.get('salaries');
        if (salariesStr) {
            individualSalaries = salariesStr.split(',').map(s => parseFloat(s) || 0);
            individualSalaries.push(0); // Add an empty one at the end
            renderIndividualSalaries();
        }
    } else { // 'average' mode
        attendeesInput.value = params.get('attendees') || '5';
        const salary = parseInt(params.get('salary'), 10) || 80000;
        salarySlider.value = salary;
        syncAverageSalaryInputs('slider');
    }

    meetingStartTime = parseInt(params.get('start'), 10);
    const elapsedTimeMs = Date.now() - meetingStartTime;
    liveElapsedSeconds = Math.floor(elapsedTimeMs / 1000);
    const costPerSecond = calculateCostPerSecond();
    liveTotalCost = liveElapsedSeconds * costPerSecond;
    startTimer();
}

// --- VI. UI & RENDERING ---

/**
 * Sets the main application mode ('live' or 'calc').
 * @param {'live' | 'calc'} mode The mode to switch to.
 */
function setAppMode(mode) {
    currentMode = mode;
    stopTimer();
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
        handleStaticCalculate();
    }
}

/**
 * Toggles between 'average' and 'individual' salary calculation modes.
 */
function handleCalculationModeChange() {
    calculationMode = individualModeToggle.checked ? 'individual' : 'average';
    if (calculationMode === 'average') {
        averageSalaryModeDiv.classList.remove('hidden');
        individualSalariesModeDiv.classList.add('hidden');
    } else {
        averageSalaryModeDiv.classList.add('hidden');
        individualSalariesModeDiv.classList.remove('hidden');
    }
    updateCalculations();
}

/**
 * Sets the salary input type ('annual' or 'hourly').
 * @param {'annual' | 'hourly'} type The salary type.
 */
function setSalaryType(type) {
    salaryType = type;
    if (type === 'annual') {
        annualBtn.classList.add('active');
        hourlyBtn.classList.remove('active');
    } else {
        hourlyBtn.classList.add('active');
        annualBtn.classList.remove('active');
    }
    updateCalculations();
}

/**
 * Creates the grid of duration buttons for the static calculator.
 */
function setupDurationGrid() {
    DURATION_OPTIONS.forEach((minutes, index) => {
        const button = document.createElement('button');
        button.className = 'duration-btn';
        button.dataset.duration = minutes;
        button.textContent = formatDurationForButton(minutes);
        if (index === 1) button.classList.add('active'); // Default to 30 min
        durationGrid.appendChild(button);
    });
}

/**
 * Renders the list of individual salary inputs based on the state array.
 */
function renderIndividualSalaries() {
    individualSalariesList.innerHTML = '';
    individualSalaries.forEach((salary, index) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-gray-200';
        input.placeholder = `Attendee ${index + 1} Salary/Rate`;
        input.value = salary > 0 ? salary : '';
        input.dataset.index = index;
        individualSalariesList.appendChild(input);
    });
}

/**
 * Updates the live display elements every second.
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

// --- VII. TIMER & HELPER FUNCTIONS ---

/**
 * Starts the live timer interval.
 */
function startTimer() {
    const costPerSecond = calculateCostPerSecond();
    if (costPerSecond === 0) {
        alert("Please configure meeting settings (salaries, etc.) first.");
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
 * Triggers a recalculation in the static calculator when settings change.
 */
function updateCalculations() {
    if (currentMode === 'calc') {
        handleStaticCalculate();
    }
}

/**
 * Keeps the average salary slider and text input synchronized.
 * @param {'slider' | 'text'} source The input that triggered the change.
 */
function syncAverageSalaryInputs(source) {
    if (source === 'slider') {
        salaryTextInput.value = formatCurrency(parseInt(salarySlider.value, 10), 0);
    } else {
        salarySlider.value = parseCurrency(salaryTextInput.value);
    }
    updateCalculations();
}

/**
 * Formats minutes into a human-readable string (e.g., "1h 30m").
 * @param {number} minutes The duration in minutes.
 * @returns {string} The formatted duration string.
 */
function formatDurationForButton(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Formats a number as a currency string.
 * @param {number} amount The number to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount, minimumFractionDigits = 2) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits }).format(amount || 0);
}

/**
 * Parses a formatted currency string back into a plain number.
 * @param {string} currencyString The string to parse.
 * @returns {number} The parsed number.
 */
function parseCurrency(currencyString) {
    return Number(String(currencyString).replace(/[^0-9.-]+/g, ""));
}

/**
 * Formats a total number of seconds into a MM:SS string.
 * @param {number} totalSeconds The total seconds to format.
 * @returns {string} The formatted time string.
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
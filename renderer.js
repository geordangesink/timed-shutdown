let currentState = { active: false };

// Theme management
function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme() {
  const stored = localStorage.getItem('theme');
  // Default to 'system' if nothing is saved
  return stored || 'system';
}

function setTheme(theme) {
  const root = document.documentElement;
  let actualTheme = theme;
  
  if (theme === 'system') {
    actualTheme = getSystemTheme();
    // Always persist the theme choice
    localStorage.setItem('theme', 'system');
  } else {
    // Persist explicit theme choice (light or dark)
    localStorage.setItem('theme', theme);
  }
  
  root.setAttribute('data-theme', actualTheme);
  updateThemeToggleIcon(theme);
}

function updateThemeToggleIcon(theme) {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
  const currentTheme = theme === 'system' ? getSystemTheme() : theme;
  const svg = toggle.querySelector('svg');
  if (!svg) return;
  
  // Update SVG based on theme - show moon for light mode, sun for dark mode
  if (currentTheme === 'dark') {
    // Show sun icon (light mode icon, since clicking will switch to light)
    svg.innerHTML = `
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    `;
  } else {
    // Show moon icon (dark mode icon, since clicking will switch to dark)
    svg.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  }
}

function initTheme() {
  // Get stored theme, defaulting to 'system' if nothing is saved
  const storedTheme = getStoredTheme();
  
  // If no theme was ever saved, explicitly set and save 'system' as default
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'system');
  }
  
  // Apply the theme
  setTheme(storedTheme);
  
  // Listen for system theme changes (only if user is using system theme)
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      const stored = getStoredTheme();
      // Only update if user is using system theme
      if (stored === 'system') {
        setTheme('system');
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }
}

// Initialize theme on load (after DOM is ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Theme toggle button - wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = getStoredTheme();
      let nextTheme;
      
      if (current === 'system') {
        nextTheme = getSystemTheme() === 'dark' ? 'light' : 'dark';
      } else if (current === 'light') {
        nextTheme = 'dark';
      } else {
        nextTheme = 'light';
      }
      
      setTheme(nextTheme);
    });
  }
});

// DOM elements
const statusIndicator = document.getElementById('statusIndicator');
const statusInfo = document.getElementById('statusInfo');
const shutdownTimeInput = document.getElementById('shutdownTime');
const activateBtn = document.getElementById('activateBtn');
const updateBtn = document.getElementById('updateBtn');
const deactivateBtn = document.getElementById('deactivateBtn');
const messageDiv = document.getElementById('message');

// Day checkboxes
const dayCheckboxes = {
  sunday: document.getElementById('sunday'),
  monday: document.getElementById('monday'),
  tuesday: document.getElementById('tuesday'),
  wednesday: document.getElementById('wednesday'),
  thursday: document.getElementById('thursday'),
  friday: document.getElementById('friday'),
  saturday: document.getElementById('saturday')
};

// Reminder inputs
const reminderInputs = [
  document.getElementById('reminder1'),
  document.getElementById('reminder2'),
  document.getElementById('reminder3')
];

// Load initial state
window.electronAPI.getState().then(state => {
  currentState = state;
  updateUI();
});

// Listen for state updates
window.electronAPI.onStateUpdated((state) => {
  currentState = state;
  updateUI();
});

function updateUI() {
  const isActive = currentState.active || false;
  
  // Update status indicator
  if (isActive) {
    statusIndicator.textContent = 'ACTIVE';
    statusIndicator.className = 'status-indicator status-active';
    const days = currentState.days || [];
    const time = currentState.time || '';
    statusInfo.textContent = `Shutdown scheduled for ${days.join(', ')} at ${time}`;
  } else {
    statusIndicator.textContent = 'INACTIVE';
    statusIndicator.className = 'status-indicator status-inactive';
    statusInfo.textContent = 'No shutdown scheduled';
  }

  // Update buttons
  activateBtn.disabled = isActive;
  updateBtn.disabled = !isActive;
  deactivateBtn.disabled = !isActive;

  // Update form fields if active
  if (isActive) {
    if (currentState.time) {
      shutdownTimeInput.value = currentState.time;
    }
    
    // Check selected days
    Object.keys(dayCheckboxes).forEach(day => {
      dayCheckboxes[day].checked = currentState.days && currentState.days.includes(day);
    });

    // Set reminders
    if (currentState.reminders) {
      currentState.reminders.forEach((reminder, index) => {
        if (reminderInputs[index]) {
          reminderInputs[index].value = reminder || '';
        }
      });
    }
  }
}

function showMessage(text, isSuccess) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${isSuccess ? 'message-success' : 'message-error'}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

function getSelectedDays() {
  return Object.keys(dayCheckboxes)
    .filter(day => dayCheckboxes[day].checked);
}

function getReminders() {
  return reminderInputs
    .map(input => input.value.trim())
    .filter(value => value !== '');
}

function validateForm() {
  const time = shutdownTimeInput.value;
  const days = getSelectedDays();

  if (!time) {
    showMessage('Please select a shutdown time', false);
    return false;
  }

  if (days.length === 0) {
    showMessage('Please select at least one day of the week', false);
    return false;
  }

  return true;
}

// Activate button
activateBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  const config = {
    time: shutdownTimeInput.value,
    days: getSelectedDays(),
    reminders: getReminders()
  };

  const result = await window.electronAPI.activate(config);
  showMessage(result.message, result.success);
  
  if (result.success) {
    // Refresh state
    const state = await window.electronAPI.getState();
    currentState = state;
    updateUI();
  }
});

// Update button
updateBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  const config = {
    time: shutdownTimeInput.value,
    days: getSelectedDays(),
    reminders: getReminders()
  };

  const result = await window.electronAPI.update(config);
  showMessage(result.message, result.success);
  
  if (result.success) {
    // Refresh state
    const state = await window.electronAPI.getState();
    currentState = state;
    updateUI();
  }
});

// Deactivate button
deactivateBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.deactivate();
  showMessage(result.message, result.success);
  
  if (result.success) {
    // Refresh state
    const state = await window.electronAPI.getState();
    currentState = state;
    updateUI();
    
    // Clear form
    shutdownTimeInput.value = '';
    Object.keys(dayCheckboxes).forEach(day => {
      dayCheckboxes[day].checked = false;
    });
    reminderInputs.forEach(input => input.value = '');
  }
});


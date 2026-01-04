let currentState = { active: false };

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


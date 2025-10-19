/**
 * Toast Notification System
 * Clean, retro 90s-styled toast notifications
 */

let toastContainer = null;
const activeToasts = new Set();
const MAX_TOASTS = 5;

/**
 * Initialize toast container
 */
function initToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: info, warn, error, fatal
 * @param {number} duration - Duration in ms (0 = persistent)
 */
export function showToast(message, type = 'info', duration = 5000) {
  initToastContainer();

  // Remove oldest toast if at limit
  if (activeToasts.size >= MAX_TOASTS) {
    const oldest = activeToasts.values().next().value;
    if (oldest) removeToast(oldest);
  }

  const toast = createToast(message, type);
  toastContainer.appendChild(toast);
  activeToasts.add(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--show');
  });

  // Auto-dismiss if duration set
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

/**
 * Create toast element
 */
function createToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  const content = document.createElement('div');
  content.className = 'toast-content';
  content.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '×';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(content);
  toast.appendChild(closeBtn);

  return toast;
}

/**
 * Remove a toast
 */
function removeToast(toast) {
  if (!toast || !activeToasts.has(toast)) return;

  toast.classList.remove('toast--show');
  toast.classList.add('toast--hide');

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    activeToasts.delete(toast);
  }, 300);
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  activeToasts.forEach(toast => removeToast(toast));
}

/**
 * Show success toast (convenience method)
 */
export function showSuccess(message, duration = 3000) {
  return showToast(`✅ ${message}`, 'info', duration);
}

/**
 * Show error toast (convenience method)
 */
export function showError(message, duration = 5000) {
  return showToast(`❌ ${message}`, 'error', duration);
}

/**
 * Show warning toast (convenience method)
 */
export function showWarning(message, duration = 4000) {
  return showToast(`⚠️ ${message}`, 'warn', duration);
}

/**
 * Show info toast (convenience method)
 */
export function showInfo(message, duration = 3000) {
  return showToast(`ℹ️ ${message}`, 'info', duration);
}

// Add toast styles to document
const style = document.createElement('style');
style.textContent = `
  #toast-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #000080;
    border: 4px ridge #ffffff;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.5);
    font-family: 'Comic Sans MS', cursive;
    font-size: 14px;
    color: #ffff00;
    opacity: 0;
    transform: translateX(400px);
    transition: all 0.3s ease;
    cursor: pointer;
    min-width: 300px;
  }

  .toast--show {
    opacity: 1;
    transform: translateX(0);
  }

  .toast--hide {
    opacity: 0;
    transform: translateX(400px);
  }

  .toast--info {
    background: #000080;
    color: #ffff00;
    border-color: #00ffff;
  }

  .toast--warn {
    background: #ff8800;
    color: #000000;
    border-color: #ffff00;
  }

  .toast--error {
    background: #ff0000;
    color: #ffffff;
    border-color: #ffff00;
    animation: shake 0.5s ease;
  }

  .toast--fatal {
    background: #8b0000;
    color: #ffffff;
    border-color: #ff0000;
    animation: shake 0.5s ease, pulse 1s infinite;
  }

  .toast-content {
    flex: 1;
    word-wrap: break-word;
    line-height: 1.4;
  }

  .toast-close {
    background: transparent;
    border: 2px solid currentColor;
    color: inherit;
    font-size: 24px;
    line-height: 1;
    padding: 0;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    font-weight: bold;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .toast-close:hover {
    background: currentColor;
    color: #000;
    transform: rotate(90deg);
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @media (max-width: 768px) {
    #toast-container {
      left: 10px;
      right: 10px;
      top: 60px;
      max-width: none;
    }

    .toast {
      min-width: auto;
    }
  }
`;
document.head.appendChild(style);

export default {
  showToast,
  clearAllToasts,
  showSuccess,
  showError,
  showWarning,
  showInfo,
};


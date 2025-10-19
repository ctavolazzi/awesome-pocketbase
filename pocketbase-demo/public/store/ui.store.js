// store/ui.store.js - UI state management
import { Store } from './store.js';

export const uiStore = new Store('ui', {
  // Slide menu
  slideMenuOpen: false,

  // Composer
  composerOpen: false,
  composerMode: 'create', // 'create' or 'edit'
  composerPostId: null,

  // Modals
  activeModal: null, // 'auth', 'profile', 'settings', etc.

  // Toast notifications
  toasts: [],

  // Theme
  theme: 'retro', // Always retro 90s theme
  midiEnabled: localStorage.getItem('midiEnabled') === 'true',
  starfieldEnabled: localStorage.getItem('starfieldEnabled') !== 'false',

  // Loading states
  globalLoading: false,

  // Scroll
  scrollPosition: 0,
  showScrollTop: false
});

// UI events
export const UI_EVENTS = {
  SLIDE_MENU_TOGGLE: 'ui/slide_menu/toggle',
  COMPOSER_TOGGLE: 'ui/composer/toggle',
  MODAL_OPEN: 'ui/modal/open',
  MODAL_CLOSE: 'ui/modal/close',
  TOAST_ADD: 'ui/toast/add',
  TOAST_REMOVE: 'ui/toast/remove',
  THEME_CHANGE: 'ui/theme/change'
};

// Helper functions

export function toggleSlideMenu() {
  const isOpen = uiStore.getState('slideMenuOpen');
  uiStore.setState('slideMenuOpen', !isOpen);
}

export function openSlideMenu() {
  uiStore.setState('slideMenuOpen', true);
}

export function closeSlideMenu() {
  uiStore.setState('slideMenuOpen', false);
}

export function openComposer(mode = 'create', postId = null) {
  uiStore.batchUpdate({
    composerOpen: true,
    composerMode: mode,
    composerPostId: postId
  });
}

export function closeComposer() {
  uiStore.batchUpdate({
    composerOpen: false,
    composerMode: 'create',
    composerPostId: null
  });
}

export function openModal(modalName) {
  uiStore.setState('activeModal', modalName);
}

export function closeModal() {
  uiStore.setState('activeModal', null);
}

export function addToast(message, type = 'info', duration = 3000) {
  const toasts = uiStore.getState('toasts');
  const id = Date.now();

  const toast = {
    id,
    message,
    type, // 'info', 'success', 'warning', 'error'
    timestamp: Date.now()
  };

  uiStore.setState('toasts', [...toasts, toast]);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}

export function removeToast(toastId) {
  const toasts = uiStore.getState('toasts');
  uiStore.setState('toasts', toasts.filter(t => t.id !== toastId));
}

export function clearAllToasts() {
  uiStore.setState('toasts', []);
}

export function toggleMidi() {
  const enabled = uiStore.getState('midiEnabled');
  const newValue = !enabled;
  uiStore.setState('midiEnabled', newValue);
  localStorage.setItem('midiEnabled', String(newValue));
}

export function toggleStarfield() {
  const enabled = uiStore.getState('starfieldEnabled');
  const newValue = !enabled;
  uiStore.setState('starfieldEnabled', newValue);
  localStorage.setItem('starfieldEnabled', String(newValue));
}

export function setGlobalLoading(loading) {
  uiStore.setState('globalLoading', loading);
}

export function updateScrollPosition(position) {
  uiStore.batchUpdate({
    scrollPosition: position,
    showScrollTop: position > 500
  });
}

export default uiStore;


import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';

const STORAGE_KEY = 'orange_kutty_data_v1';

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return INITIAL_STATE;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Could not load state", err);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state", err);
  }
};

export const clearState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};
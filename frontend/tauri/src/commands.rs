use tauri::Window;
use crate::error::AppError;

#[tauri::command]
pub fn window_toggle_maximize(window: Window) -> Result<(), AppError> {
  if window.is_maximized().unwrap_or(false) {
    window.unmaximize().map_err(|e| AppError::Internal(e.to_string()))
  } else {
    window.maximize().map_err(|e| AppError::Internal(e.to_string()))
  }
}

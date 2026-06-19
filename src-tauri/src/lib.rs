mod profile;
mod security;
mod env_manager;

use profile::{ProfileInfo, ProfileType};
use std::fs;
use tauri::Manager;

/// Check if any local profile exists
#[tauri::command]
fn check_profile_exists(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(profile::check_any_profile_exists(&app_data_dir))
}

/// Get the currently active profile info (no sensitive data exposed)
#[tauri::command]
fn get_current_profile(app_handle: tauri::AppHandle) -> Result<ProfileInfo, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let p = profile::load_active_profile(&app_data_dir)?;
    Ok(ProfileInfo::from(&p))
}

/// Create an encrypted (password-protected) local profile.
/// Returns the 12 recovery words that the user must save.
#[tauri::command]
fn create_encrypted_profile(
    app_handle: tauri::AppHandle,
    username: String,
    password: String,
) -> Result<Vec<String>, String> {
    if username.trim().is_empty() {
        return Err("Username cannot be empty".to_string());
    }
    if password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    // Ensure the profiles directory exists
    let profiles_dir = profile::get_profiles_dir(&app_data_dir);
    fs::create_dir_all(&profiles_dir)
        .map_err(|e| format!("Failed to create profiles directory: {}", e))?;

    profile::create_encrypted_profile(&app_data_dir, &username, &password)
}

/// Create a guest (password-less) local profile as "LBM-Guest"
#[tauri::command]
fn create_guest_profile(app_handle: tauri::AppHandle) -> Result<ProfileInfo, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    // Ensure the profiles directory exists
    let profiles_dir = profile::get_profiles_dir(&app_data_dir);
    fs::create_dir_all(&profiles_dir)
        .map_err(|e| format!("Failed to create profiles directory: {}", e))?;

    profile::create_guest_profile(&app_data_dir)
}

/// Verify password for an encrypted profile login
#[tauri::command]
fn login_with_password(
    app_handle: tauri::AppHandle,
    username: String,
    password: String,
) -> Result<ProfileInfo, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let is_valid = profile::verify_profile_password(&app_data_dir, &username, &password)?;
    if !is_valid {
        return Err("Invalid password".to_string());
    }

    let p = profile::load_profile(&app_data_dir, &username)?;
    Ok(ProfileInfo::from(&p))
}

/// Save recovery codes to a file at a user-chosen location.
/// Uses the native save dialog to let the user pick the destination.
#[tauri::command]
async fn save_recovery_file(
    app_handle: tauri::AppHandle,
    username: String,
    words: Vec<String>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let filename = format!("LBM-recovery-codes-{}.txt", username);
    let content = profile::format_recovery_file(&username, &words);

    // Open native save dialog
    let file_path = app_handle
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("Text File", &["txt"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            fs::write(&path_str, &content)
                .map_err(|e| format!("Failed to save recovery file: {}", e))?;
            Ok(path_str)
        }
        None => Err("Save dialog was cancelled".to_string()),
    }
}

/// Get a list of all available profiles
#[tauri::command]
fn get_all_profiles(app_handle: tauri::AppHandle) -> Result<Vec<ProfileInfo>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    profile::get_all_profiles(&app_data_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_profile_exists,
            get_current_profile,
            get_all_profiles,
            create_encrypted_profile,
            create_guest_profile,
            login_with_password,
            save_recovery_file,
            env_manager::check_local_installations,
            env_manager::install_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

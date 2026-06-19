use crate::security;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// Profile type: encrypted (password-protected) or guest (no password)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProfileType {
    Encrypted,
    Guest,
}

/// Profile metadata stored as JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub username: String,
    pub profile_type: ProfileType,
    pub created_at: DateTime<Utc>,
    /// Base64-encoded salt for encryption key derivation (encrypted profiles only)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encryption_salt: Option<String>,
    /// Argon2id password hash in PHC format (encrypted profiles only)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password_hash: Option<String>,
    /// Base64-encoded encrypted master key, wrapped with password-derived key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_master_key: Option<String>,
    /// Base64-encoded encrypted master key, wrapped with recovery-derived key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_encrypted_master_key: Option<String>,
}

/// Serializable profile info returned to the frontend (no sensitive data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileInfo {
    pub id: String,
    pub username: String,
    pub profile_type: ProfileType,
    pub created_at: DateTime<Utc>,
}

impl From<&Profile> for ProfileInfo {
    fn from(p: &Profile) -> Self {
        ProfileInfo {
            id: p.id.clone(),
            username: p.username.clone(),
            profile_type: p.profile_type.clone(),
            created_at: p.created_at,
        }
    }
}

/// Get the profiles root directory under Tauri's app data dir
pub fn get_profiles_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("profiles")
}

/// Get a specific profile's directory
pub fn get_profile_dir(app_data_dir: &PathBuf, username: &str) -> PathBuf {
    get_profiles_dir(app_data_dir).join(username)
}

/// Get the active profile marker file path
fn get_active_profile_path(app_data_dir: &PathBuf) -> PathBuf {
    get_profiles_dir(app_data_dir).join("active_profile.json")
}

/// Check if any profile exists
pub fn check_any_profile_exists(app_data_dir: &PathBuf) -> bool {
    let active_path = get_active_profile_path(app_data_dir);
    active_path.exists()
}

/// Get a list of all available profiles
pub fn get_all_profiles(app_data_dir: &PathBuf) -> Result<Vec<ProfileInfo>, String> {
    let profiles_dir = get_profiles_dir(app_data_dir);
    if !profiles_dir.exists() {
        return Ok(Vec::new());
    }

    let mut profiles = Vec::new();
    let entries = fs::read_dir(profiles_dir).map_err(|e| format!("Failed to read profiles dir: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let profile_path = path.join("profile.json");
            if profile_path.exists() {
                if let Ok(data) = fs::read_to_string(&profile_path) {
                    if let Ok(profile) = serde_json::from_str::<Profile>(&data) {
                        profiles.push(ProfileInfo::from(&profile));
                    }
                }
            }
        }
    }

    // Sort by created_at descending (newest first)
    profiles.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(profiles)
}

/// Load the active profile metadata
pub fn load_active_profile(app_data_dir: &PathBuf) -> Result<Profile, String> {
    let active_path = get_active_profile_path(app_data_dir);
    if !active_path.exists() {
        return Err("No active profile found".to_string());
    }

    // Read the active profile pointer
    let active_data = fs::read_to_string(&active_path)
        .map_err(|e| format!("Failed to read active profile: {}", e))?;
    let active_info: serde_json::Value =
        serde_json::from_str(&active_data)
            .map_err(|e| format!("Failed to parse active profile: {}", e))?;

    let username = active_info["username"]
        .as_str()
        .ok_or("Active profile missing username")?;

    // Load the profile from its directory
    load_profile(app_data_dir, username)
}

/// Load a specific profile by username
pub fn load_profile(app_data_dir: &PathBuf, username: &str) -> Result<Profile, String> {
    let profile_path = get_profile_dir(app_data_dir, username).join("profile.json");
    if !profile_path.exists() {
        return Err(format!("Profile '{}' not found", username));
    }

    let data = fs::read_to_string(&profile_path)
        .map_err(|e| format!("Failed to read profile: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Failed to parse profile: {}", e))
}

/// Set a profile as the active profile
fn set_active_profile(app_data_dir: &PathBuf, username: &str) -> Result<(), String> {
    let active_path = get_active_profile_path(app_data_dir);
    let active_data = serde_json::json!({ "username": username });
    fs::write(&active_path, serde_json::to_string_pretty(&active_data).unwrap())
        .map_err(|e| format!("Failed to write active profile: {}", e))
}

/// Create an encrypted (password-protected) profile
///
/// Returns the generated recovery words for the user to save
pub fn create_encrypted_profile(
    app_data_dir: &PathBuf,
    username: &str,
    password: &str,
) -> Result<Vec<String>, String> {
    let profile_dir = get_profile_dir(app_data_dir, username);

    // Check if profile already exists
    if profile_dir.exists() {
        return Err(format!("Profile '{}' already exists", username));
    }

    // Create directory structure
    fs::create_dir_all(profile_dir.join("data"))
        .map_err(|e| format!("Failed to create profile directory: {}", e))?;

    // Generate master encryption key
    let master_key = security::generate_master_key();

    // Generate salt for password-based key derivation
    let salt = security::generate_salt();

    // Derive wrapping key from password
    let password_wrapping_key = security::derive_encryption_key(password, &salt)?;

    // Encrypt master key with password-derived wrapping key
    let encrypted_master_key = security::encrypt_data(&password_wrapping_key, &master_key)?;

    // Generate recovery words and derive recovery wrapping key
    let recovery_words = security::generate_recovery_words();
    let recovery_wrapping_key = security::derive_key_from_recovery(&recovery_words)?;

    // Encrypt master key with recovery-derived wrapping key
    let recovery_encrypted_master_key =
        security::encrypt_data(&recovery_wrapping_key, &master_key)?;

    // Hash password for login verification
    let password_hash = security::hash_password(password)?;

    // Create profile metadata
    let profile = Profile {
        id: Uuid::new_v4().to_string(),
        username: username.to_string(),
        profile_type: ProfileType::Encrypted,
        created_at: Utc::now(),
        encryption_salt: Some(security::encode_base64(&salt)),
        password_hash: Some(password_hash),
        encrypted_master_key: Some(security::encode_base64(&encrypted_master_key)),
        recovery_encrypted_master_key: Some(security::encode_base64(
            &recovery_encrypted_master_key,
        )),
    };

    // Save profile metadata
    let profile_path = profile_dir.join("profile.json");
    let profile_json = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;
    fs::write(&profile_path, profile_json)
        .map_err(|e| format!("Failed to write profile: {}", e))?;

    // Set as active profile
    set_active_profile(app_data_dir, username)?;

    Ok(recovery_words)
}

/// Create a guest (password-less) profile
pub fn create_guest_profile(app_data_dir: &PathBuf) -> Result<ProfileInfo, String> {
    let username = "LBM-Guest";
    let profile_dir = get_profile_dir(app_data_dir, username);

    // Check if profile already exists
    if profile_dir.exists() {
        return Err("Guest profile already exists".to_string());
    }

    // Create directory structure
    fs::create_dir_all(profile_dir.join("data"))
        .map_err(|e| format!("Failed to create profile directory: {}", e))?;

    // Create profile metadata (no encryption data)
    let profile = Profile {
        id: Uuid::new_v4().to_string(),
        username: username.to_string(),
        profile_type: ProfileType::Guest,
        created_at: Utc::now(),
        encryption_salt: None,
        password_hash: None,
        encrypted_master_key: None,
        recovery_encrypted_master_key: None,
    };

    // Save profile metadata
    let profile_path = profile_dir.join("profile.json");
    let profile_json = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;
    fs::write(&profile_path, profile_json)
        .map_err(|e| format!("Failed to write profile: {}", e))?;

    // Set as active profile
    set_active_profile(app_data_dir, username)?;

    Ok(ProfileInfo::from(&profile))
}

/// Verify a password against a stored encrypted profile
pub fn verify_profile_password(
    app_data_dir: &PathBuf,
    username: &str,
    password: &str,
) -> Result<bool, String> {
    let profile = load_profile(app_data_dir, username)?;

    match profile.profile_type {
        ProfileType::Guest => {
            // Guest profiles don't have passwords — always succeed
            Ok(true)
        }
        ProfileType::Encrypted => {
            let hash = profile
                .password_hash
                .ok_or("Encrypted profile missing password hash")?;
            security::verify_password(password, &hash)
        }
    }
}

/// Generate the recovery file content as a formatted string
pub fn format_recovery_file(username: &str, words: &[String]) -> String {
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let words_formatted = words
        .iter()
        .enumerate()
        .map(|(i, w)| format!("  {}. {}", i + 1, w))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"╔══════════════════════════════════════════════════════════╗
║         LBM — Recovery Codes / Kurtarma Kodları         ║
╠══════════════════════════════════════════════════════════╣
║  Username : {:<44}║
║  Date     : {:<44}║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Your 12 recovery words:                                 ║
║                                                          ║
{}
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  ⚠  WARNING / UYARI:                                    ║
║                                                          ║
║  • Keep these words in a safe place.                     ║
║  • Bu kelimeleri güvenli bir yerde saklayın.              ║
║  • If you lose your password, these words are the ONLY   ║
║    way to recover your encrypted data.                   ║
║  • Şifrenizi kaybederseniz, şifreli verilerinizi         ║
║    kurtarmanın TEK yolu bu kelimelerdir.                 ║
║  • NEVER share these words with anyone.                  ║
║  • Bu kelimeleri KİMSEYLE paylaşmayın.                   ║
╚══════════════════════════════════════════════════════════╝
"#,
        username,
        timestamp,
        words_formatted
            .lines()
            .map(|l| format!("║{:<58}║", l))
            .collect::<Vec<_>>()
            .join("\n")
    )
}

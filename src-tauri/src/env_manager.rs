use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvStatus {
    pub id: String,
    pub installed: bool,
    pub version: Option<String>,
}

fn get_command_output(cmd: &str, args: &[&str]) -> Option<String> {
    // In Windows, using cmd /c is often safer to resolve PATH items
    let output = Command::new("cmd")
        .args(["/c", cmd])
        .args(args)
        .output()
        .ok()?;
        
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        // Some programs output version to stderr (like old java), but mostly stdout
        if !stdout.is_empty() {
            Some(stdout)
        } else if !stderr.is_empty() {
            Some(stderr)
        } else {
            Some("Unknown Version".to_string())
        }
    } else {
        None
    }
}

fn extract_version(output: Option<String>) -> Option<String> {
    output.map(|s| {
        // Simple extraction: return the first line or try to extract semantic version
        s.lines().next().unwrap_or("").to_string()
    })
}

#[tauri::command]
pub fn check_local_installations() -> Vec<EnvStatus> {
    let mut statuses = Vec::new();

    // Check Node.js
    let node_output = get_command_output("node", &["-v"]);
    statuses.push(EnvStatus {
        id: "nodejs".to_string(),
        installed: node_output.is_some(),
        version: extract_version(node_output),
    });

    // Check Python
    let python_output = get_command_output("python", &["--version"]);
    statuses.push(EnvStatus {
        id: "python".to_string(),
        installed: python_output.is_some(),
        version: extract_version(python_output),
    });

    // Check PostgreSQL
    let psql_output = get_command_output("psql", &["-V"]);
    statuses.push(EnvStatus {
        id: "postgresql".to_string(),
        installed: psql_output.is_some(),
        version: extract_version(psql_output),
    });

    // Check SQLite
    let sqlite_output = get_command_output("sqlite3", &["--version"]);
    statuses.push(EnvStatus {
        id: "sqlite".to_string(),
        installed: sqlite_output.is_some(),
        version: extract_version(sqlite_output),
    });

    statuses
}

#[tauri::command]
pub async fn install_environment(id: String, _version: String) -> Result<String, String> {
    // Determine the winget package ID based on our internal id
    let package_id = match id.as_str() {
        "nodejs" => "OpenJS.NodeJS",
        "python" => "Python.Python.3.12", // Just using latest 3.12 for simplicity via winget, or parse version
        "postgresql" => "PostgreSQL.PostgreSQL",
        "sqlite" => "SQLite.SQLite",
        _ => return Err(format!("Unknown environment id: {}", id)),
    };

    // Use start /wait to open a new visible command prompt window for the user
    // The user can watch the installation and close the window when done.
    let cmd_str = format!("winget install -e --id {} --accept-package-agreements --accept-source-agreements & echo. & echo Kurulum tamamlandi (veya hata olustu). Kapatmak icin bir tusa basin... & pause", package_id);
    
    let output = Command::new("cmd")
        .args([
            "/c",
            "start",
            "/wait",
            "cmd",
            "/c",
            &cmd_str
        ])
        .output()
        .map_err(|e| format!("Failed to execute winget: {}", e))?;

    if output.status.success() {
        Ok(format!("Installation process finished for {}", id))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(format!("Install process failed: {}\n{}", stderr, stdout))
    }
}

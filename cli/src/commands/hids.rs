use clap::Subcommand;
use crate::config::load_config;
use crate::ui;
use colored::Colorize;
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::path::Path;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::fs::File;

#[derive(Subcommand)]
pub enum HidsAction {
    /// Create a file integrity baseline for monitored paths
    Baseline {
        /// Paths to monitor (space-separated)
        #[arg(required = true)]
        paths: Vec<String>,
    },
    /// Check file integrity against baseline
    Check,
    /// Watch for file changes and push events to gateway
    Watch {
        /// Paths to monitor (space-separated)
        #[arg(required = true)]
        paths: Vec<String>,
    },
    /// Tail a log file and push new lines to gateway
    Log {
        /// Log file path (e.g. /var/log/nginx/access.log)
        path: String,
        /// Log type for parsing (nginx, apache, php, raw)
        #[arg(long, default_value = "raw")]
        format: String,
    },
}

pub async fn run(action: HidsAction) -> anyhow::Result<()> {
    match action {
        HidsAction::Baseline { paths } => baseline(paths).await,
        HidsAction::Check => check().await,
        HidsAction::Watch { paths } => watch(paths).await,
        HidsAction::Log { path, format } => tail_log(path, format).await,
    }
}

fn hash_file(path: &Path) -> anyhow::Result<String> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn baseline_path() -> std::path::PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("/etc"))
        .join("kenari")
        .join("hids-baseline.json")
}

async fn baseline(paths: Vec<String>) -> anyhow::Result<()> {
    println!("\n🐦 {}\n", "Kenari HIDS — Creating Baseline".bold());
    let mut baseline: HashMap<String, String> = HashMap::new();
    let mut count = 0;

    for path_str in &paths {
        let path = Path::new(path_str);
        if path.is_file() {
            match hash_file(path) {
                Ok(hash) => {
                    baseline.insert(path_str.clone(), hash);
                    count += 1;
                }
                Err(e) => ui::warn(&format!("Cannot hash {}: {}", path_str, e)),
            }
        } else if path.is_dir() {
            for entry in walkdir::WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let p = entry.path().to_string_lossy().to_string();
                    match hash_file(entry.path()) {
                        Ok(hash) => { baseline.insert(p, hash); count += 1; }
                        Err(_) => {}
                    }
                }
            }
        }
    }

    let baseline_file = baseline_path();
    std::fs::create_dir_all(baseline_file.parent().unwrap())?;
    std::fs::write(&baseline_file, serde_json::to_string_pretty(&baseline)?)?;
    ui::ok(&format!("Baseline created — {} files hashed", count));
    println!("  Saved to: {}", baseline_file.display());
    Ok(())
}

async fn check() -> anyhow::Result<()> {
    println!("\n🐦 {}\n", "Kenari HIDS — Integrity Check".bold());
    let baseline_file = baseline_path();
    if !baseline_file.exists() {
        ui::err("No baseline found. Run: kenari hids baseline <paths>");
        return Ok(());
    }

    let content = std::fs::read_to_string(&baseline_file)?;
    let baseline: HashMap<String, String> = serde_json::from_str(&content)?;
    let mut changed = 0;
    let mut missing = 0;

    for (path_str, expected_hash) in &baseline {
        let path = Path::new(path_str);
        if !path.exists() {
            ui::err(&format!("MISSING: {}", path_str));
            missing += 1;
        } else {
            match hash_file(path) {
                Ok(hash) if hash != *expected_hash => {
                    ui::err(&format!("CHANGED: {}", path_str));
                    changed += 1;
                }
                Ok(_) => {}
                Err(e) => ui::warn(&format!("Cannot check {}: {}", path_str, e)),
            }
        }
    }

    if changed == 0 && missing == 0 {
        ui::ok(&format!("All {} files intact", baseline.len()));
    } else {
        println!("\n  {} changed, {} missing out of {} files", changed, missing, baseline.len());
    }
    Ok(())
}

async fn watch(paths: Vec<String>) -> anyhow::Result<()> {
    use notify::{Watcher, RecursiveMode, Event, EventKind};
    use std::sync::mpsc;

    println!("\n🐦 {}", "Kenari HIDS — Watching".bold());
    let config = load_config()?;
    ui::ok(&format!("Watching {} paths → {}", paths.len(), config.gateway));
    println!("  Paths: {}", paths.join(", "));
    println!("  Press Ctrl+C to stop\n");

    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(tx)?;

    for path in &paths {
        watcher.watch(Path::new(path), RecursiveMode::Recursive)?;
    }

    let client = reqwest::Client::new();
    for event in rx {
        if let Ok(event) = event {
            if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)) {
                for path in &event.paths {
                    let event_type = match event.kind {
                        EventKind::Modify(_) => "modified",
                        EventKind::Create(_) => "created",
                        EventKind::Remove(_) => "removed",
                        _ => "changed",
                    };
                    println!("  {} {} {}", "⚠".yellow(), event_type, path.display());

                    let _ = client.post(format!("{}/api/agent/push", config.gateway))
                        .bearer_auth(&config.token)
                        .json(&serde_json::json!({
                            "host_id": config.name,
                            "timestamp": std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default().as_secs(),
                            "metrics": {
                                "cpu_percent": 0, "memory_used_mb": 0, "memory_total_mb": 1,
                                "disk_used_gb": 0, "disk_total_gb": 1, "uptime_secs": 0
                            },
                            "events": [{"type": "file_change", "path": path.to_string_lossy(), "action": event_type}]
                        }))
                        .send().await;
                }
            }
        }
    }
    Ok(())
}

async fn tail_log(path: String, format: String) -> anyhow::Result<()> {
    use crate::parsers::nginx;

    println!("\n🐦 {}", "Kenari HIDS — Log Tail".bold());
    let config = load_config()?;
    ui::ok(&format!("Tailing {} ({}) → {}", path, format, config.gateway));
    println!("  Press Ctrl+C to stop\n");

    let mut file = File::open(&path)?;
    file.seek(SeekFrom::End(0))?;

    let client = reqwest::Client::new();
    let mut buffer: Vec<nginx::NginxLogEntry> = Vec::new();

    loop {
        let mut reader = BufReader::new(&file);
        let mut lines = Vec::new();
        let mut line = String::new();

        while reader.read_line(&mut line)? > 0 {
            let trimmed = line.trim().to_string();
            if !trimmed.is_empty() {
                if format == "nginx" {
                    if let Some(entry) = nginx::parse_line(&trimmed) {
                        // Alert on attack patterns immediately
                        for pattern in &["/.env", "/wp-admin", "/.git", "/phpmyadmin"] {
                            if entry.path.contains(pattern) {
                                println!("  {} ATTACK PATTERN: {} {} from {}", "🚨".red(), entry.method, entry.path, entry.ip);
                            }
                        }
                        if entry.status >= 500 {
                            println!("  {} 5xx: {} {} → {}", "⚠".yellow(), entry.method, entry.path, entry.status);
                        }
                        buffer.push(entry);
                    }
                } else {
                    println!("  {} {}", "→".dimmed(), trimmed);
                    lines.push(trimmed.clone());
                }
            }
            line.clear();
        }

        // Push stats every 60 entries or on raw lines
        if buffer.len() >= 60 || (!lines.is_empty() && format != "nginx") {
            let stats = if format == "nginx" {
                let s = nginx::analyze(&buffer);
                buffer.clear();
                serde_json::to_value(s).ok()
            } else {
                None
            };

            let _ = client.post(format!("{}/api/agent/push", config.gateway))
                .bearer_auth(&config.token)
                .json(&serde_json::json!({
                    "host_id": config.name,
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default().as_secs(),
                    "metrics": {
                        "cpu_percent": 0, "memory_used_mb": 0, "memory_total_mb": 1,
                        "disk_used_gb": 0, "disk_total_gb": 1, "uptime_secs": 0
                    },
                    "logs": if format == "nginx" { stats } else { Some(serde_json::json!(lines)) }
                }))
                .send().await;
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
}

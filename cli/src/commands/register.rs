use crate::config::{Config, save_config};
use crate::ui;
use colored::Colorize;

pub async fn run(
    gateway: Option<String>,
    token: Option<String>,
    name: Option<String>,
) -> anyhow::Result<()> {
    println!("\n🐦 {}\n", "Kenari Register".bold());

    let default_name = std::fs::read_to_string("/etc/hostname")
        .unwrap_or_default().trim().to_string();

    let gateway = match gateway {
        Some(g) => g,
        None => ui::prompt("Gateway URL", Some("https://monitor.yourdomain.com")),
    };
    let token = match token {
        Some(t) => t,
        None => {
            println!("  {}", format!("Get your token from: {}/agents", gateway).dimmed());
            ui::prompt("Agent token", None)
        }
    };
    let name = match name {
        Some(n) => n,
        None => ui::prompt("Host name", Some(&default_name)),
    };

    if gateway.is_empty() || token.is_empty() || name.is_empty() {
        ui::err("Gateway, token, and name are required.");
        return Ok(());
    }

    ui::info(&format!("Verifying token with {}...", gateway));
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/agent/push", gateway))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "host_id": &name, "timestamp": 0,
            "metrics": { "cpu_percent": 0, "memory_used_mb": 0, "memory_total_mb": 1,
                         "disk_used_gb": 0, "disk_total_gb": 1, "uptime_secs": 0 }
        }))
        .send()
        .await;

    match res {
        Ok(r) if r.status() == 403 => {
            ui::err("Invalid token. Check the token from your gateway's /agents page.");
            return Ok(());
        }
        Err(e) => {
            ui::warn(&format!("Could not reach gateway: {}", e));
            if !ui::confirm("Save config anyway?") { return Ok(()); }
        }
        _ => {}
    }

    let config = Config { gateway: gateway.clone(), token, name: name.clone(), interval: 30 };
    save_config(&config)?;

    println!();
    ui::ok(&format!("Registered as '{}' → {}", name, gateway));
    println!();
    println!("  Next steps:");
    println!("  {}   Install as system service", "kenari doctor --fix".dimmed());
    println!("  {}    Start in foreground", "kenari agent start".dimmed());
    println!();
    Ok(())
}

use clap::Subcommand;
use crate::config::load_config;
use crate::init::{self, InitSystem};
use crate::metrics::collect;
use crate::ui;

#[derive(Subcommand)]
pub enum AgentAction {
    /// Start the agent in the foreground
    Start,
    /// Install as a persistent system service (auto-detects init system)
    Install,
    /// Stop the system service
    Stop,
    /// Restart the system service
    Restart,
    /// Tail the service logs
    Logs,
}

pub async fn run(action: AgentAction) -> anyhow::Result<()> {
    match action {
        AgentAction::Start   => start().await,
        AgentAction::Install => crate::commands::install::run(),
        AgentAction::Stop    => service_cmd("stop"),
        AgentAction::Restart => service_cmd("restart"),
        AgentAction::Logs    => logs(),
    }
}

async fn start() -> anyhow::Result<()> {
    let config = load_config()?;
    println!("\n🐦 \x1b[1mKenari Agent\x1b[0m");
    ui::ok(&format!("Host: {} → {}", config.name, config.gateway));
    ui::ok(&format!("Interval: {}s  (Ctrl+C to stop)\n", config.interval));

    let client = reqwest::Client::new();
    loop {
        let snapshot = collect(&config.name);
        let res = client
            .post(format!("{}/api/agent/push", config.gateway))
            .bearer_auth(&config.token)
            .json(&snapshot)
            .send()
            .await;

        let ts = chrono_now();
        match res {
            Ok(r) if r.status().is_success() => {
                println!("  \x1b[32m↑\x1b[0m {} pushed (cpu {:.1}%)", ts, snapshot.metrics.cpu_percent);
            }
            Ok(r) => ui::warn(&format!("{} gateway returned {}", ts, r.status())),
            Err(e) => ui::err(&format!("{} push failed: {}", ts, e)),
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(config.interval)).await;
    }
}

fn service_cmd(action: &str) -> anyhow::Result<()> {
    let init = init::detect();
    let (cmd, args): (&str, Vec<&str>) = match (&init, action) {
        (InitSystem::Systemd, "stop")    => ("systemctl", vec!["stop", "kenari-agent"]),
        (InitSystem::Systemd, "restart") => ("systemctl", vec!["restart", "kenari-agent"]),
        (InitSystem::OpenRC,  "stop")    => ("rc-service", vec!["kenari-agent", "stop"]),
        (InitSystem::OpenRC,  "restart") => ("rc-service", vec!["kenari-agent", "restart"]),
        _ => {
            ui::warn(&format!("Service management not supported for {}", init::name(&init)));
            return Ok(());
        }
    };
    let status = std::process::Command::new("sudo").arg(cmd).args(&args).status()?;
    if status.success() {
        ui::ok(&format!("Service {}ped", action));
    }
    Ok(())
}

fn logs() -> anyhow::Result<()> {
    match init::detect() {
        InitSystem::Systemd => {
            std::process::Command::new("journalctl")
                .args(["-u", "kenari-agent", "-f", "--no-pager"])
                .status()?;
        }
        InitSystem::OpenRC => {
            std::process::Command::new("tail")
                .args(["-f", "/var/log/kenari-agent.log"])
                .status()?;
        }
        _ => ui::warn("Log tailing not supported for this init system"),
    }
    Ok(())
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let h = (secs % 86400) / 3600;
    let m = (secs % 3600) / 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

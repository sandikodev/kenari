use clap::Subcommand;
use colored::Colorize;
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
    println!("\n🐦 {}", "Kenari Agent".bold());
    ui::ok(&format!("Host: {} → {}", config.name.bold(), config.gateway));
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
                println!("  {} {} pushed (cpu {:.1}%)", "↑".green(), ts, snapshot.metrics.cpu_percent);
            }
            Ok(r) => ui::warn(&format!("{} gateway returned {}", ts, r.status())),
            Err(e) => ui::err(&format!("{} push failed: {}", ts, e)),
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(config.interval)).await;
    }
}

fn service_cmd(action: &str) -> anyhow::Result<()> {
    let init = init::detect();
    let args: Option<(&str, Vec<&str>)> = match (&init, action) {
        (InitSystem::Systemd, "stop")    => Some(("systemctl", vec!["stop", "kenari-agent"])),
        (InitSystem::Systemd, "restart") => Some(("systemctl", vec!["restart", "kenari-agent"])),
        (InitSystem::OpenRC,  "stop")    => Some(("rc-service", vec!["kenari-agent", "stop"])),
        (InitSystem::OpenRC,  "restart") => Some(("rc-service", vec!["kenari-agent", "restart"])),
        (InitSystem::Runit,   "stop")    => Some(("sv", vec!["stop", "kenari-agent"])),
        (InitSystem::Runit,   "restart") => Some(("sv", vec!["restart", "kenari-agent"])),
        (InitSystem::Dinit,   "stop")    => Some(("dinitctl", vec!["stop", "kenari-agent"])),
        (InitSystem::Dinit,   "restart") => Some(("dinitctl", vec!["restart", "kenari-agent"])),
        _ => None,
    };
    match args {
        Some((cmd, a)) => {
            std::process::Command::new("sudo").arg(cmd).args(&a).status()?;
            ui::ok(&format!("Service {}ped", action));
        }
        None => ui::warn(&format!("Service management not supported for {}", init::name(&init))),
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
        InitSystem::OpenRC | InitSystem::SysV | InitSystem::Slackware => {
            std::process::Command::new("tail")
                .args(["-f", "/var/log/kenari-agent.log"])
                .status()?;
        }
        InitSystem::Runit => {
            std::process::Command::new("sv")
                .args(["log", "kenari-agent"])
                .status()?;
        }
        _ => ui::warn("Log tailing not supported for this init system — check your init system's log directory"),
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

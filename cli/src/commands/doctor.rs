use crate::config::load_config;
use crate::init::{self, InitSystem};
use crate::metrics::collect;
use crate::ui;
use colored::Colorize;

pub async fn run(fix: bool) -> anyhow::Result<()> {
    println!("\n🐦 {}\n", "Kenari Doctor".bold());

    let mut issues: Vec<Issue> = vec![];

    // ── System ──────────────────────────────────────────────────────────────
    ui::section("System");
    let init = init::detect();
    ui::ok(&format!("OS: {} ({})", std::env::consts::OS, std::env::consts::ARCH));
    ui::ok(&format!("Init: {}", init::name(&init)));

    // ── Config ──────────────────────────────────────────────────────────────
    ui::section("Configuration");
    let config = match load_config() {
        Ok(c) => {
            ui::ok(&format!("Gateway: {}", c.gateway));
            ui::ok(&format!("Host:    {}", c.name));
            ui::ok(&format!("Interval: {}s", c.interval));
            Some(c)
        }
        Err(_) => {
            ui::err("Not configured");
            issues.push(Issue::NotRegistered);
            None
        }
    };

    // ── Connectivity ────────────────────────────────────────────────────────
    if let Some(ref cfg) = config {
        ui::section("Connectivity");
        match reqwest::Client::new()
            .get(format!("{}/status", cfg.gateway))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(r) => ui::ok(&format!("Gateway reachable (HTTP {})", r.status())),
            Err(e) => {
                ui::err(&format!("Gateway unreachable: {}", e));
                issues.push(Issue::GatewayUnreachable);
            }
        }
    }

    // ── Metrics ─────────────────────────────────────────────────────────────
    ui::section("Metrics");
    let m = collect("local");
    ui::ok(&format!("CPU:    {:.1}%", m.metrics.cpu_percent));
    ui::ok(&format!("Memory: {:.0}/{:.0} MB ({:.0}%)",
        m.metrics.memory_used_mb, m.metrics.memory_total_mb,
        m.metrics.memory_used_mb / m.metrics.memory_total_mb * 100.0));
    ui::ok(&format!("Disk:   {:.1}/{:.1} GB",
        m.metrics.disk_used_gb, m.metrics.disk_total_gb));
    ui::ok(&format!("Uptime: {}s", m.metrics.uptime_secs));

    // ── Service ─────────────────────────────────────────────────────────────
    ui::section("Agent Service");
    match init {
        InitSystem::Unknown => {
            ui::warn("Init system not detected — manual setup required");
        }
        InitSystem::Scm | InitSystem::Launchd => {
            if init::is_service_installed() {
                if init::is_service_running() {
                    ui::ok("Service running");
                } else {
                    ui::warn("Service installed but not running");
                    issues.push(Issue::ServiceStopped);
                }
            } else {
                ui::warn(&format!("Auto-install not yet supported for {}", init::name(&init)));
                ui::info("See: https://github.com/sandikodev/kenari/blob/main/docs/CLI_DESIGN.md");
            }
        }
        _ => {
            if init::is_service_installed() {
                if init::is_service_running() {
                    ui::ok("Service installed and running");
                } else {
                    ui::warn("Service installed but not running");
                    issues.push(Issue::ServiceStopped);
                }
            } else {
                ui::err("Not installed as system service");
                ui::info("Metrics will stop when this terminal closes");
                issues.push(Issue::ServiceNotInstalled);
            }
        }
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    println!();
    ui::divider();

    if issues.is_empty() {
        ui::ok("All checks passed");
        println!();
        return Ok(());
    }

    println!("  Found {} issue(s):", issues.len());
    for issue in &issues {
        println!("    {} {}", "•".yellow(), issue.description());
    }
    println!();

    if !fix {
        ui::info(&format!("Run {} to resolve automatically", "kenari doctor --fix".bold()));
        println!();
        return Ok(());
    }

    // ── Fix ─────────────────────────────────────────────────────────────────
    println!("  Fixing issues...\n");
    for issue in &issues {
        match issue {
            Issue::NotRegistered => {
                if ui::confirm("Register now?") {
                    crate::commands::register::run(None, None, None).await?;
                }
            }
            Issue::ServiceNotInstalled => {
                if ui::confirm("Install as system service? (requires root)") {
                    escalate_install()?;
                }
            }
            Issue::ServiceStopped => {
                if ui::confirm("Start the service?") {
                    start_service(&init::detect())?;
                }
            }
            Issue::GatewayUnreachable => {
                ui::warn("Cannot fix connectivity — check your gateway URL and network");
            }
        }
    }

    println!();
    Ok(())
}

enum Issue {
    NotRegistered,
    GatewayUnreachable,
    ServiceNotInstalled,
    ServiceStopped,
}

impl Issue {
    fn description(&self) -> &str {
        match self {
            Issue::NotRegistered      => "Not registered with a gateway",
            Issue::GatewayUnreachable => "Gateway is unreachable",
            Issue::ServiceNotInstalled => "Agent not installed as system service",
            Issue::ServiceStopped     => "Agent service is stopped",
        }
    }
}

fn escalate_install() -> anyhow::Result<()> {
    let bin = std::env::current_exe()?;
    let status = std::process::Command::new("sudo")
        .arg(bin)
        .args(["agent", "install"])
        .status()?;
    if status.success() {
        ui::ok("Service installed successfully");
    } else {
        ui::err("Installation failed");
    }
    Ok(())
}

fn start_service(init: &init::InitSystem) -> anyhow::Result<()> {
    let cmd = match init {
        init::InitSystem::Systemd => vec!["systemctl", "start", "kenari-agent"],
        init::InitSystem::OpenRC  => vec!["rc-service", "kenari-agent", "start"],
        _ => { ui::warn("Manual start required"); return Ok(()); }
    };
    std::process::Command::new("sudo").args(&cmd).status()?;
    Ok(())
}

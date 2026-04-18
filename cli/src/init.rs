use std::process::Command;

#[derive(Debug, PartialEq)]
pub enum InitSystem {
    Systemd,
    OpenRC,
    Runit,
    S6,
    Dinit,
    SysV,
    Slackware,
    Launchd, // macOS
    Scm,     // Windows
    Unknown,
}

pub fn detect() -> InitSystem {
    if cfg!(target_os = "macos") { return InitSystem::Launchd; }
    if cfg!(target_os = "windows") { return InitSystem::Scm; }

    // Check PID 1 comm
    if let Ok(comm) = std::fs::read_to_string("/proc/1/comm") {
        match comm.trim() {
            "systemd"    => return InitSystem::Systemd,
            "openrc-init" => return InitSystem::OpenRC,
            "runit"      => return InitSystem::Runit,
            "s6-svscan"  => return InitSystem::S6,
            "dinit"      => return InitSystem::Dinit,
            _            => {}
        }
    }

    // Fallback: check paths
    if std::path::Path::new("/run/systemd/private").exists() { return InitSystem::Systemd; }
    if std::path::Path::new("/sbin/openrc").exists()         { return InitSystem::OpenRC; }
    if std::path::Path::new("/sbin/runit").exists()          { return InitSystem::Runit; }
    if std::path::Path::new("/command/s6-svscan").exists()   { return InitSystem::S6; }
    if std::path::Path::new("/sbin/dinit").exists()          { return InitSystem::Dinit; }
    if std::path::Path::new("/etc/rc.d/rc.S").exists()       { return InitSystem::Slackware; }
    if std::path::Path::new("/etc/init.d").exists()          { return InitSystem::SysV; }

    InitSystem::Unknown
}

pub fn name(init: &InitSystem) -> &'static str {
    match init {
        InitSystem::Systemd   => "systemd",
        InitSystem::OpenRC    => "OpenRC",
        InitSystem::Runit     => "runit",
        InitSystem::S6        => "s6",
        InitSystem::Dinit     => "Dinit",
        InitSystem::SysV      => "SysV init",
        InitSystem::Slackware => "Slackware BSD-style",
        InitSystem::Launchd   => "launchd",
        InitSystem::Scm       => "Windows SCM",
        InitSystem::Unknown   => "unknown",
    }
}

pub fn is_service_installed() -> bool {
    match detect() {
        InitSystem::Systemd   => std::path::Path::new("/etc/systemd/system/kenari-agent.service").exists(),
        InitSystem::OpenRC    => std::path::Path::new("/etc/init.d/kenari-agent").exists(),
        InitSystem::Runit     => std::path::Path::new("/etc/sv/kenari-agent").exists(),
        InitSystem::S6        => std::path::Path::new("/etc/s6/sv/kenari-agent").exists(),
        InitSystem::Dinit     => std::path::Path::new("/etc/dinit.d/kenari-agent").exists(),
        InitSystem::Slackware => std::path::Path::new("/etc/rc.d/rc.kenari-agent").exists(),
        InitSystem::Launchd   => std::path::Path::new("/Library/LaunchDaemons/dev.kenari.agent.plist").exists(),
        _ => false,
    }
}

pub fn is_service_running() -> bool {
    match detect() {
        InitSystem::Systemd => {
            std::process::Command::new("systemctl")
                .args(["is-active", "--quiet", "kenari-agent"])
                .status().map(|s| s.success()).unwrap_or(false)
        }
        InitSystem::OpenRC => {
            std::process::Command::new("rc-service")
                .args(["kenari-agent", "status"])
                .status().map(|s| s.success()).unwrap_or(false)
        }
        InitSystem::Runit => {
            std::process::Command::new("sv")
                .args(["status", "kenari-agent"])
                .status().map(|s| s.success()).unwrap_or(false)
        }
        InitSystem::Dinit => {
            std::process::Command::new("dinitctl")
                .args(["status", "kenari-agent"])
                .status().map(|s| s.success()).unwrap_or(false)
        }
        _ => false,
    }
}

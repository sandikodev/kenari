use std::process::Command;

#[derive(Debug, PartialEq)]
pub enum InitSystem {
    Systemd,
    OpenRC,
    Runit,
    SysV,
    Launchd, // macOS
    Scm,     // Windows
    Unknown,
}

pub fn detect() -> InitSystem {
    // macOS
    if cfg!(target_os = "macos") {
        return InitSystem::Launchd;
    }
    // Windows
    if cfg!(target_os = "windows") {
        return InitSystem::Scm;
    }

    // Check PID 1 comm
    if let Ok(comm) = std::fs::read_to_string("/proc/1/comm") {
        let comm = comm.trim();
        if comm == "systemd" { return InitSystem::Systemd; }
        if comm == "openrc-init" { return InitSystem::OpenRC; }
        if comm == "runit" { return InitSystem::Runit; }
    }

    // Fallback: check binaries
    if std::path::Path::new("/run/systemd/private").exists() { return InitSystem::Systemd; }
    if std::path::Path::new("/sbin/openrc").exists() { return InitSystem::OpenRC; }
    if std::path::Path::new("/sbin/runit").exists() { return InitSystem::Runit; }
    if std::path::Path::new("/etc/init.d").exists() { return InitSystem::SysV; }

    InitSystem::Unknown
}

pub fn name(init: &InitSystem) -> &'static str {
    match init {
        InitSystem::Systemd => "systemd",
        InitSystem::OpenRC  => "OpenRC",
        InitSystem::Runit   => "runit",
        InitSystem::SysV    => "SysV init",
        InitSystem::Launchd => "launchd",
        InitSystem::Scm     => "Windows SCM",
        InitSystem::Unknown => "unknown",
    }
}

pub fn is_service_installed() -> bool {
    match detect() {
        InitSystem::Systemd => std::path::Path::new("/etc/systemd/system/kenari-agent.service").exists(),
        InitSystem::OpenRC  => std::path::Path::new("/etc/init.d/kenari-agent").exists(),
        InitSystem::Runit   => std::path::Path::new("/etc/sv/kenari-agent").exists(),
        InitSystem::Launchd => std::path::Path::new("/Library/LaunchDaemons/dev.kenari.agent.plist").exists(),
        _ => false,
    }
}

pub fn is_service_running() -> bool {
    match detect() {
        InitSystem::Systemd => {
            Command::new("systemctl")
                .args(["is-active", "--quiet", "kenari-agent"])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        }
        InitSystem::OpenRC => {
            Command::new("rc-service")
                .args(["kenari-agent", "status"])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        }
        _ => false,
    }
}

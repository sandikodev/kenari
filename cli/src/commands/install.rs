use crate::init::{self, InitSystem};
use std::process::Command;

pub fn run() -> anyhow::Result<()> {
    let bin = std::env::current_exe()?;
    let bin_path = bin.to_string_lossy();

    match init::detect() {
        InitSystem::Systemd   => install_systemd(&bin_path),
        InitSystem::OpenRC    => install_openrc(&bin_path),
        InitSystem::Runit     => install_runit(&bin_path),
        InitSystem::S6        => install_s6(&bin_path),
        InitSystem::Dinit     => install_dinit(&bin_path),
        InitSystem::SysV      => install_sysv(&bin_path),
        InitSystem::Slackware => install_slackware(&bin_path),
        InitSystem::Launchd   => install_launchd(&bin_path),
        InitSystem::Scm       => install_windows(),
        InitSystem::Unknown   => {
            eprintln!("✗ Could not detect init system. Manual setup required.");
            eprintln!("  See: https://github.com/sandikodev/kenari/blob/main/docs/AGENT.md");
            Ok(())
        }
    }
}

fn install_systemd(bin: &str) -> anyhow::Result<()> {
    let unit = format!(r#"[Unit]
Description=Kenari Agent — monitoring metrics pusher
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart={bin} agent start
Restart=always
RestartSec=30
User=nobody
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
"#);

    std::fs::write("/etc/systemd/system/kenari-agent.service", unit)?;
    Command::new("systemctl").args(["daemon-reload"]).status()?;
    Command::new("systemctl").args(["enable", "--now", "kenari-agent"]).status()?;
    println!("✓ Installed as systemd service");
    println!("  Status: systemctl status kenari-agent");
    println!("  Logs:   journalctl -u kenari-agent -f");
    Ok(())
}

fn install_openrc(bin: &str) -> anyhow::Result<()> {
    let script = format!(r#"#!/sbin/openrc-run
description="Kenari Agent"
command="{bin}"
command_args="agent start"
command_background=true
pidfile="/run/${{RC_SVCNAME}}.pid"
"#);

    std::fs::write("/etc/init.d/kenari-agent", script)?;
    Command::new("chmod").args(["+x", "/etc/init.d/kenari-agent"]).status()?;
    Command::new("rc-update").args(["add", "kenari-agent", "default"]).status()?;
    Command::new("rc-service").args(["kenari-agent", "start"]).status()?;
    println!("✓ Installed as OpenRC service");
    Ok(())
}

fn install_runit(bin: &str) -> anyhow::Result<()> {
    std::fs::create_dir_all("/etc/sv/kenari-agent")?;
    let run = format!("#!/bin/sh\nexec {bin} agent start\n");
    std::fs::write("/etc/sv/kenari-agent/run", run)?;
    Command::new("chmod").args(["+x", "/etc/sv/kenari-agent/run"]).status()?;
    std::os::unix::fs::symlink("/etc/sv/kenari-agent", "/var/service/kenari-agent").ok();
    println!("✓ Installed as runit service");
    Ok(())
}

fn install_sysv(bin: &str) -> anyhow::Result<()> {
    let script = format!(r#"#!/bin/sh
### BEGIN INIT INFO
# Provides:          kenari-agent
# Required-Start:    $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Description:       Kenari Agent
### END INIT INFO
case "$1" in
  start) {bin} agent start & ;;
  stop)  pkill -f "kenari agent" ;;
  *) echo "Usage: $0 {{start|stop}}" ;;
esac
"#);

    std::fs::write("/etc/init.d/kenari-agent", script)?;
    Command::new("chmod").args(["+x", "/etc/init.d/kenari-agent"]).status()?;
    Command::new("update-rc.d").args(["kenari-agent", "defaults"]).status()?;
    println!("✓ Installed as SysV init service");
    Ok(())
}

fn install_launchd(bin: &str) -> anyhow::Result<()> {
    let plist = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>dev.kenari.agent</string>
    <key>ProgramArguments</key>
    <array><string>{bin}</string><string>agent</string><string>start</string></array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
</dict>
</plist>
"#);

    let path = "/Library/LaunchDaemons/dev.kenari.agent.plist";
    std::fs::write(path, plist)?;
    Command::new("launchctl").args(["load", "-w", path]).status()?;
    println!("✓ Installed as launchd daemon");
    Ok(())
}

fn install_s6(bin: &str) -> anyhow::Result<()> {
    // s6 service directory
    let svc_dir = "/etc/s6/sv/kenari-agent";
    std::fs::create_dir_all(svc_dir)?;
    let run = format!("#!/bin/execlineb -P\n{bin} agent start\n");
    std::fs::write(format!("{svc_dir}/run"), run)?;
    Command::new("chmod").args(["+x", &format!("{svc_dir}/run")]).status()?;
    // Link to scan directory if it exists
    let scan = "/run/s6/services";
    if std::path::Path::new(scan).exists() {
        std::os::unix::fs::symlink(svc_dir, format!("{scan}/kenari-agent")).ok();
        Command::new("s6-svscanctl").args(["-a", scan]).status().ok();
    }
    println!("✓ Installed as s6 service");
    println!("  Logs: s6-svstat /etc/s6/sv/kenari-agent");
    Ok(())
}

fn install_dinit(bin: &str) -> anyhow::Result<()> {
    let service = format!(
        "type = process\ncommand = {bin} agent start\nrestart = true\nwants-network = true\n"
    );
    std::fs::write("/etc/dinit.d/kenari-agent", service)?;
    Command::new("dinitctl").args(["enable", "kenari-agent"]).status()?;
    Command::new("dinitctl").args(["start", "kenari-agent"]).status()?;
    println!("✓ Installed as Dinit service");
    println!("  Status: dinitctl status kenari-agent");
    Ok(())
}

fn install_slackware(bin: &str) -> anyhow::Result<()> {
    let script = format!(
        "#!/bin/sh\n# Kenari Agent\ncase \"$1\" in\n  start)\n    echo \"Starting Kenari agent...\"\n    {bin} agent start &\n    ;;\n  stop)\n    echo \"Stopping Kenari agent...\"\n    pkill -f \"kenari agent\"\n    ;;\n  restart)\n    $0 stop; sleep 1; $0 start\n    ;;\n  *)\n    echo \"Usage: $0 {{start|stop|restart}}\"\n    ;;\nesac\n"
    );
    std::fs::write("/etc/rc.d/rc.kenari-agent", script)?;
    Command::new("chmod").args(["+x", "/etc/rc.d/rc.kenari-agent"]).status()?;
    println!("✓ Installed as Slackware rc.d service");
    println!("  Add to /etc/rc.d/rc.local: /etc/rc.d/rc.kenari-agent start");
    println!("  Start now: /etc/rc.d/rc.kenari-agent start");
    Ok(())
}

fn install_windows() -> anyhow::Result<()> {
    println!("Windows service installation coming soon.");
    println!("For now, add kenari to Task Scheduler:");
    println!("  kenari agent start");
    Ok(())
}

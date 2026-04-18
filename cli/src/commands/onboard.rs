use crate::config::load_config;
use crate::ui;
use colored::Colorize;

pub async fn run() -> anyhow::Result<()> {
    println!("\n🐦 {} — A canary for your monitoring gateway\n", "Kenari".bold());

    match load_config() {
        Ok(cfg) => {
            println!("  Registered as {} → {}\n", cfg.name.bold(), cfg.gateway);
            println!("  {}       Show current metrics", "kenari status".dimmed());
            println!("  {}         Push metrics once", "kenari push".dimmed());
            println!("  {}  Start background agent", "kenari agent start".dimmed());
            println!("  {}       Diagnose & fix issues", "kenari doctor".dimmed());
        }
        Err(_) => {
            println!("  Not registered yet.\n");
            println!("  {}     Set up this host", "kenari register".dimmed());
            println!("  {}       Diagnose system", "kenari doctor".dimmed());
            println!();
            if ui::confirm("Register now?") {
                crate::commands::register::run(None, None, None).await?;
            }
        }
    }

    println!();
    Ok(())
}

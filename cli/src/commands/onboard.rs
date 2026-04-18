use crate::config::load_config;
use crate::ui;

pub async fn run() -> anyhow::Result<()> {
    println!("\n🐦 \x1b[1mKenari\x1b[0m — A canary for your monitoring gateway\n");

    match load_config() {
        Ok(cfg) => {
            println!("  Registered as \x1b[1m{}\x1b[0m → {}\n", cfg.name, cfg.gateway);
            println!("  \x1b[2mkenari status\x1b[0m       Show current metrics");
            println!("  \x1b[2mkenari push\x1b[0m         Push metrics once");
            println!("  \x1b[2mkenari agent start\x1b[0m  Start background agent");
            println!("  \x1b[2mkenari doctor\x1b[0m       Diagnose & fix issues");
        }
        Err(_) => {
            println!("  Not registered yet.\n");
            println!("  \x1b[2mkenari register\x1b[0m     Set up this host");
            println!("  \x1b[2mkenari doctor\x1b[0m       Diagnose system");
            println!();
            if ui::confirm("Register now?") {
                crate::commands::register::run(None, None, None).await?;
            }
        }
    }

    println!();
    Ok(())
}

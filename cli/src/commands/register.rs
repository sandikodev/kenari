use crate::config::{Config, save_config};

pub async fn run(gateway: String, token: String, name: String) -> anyhow::Result<()> {
    println!("🐦 Registering with {}...", gateway);
    let config = Config { gateway, token, name: name.clone(), interval: 30 };
    save_config(&config)?;
    println!("✓ Registered as '{}'. Run `kenari agent start` to begin.", name);
    Ok(())
}

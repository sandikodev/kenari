use crate::config::load_config;
use crate::metrics::collect;

pub async fn run() -> anyhow::Result<()> {
    let config = load_config()?;
    let snapshot = collect(&config.name);
    let client = reqwest::Client::new();
    client
        .post(format!("{}/api/agent/push", config.gateway))
        .bearer_auth(&config.token)
        .json(&snapshot)
        .send()
        .await?;
    println!("✓ Pushed metrics for '{}'", config.name);
    Ok(())
}

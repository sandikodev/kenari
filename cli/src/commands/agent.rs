use clap::Subcommand;
use crate::config::load_config;
use crate::metrics::collect;

#[derive(Subcommand)]
pub enum AgentAction {
    /// Start the metrics push loop
    Start,
}

pub async fn run(action: AgentAction) -> anyhow::Result<()> {
    match action {
        AgentAction::Start => start().await,
    }
}

async fn start() -> anyhow::Result<()> {
    let config = load_config()?;
    println!("🐦 Kenari agent started — pushing to {}", config.gateway);
    println!("   Host: {} · Interval: {}s", config.name, config.interval);

    let client = reqwest::Client::new();
    loop {
        let snapshot = collect(&config.name);
        let res = client
            .post(format!("{}/api/agent/push", config.gateway))
            .bearer_auth(&config.token)
            .json(&snapshot)
            .send()
            .await;

        match res {
            Ok(r) if r.status().is_success() => print!("."),
            Ok(r) => eprintln!("\n⚠ Gateway returned {}", r.status()),
            Err(e) => eprintln!("\n✗ Push failed: {}", e),
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(config.interval)).await;
    }
}

use clap::{Parser, Subcommand};

mod commands;
mod metrics;
mod config;

#[derive(Parser)]
#[command(name = "kenari", about = "A canary for your monitoring gateway", version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Register this host with a Kenari gateway
    Register {
        #[arg(long)] gateway: String,
        #[arg(long)] token: String,
        #[arg(long, default_value_t = hostname())] name: String,
    },
    /// Start the agent (push metrics loop)
    Agent {
        #[command(subcommand)]
        action: commands::agent::AgentAction,
    },
    /// Push a one-time metric snapshot
    Push,
    /// Show current metrics
    Status,
}

fn hostname() -> String {
    std::fs::read_to_string("/etc/hostname")
        .unwrap_or_default()
        .trim()
        .to_string()
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Register { gateway, token, name } => {
            commands::register::run(gateway, token, name).await
        }
        Commands::Agent { action } => commands::agent::run(action).await,
        Commands::Push => commands::push::run().await,
        Commands::Status => commands::status::run(),
    }
}

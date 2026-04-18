use clap::{Parser, Subcommand};

mod commands;
mod config;
mod init;
mod metrics;
mod ui;

#[derive(Parser)]
#[command(
    name = "kenari",
    about = "🐦 A canary for your monitoring gateway",
    long_about = "Kenari agent — monitors your host and pushes metrics to your Kenari gateway.\n\nGet started: kenari register",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Interactive setup wizard — register this host with a gateway
    Register {
        /// Gateway URL (prompted if omitted)
        #[arg(long)]
        gateway: Option<String>,
        /// Agent token from the gateway UI (prompted if omitted)
        #[arg(long)]
        token: Option<String>,
        /// Host name (defaults to system hostname)
        #[arg(long)]
        name: Option<String>,
    },

    /// Diagnose system health and configuration
    Doctor {
        /// Automatically fix detected issues
        #[arg(long, short)]
        fix: bool,
    },

    /// Show current system metrics
    Status,

    /// Push a one-time metric snapshot to the gateway
    Push,

    /// Manage the background agent service
    Agent {
        #[command(subcommand)]
        action: commands::agent::AgentAction,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        None => {
            // No subcommand — show friendly onboarding
            commands::onboard::run().await
        }
        Some(Commands::Register { gateway, token, name }) => {
            commands::register::run(gateway, token, name).await
        }
        Some(Commands::Doctor { fix }) => commands::doctor::run(fix).await,
        Some(Commands::Status) => commands::status::run(),
        Some(Commands::Push) => commands::push::run().await,
        Some(Commands::Agent { action }) => commands::agent::run(action).await,
    }
}

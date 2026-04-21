use clap::{CommandFactory, Parser, Subcommand};
use clap_complete::Shell;

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
        #[arg(long)] gateway: Option<String>,
        #[arg(long)] token: Option<String>,
        #[arg(long)] name: Option<String>,
    },
    /// Diagnose system health and configuration
    Doctor {
        #[arg(long, short)] fix: bool,
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
    /// Host-based intrusion detection (file integrity, log collection)
    Hids {
        #[command(subcommand)]
        action: commands::hids::HidsAction,
    },
    /// Generate shell completion scripts
    Completions {
        /// Shell to generate completions for
        #[arg(value_enum)]
        shell: Shell,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env from current directory (dev convenience — silently ignored if not found)
    dotenvy::dotenv().ok();
    let cli = Cli::parse();

    match cli.command {
        None => commands::onboard::run().await,
        Some(Commands::Register { gateway, token, name }) => {
            commands::register::run(gateway, token, name).await
        }
        Some(Commands::Doctor { fix }) => commands::doctor::run(fix).await,
        Some(Commands::Status) => commands::status::run(),
        Some(Commands::Push) => commands::push::run().await,
        Some(Commands::Agent { action }) => commands::agent::run(action).await,
        Some(Commands::Hids { action }) => commands::hids::run(action).await,
        Some(Commands::Completions { shell }) => {
            clap_complete::generate(shell, &mut Cli::command(), "kenari", &mut std::io::stdout());
            Ok(())
        }
    }
}

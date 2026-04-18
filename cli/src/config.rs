use serde::{Deserialize, Serialize};
use anyhow::Context;

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub gateway: String,
    pub token: String,
    pub name: String,
    pub interval: u64,
}

fn config_path() -> std::path::PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("/etc"))
        .join("kenari")
        .join("config.toml")
}

pub fn save_config(config: &Config) -> anyhow::Result<()> {
    let path = config_path();
    std::fs::create_dir_all(path.parent().unwrap())?;
    std::fs::write(&path, toml::to_string(config)?)?;
    Ok(())
}

pub fn load_config() -> anyhow::Result<Config> {
    let path = config_path();
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("Config not found. Run `kenari register` first."))?;
    Ok(toml::from_str(&content)?)
}

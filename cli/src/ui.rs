use colored::Colorize;
use std::io::{self, Write};

pub fn ok(msg: &str)   { println!("  {} {}", "✓".green().bold(), msg); }
pub fn err(msg: &str)  { println!("  {} {}", "✗".red().bold(), msg); }
pub fn warn(msg: &str) { println!("  {} {}", "⚠".yellow().bold(), msg); }
pub fn info(msg: &str) { println!("  {} {}", "→".blue(), msg); }
pub fn section(title: &str) { println!("\n{}", title.bold()); }
pub fn divider() { println!("{}", "─".repeat(44).dimmed()); }

pub fn prompt(question: &str, default: Option<&str>) -> String {
    match default {
        Some(d) => print!("  {} [{}]: ", question, d.dimmed()),
        None    => print!("  {}: ", question),
    }
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let trimmed = input.trim().to_string();
    if trimmed.is_empty() { default.unwrap_or("").to_string() } else { trimmed }
}

pub fn confirm(question: &str) -> bool {
    print!("  {} [Y/n]: ", question);
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let t = input.trim().to_lowercase();
    t.is_empty() || t == "y" || t == "yes"
}

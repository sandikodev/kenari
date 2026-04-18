use std::io::{self, Write};

pub fn ok(msg: &str)   { println!("  \x1b[32m✓\x1b[0m {}", msg); }
pub fn err(msg: &str)  { println!("  \x1b[31m✗\x1b[0m {}", msg); }
pub fn warn(msg: &str) { println!("  \x1b[33m⚠\x1b[0m {}", msg); }
pub fn info(msg: &str) { println!("  \x1b[34m→\x1b[0m {}", msg); }
pub fn section(title: &str) { println!("\n\x1b[1m{}\x1b[0m", title); }
pub fn divider() { println!("{}", "─".repeat(44)); }

pub fn prompt(question: &str, default: Option<&str>) -> String {
    match default {
        Some(d) => print!("  {} [{}]: ", question, d),
        None    => print!("  {}: ", question),
    }
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let trimmed = input.trim().to_string();
    if trimmed.is_empty() {
        default.unwrap_or("").to_string()
    } else {
        trimmed
    }
}

pub fn confirm(question: &str) -> bool {
    print!("  {} [Y/n]: ", question);
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let t = input.trim().to_lowercase();
    t.is_empty() || t == "y" || t == "yes"
}

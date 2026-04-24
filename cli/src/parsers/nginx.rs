use std::collections::HashMap;

#[derive(Debug, serde::Serialize)]
pub struct NginxLogEntry {
    pub ip: String,
    pub method: String,
    pub path: String,
    pub status: u16,
    pub bytes: u64,
    pub user_agent: String,
}

#[derive(Debug, serde::Serialize)]
pub struct NginxStats {
    pub total_requests: u64,
    pub status_4xx: u64,
    pub status_5xx: u64,
    pub top_ips: Vec<(String, u64)>,
    pub suspicious_paths: Vec<String>,
    pub attack_patterns: Vec<String>,
}

// Known attack path patterns
const ATTACK_PATTERNS: &[&str] = &[
    "/.env", "/wp-admin", "/phpmyadmin", "/.git",
    "/backup", "/admin", "/shell", "/.aws",
    "/api/swagger", "/actuator", "/../",
    "/etc/passwd", "/proc/self",
];

pub fn parse_line(line: &str) -> Option<NginxLogEntry> {
    // Combined log format: IP - - [date] "METHOD PATH HTTP/x.x" STATUS BYTES "referer" "ua"
    let parts: Vec<&str> = line.splitn(10, ' ').collect();
    if parts.len() < 9 { return None; }

    let ip = parts[0].to_string();
    let request = parts[6].trim_matches('"');
    let req_parts: Vec<&str> = request.splitn(3, ' ').collect();
    if req_parts.len() < 2 { return None; }

    let method = req_parts[0].to_string();
    let path = req_parts[1].to_string();
    let status: u16 = parts[8].parse().ok()?;
    let bytes: u64 = parts[9].split_whitespace().next()?.parse().unwrap_or(0);
    let user_agent = parts.get(11).unwrap_or(&"-").trim_matches('"').to_string();

    Some(NginxLogEntry { ip, method, path, status, bytes, user_agent })
}

pub fn analyze(entries: &[NginxLogEntry]) -> NginxStats {
    let mut ip_counts: HashMap<String, u64> = HashMap::new();
    let mut status_4xx = 0u64;
    let mut status_5xx = 0u64;
    let mut suspicious = Vec::new();
    let mut attacks = Vec::new();

    for entry in entries {
        *ip_counts.entry(entry.ip.clone()).or_insert(0) += 1;
        if entry.status >= 400 && entry.status < 500 { status_4xx += 1; }
        if entry.status >= 500 { status_5xx += 1; }

        for pattern in ATTACK_PATTERNS {
            if entry.path.contains(pattern) {
                let msg = format!("{} {} from {}", entry.method, entry.path, entry.ip);
                if !attacks.contains(&msg) { attacks.push(msg); }
            }
        }

        // Flag scanner-like behavior: many 404s from same IP
        if entry.status == 404 {
            let count = ip_counts.get(&entry.ip).copied().unwrap_or(0);
            if count > 10 {
                let flag = format!("{} ({}+ requests)", entry.ip, count);
                if !suspicious.contains(&flag) { suspicious.push(flag); }
            }
        }
    }

    let mut top_ips: Vec<(String, u64)> = ip_counts.into_iter().collect();
    top_ips.sort_by(|a, b| b.1.cmp(&a.1));
    top_ips.truncate(10);

    NginxStats {
        total_requests: entries.len() as u64,
        status_4xx,
        status_5xx,
        top_ips,
        suspicious_paths: suspicious,
        attack_patterns: attacks,
    }
}

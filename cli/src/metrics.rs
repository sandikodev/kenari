use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Serialize, Deserialize)]
pub struct MetricSnapshot {
    pub host_id: String,
    pub timestamp: u64,
    pub metrics: Metrics,
}

#[derive(Serialize, Deserialize)]
pub struct Metrics {
    pub cpu_percent: f64,
    pub memory_used_mb: f64,
    pub memory_total_mb: f64,
    pub disk_used_gb: f64,
    pub disk_total_gb: f64,
    pub uptime_secs: u64,
}

pub fn collect(host_id: &str) -> MetricSnapshot {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu = sys.global_cpu_usage() as f64;
    let mem_used = sys.used_memory() as f64 / 1024.0 / 1024.0;
    let mem_total = sys.total_memory() as f64 / 1024.0 / 1024.0;

    let (disk_used, disk_total) = {
        use sysinfo::Disks;
        let disks = Disks::new_with_refreshed_list();
        let used: u64 = disks.iter().map(|d| d.total_space() - d.available_space()).sum();
        let total: u64 = disks.iter().map(|d| d.total_space()).sum();
        (used as f64 / 1e9, total as f64 / 1e9)
    };

    MetricSnapshot {
        host_id: host_id.to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        metrics: Metrics {
            cpu_percent: cpu,
            memory_used_mb: mem_used,
            memory_total_mb: mem_total,
            disk_used_gb: disk_used,
            disk_total_gb: disk_total,
            uptime_secs: System::uptime(),
        },
    }
}

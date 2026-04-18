use crate::metrics::collect;

pub fn run() -> anyhow::Result<()> {
    let m = collect("local");
    println!("CPU:    {:.1}%", m.metrics.cpu_percent);
    println!("Memory: {:.0} / {:.0} MB ({:.1}%)",
        m.metrics.memory_used_mb, m.metrics.memory_total_mb,
        m.metrics.memory_used_mb / m.metrics.memory_total_mb * 100.0);
    println!("Disk:   {:.1} / {:.1} GB",
        m.metrics.disk_used_gb, m.metrics.disk_total_gb);
    println!("Uptime: {}s", m.metrics.uptime_secs);
    Ok(())
}

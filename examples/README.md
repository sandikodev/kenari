# Kenari — Examples

Sample configurations for common deployment scenarios.

## Files

| File/Directory | Description |
|----------------|-------------|
| `docker-compose.full.yml` | Full stack: gateway + Kuma + Grafana + Prometheus + Loki + Blackbox |
| `nginx/monitor.conf` | nginx reverse proxy with SSL, auth guard, WebSocket support |
| `grafana/provisioning/` | Grafana datasource provisioning (Prometheus + Loki) |
| `prometheus/prometheus.yml` | Prometheus config with Blackbox Exporter for HTTP probing |

## Usage

### Full stack with Grafana + Prometheus

```bash
cp examples/docker-compose.full.yml docker-compose.yml
cp examples/grafana/provisioning grafana-provisioning
cp examples/prometheus/prometheus.yml prometheus/prometheus.yml
# Edit prometheus.yml to add your target URLs
docker compose --env-file .env.production up -d
```

### Minimal (gateway + Kuma only)

Use the root `docker-compose.yml` — it contains only the core services.

### nginx

Copy `examples/nginx/monitor.conf` to your nginx conf.d directory.
Replace `monitor.yourdomain.com` with your actual domain.

## Notes

- The `prometheus.yml` in this directory uses generic placeholder URLs.
  Replace them with your actual service URLs.
- Grafana datasource URLs use generic container names (`kenari-prometheus`, `kenari-loki`).
  If you use custom container names, update accordingly.
- The nginx config assumes Uptime Kuma is patched with `UPTIME_KUMA_BASE_PATH=/uptime`.
  See [sandikodev/uptime-kuma](https://github.com/sandikodev/uptime-kuma) for the patched version.

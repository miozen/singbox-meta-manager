INSERT INTO templates (id, name, raw_config) VALUES (
  'router',
  '软路由 OpenWrt',
  '{
    "$schema": "https://sing-box.sagernet.org/schema.json",
    "log": {
      "level": "info",
      "timestamp": true
    },
    "dns": {
      "servers": [],
      "rules": []
    },
    "inbounds": [],
    "outbounds": [],
    "route": {
      "rules": []
    }
  }'
);

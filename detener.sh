#!/bin/bash
cd "$(dirname "$0")"
echo "Deteniendo ContaFlow ERP..."
sudo docker compose -f docker-compose.local.yml down
echo "ContaFlow detenido."

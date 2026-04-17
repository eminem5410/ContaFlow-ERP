#!/bin/bash
cd "$(dirname "$0")"
echo "Levantando ContaFlow ERP..."
sudo docker compose -f docker-compose.local.yml up -d
echo ""
echo "Esperando servicios..."
sleep 5
sudo docker compose -f docker-compose.local.yml ps
echo ""
echo "ContaFlow listo! Abrí Firefox en: http://localhost:3000"

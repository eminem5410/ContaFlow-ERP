# ContaFlow ERP - Guia Ubuntu 22.04
## Credenciales
Admin: admin@empresademo.com.ar / admin123
Contador: contador@empresademo.com.ar / contador123
Viewer: viewer@empresademo.com.ar / viewer123
URL: http://localhost:3000
## Comandos basicos
./iniciar.sh  - Levantar
./detener.sh   - Detener
sudo docker compose -f docker-compose.local.yml ps
sudo docker compose -f docker-compose.local.yml logs app --tail 50
sudo docker compose -f docker-compose.local.yml restart app
sudo docker compose -f docker-compose.local.yml up -d --build app
## Base de datos
sudo docker compose -f docker-compose.local.yml exec -T postgres psql -U contaflow -d contaflow_erp -c "CONSULTA"
sudo docker compose -f docker-compose.local.yml exec -T postgres pg_dump -U contaflow contaflow_erp > backup.sql
sudo docker compose -f docker-compose.local.yml exec -T postgres psql -U contaflow -d contaflow_erp < backup.sql
## Datos de prueba
sudo docker compose -f docker-compose.local.yml exec -T postgres psql -U contaflow -d contaflow_erp < seed-datos-prueba.sql
## Problemas comunes
- Postgres unhealthy: sudo docker compose -f docker-compose.local.yml restart
- Error 500: verificar DATABASE_URL use postgresql:// en .env
- Docker cuelga: sudo systemctl restart docker
## 9 contenedores
app backend postgres redis nginx kafka zookeeper mailpit pg-backup

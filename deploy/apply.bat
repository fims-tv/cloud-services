
echo ##########################
echo Execute Terraform apply
echo ##########################

terraform apply || exit /b 1

terraform output | node ../service-registry/register.js

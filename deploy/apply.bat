
echo ##########################
echo Execute Terraform apply
echo ##########################

terraform apply

terraform output | node ../service-registry/register.js

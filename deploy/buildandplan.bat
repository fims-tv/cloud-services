echo #########################
echo Master Build Script 
echo #########################

echo #########################
echo Build service registry project 
cd ..\service-registry
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build job repository project 
cd ..\job-repository
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build job processor service project 
cd ..\job-processor-service
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build ame service  project
cd ..\ame-service
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build transform service  project
cd ..\transform-service
node installer.js package
cd ..\deploy
echo #########################

echo #########################
echo Build media repository  project
cd ..\media-repository
node build.js
cd ..\deploy
echo #########################


echo #########################
echo Execute Terraform Plan
echo #########################

terraform plan

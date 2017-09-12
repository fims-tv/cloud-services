@echo off

echo #########################
echo Master Build Script 
echo #########################

echo #########################
echo Build service registry project 
cd ..\service-registry
call npm update
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build job repository project 
cd ..\job-repository
call npm update
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build job processor service project 
cd ..\job-processor-service
call npm update
node build.js
cd ..\deploy
echo #########################

echo #########################
echo Build ame service  project
cd ..\ame-service
call npm update
node build.js
cd ..\deploy
echo #########################

rem echo #########################
rem echo Build transform service  project
rem cd ..\transform-service
rem call npm update
rem node installer.js package
rem cd ..\deploy
rem echo #########################

echo #########################
echo Build media repository  project
cd ..\media-repository
call npm update
node build.js
cd ..\deploy
echo #########################


echo #########################
echo Build trigger lambda for workflow
cd ..\workflow\trigger-workfow-from-lambda
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow validate metadata lambda step
cd ..\workflow\validate-metadata
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow copy to private bucket lambda step
cd ..\workflow\copy-essence-to-private-bucket
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow remove essence from public bucket lambda step
cd ..\workflow\remove-essence-from-public-bucket
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow create ame job lambda step
cd ..\workflow\create-ame-job
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow create transform job extract thumbnail lambda step
cd ..\workflow\create-transform-job-extract-thumbnail
call npm update
node build.js
cd ..\..\deploy
echo #########################

echo #########################
echo Build workflow create transform job create proxy lambda step
cd ..\workflow\create-transform-job-create-proxy
call npm update
node build.js
cd ..\..\deploy
echo #########################


echo #########################
echo Execute Terraform Plan
echo #########################

terraform plan

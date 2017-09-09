var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

exports.handler = (event, context, callback) => {
    // TODO implement


var params = {

stateMachineArn: process.env.STATE_MACHINE_ARN,
  
  input: JSON.stringify(event) //,
  //name: 'STRING_VALUE'
};
stepfunctions.startExecution(params, function(err, data) {
  if (err) {
         console.log(err, err.stack); // an error occurred
         callback(err);
  }   
  else   {
      console.log(data);
      
        callback(null, data);
  }
  
  // successful response.
});
    
     
    
};
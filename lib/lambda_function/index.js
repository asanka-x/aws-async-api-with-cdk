exports.handler = async function (event, context) {
    console.log("SQS RECORDS: \n" + JSON.stringify(event, null, 2));
    return context.logStreamName;
}
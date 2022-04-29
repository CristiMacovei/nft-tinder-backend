require('dotenv').config()
const aws = require('aws-sdk')

aws.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'eu-central-1'
})

const s3 = new aws.S3()

s3.listObjectsV2({
  Bucket: process.env.BUCKET_NAME,
  Prefix: 'root-3/active/1.png',
  MaxKeys: 1
})
.promise()
.then(obj => {
  console.log(obj)
})
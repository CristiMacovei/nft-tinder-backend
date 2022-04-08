require('dotenv').config()
const aws = require('aws-sdk')
const { Sequelize, DataTypes, Op } = require('sequelize')
const express = require('express')
const cors = require('cors')
const sha256 = require('crypto-js/sha256')
const multer = require('multer');
const { memoryStorage } = require('multer')
const fs = require('fs')

// const upload = multer({
//   storage: multer.memoryStorage()
// });

const upload = multer({
  dest: './uploads/',
})

const app = express()

app.use(express.json())
app.use(cors())

aws.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'eu-central-1'
})

const s3 = new aws.S3()

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './users.sqlite3'
})

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  numImagesUploaded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  numImagesKept: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  numImagesDiscarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
})

const isNull = (thing) => {
  return typeof thing === 'undefined' || thing === null;
}

const isNullOrEmptyString = (thing) => {
  return typeof thing === 'undefined' || thing === null || thing.length === 0;
}

const findUser = (username, password) => {
  return User.findOne({
    where: {
      username
    }
  })
}

const findUserByToken = (token, shouldBeVerified = false) => {
  let query = {
    token
  }
  
  if (shouldBeVerified)
    query['isVerified'] = true

  return User.findOne({
    where: query
  })
}

const main = async () => {
  try {
    await sequelize.authenticate()
    await User.sync()
  } catch (err) {
    console.log(err) 
  }

  app.listen('15623', () => {
    console.log('a pornit artifica')
  })


  app.get('/', (res, res) => {
    res.json({
      'message': 'Hello World'
    })
  })

  app.post('/signup', async (req, res) => {
    const username = req.body.username
    if (isNullOrEmptyString(username)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const password = req.body.password
    if (isNullOrEmptyString(password)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const alreadyExistingUser = await findUser(username)

    if (!isNull(alreadyExistingUser)) {
      res.send({
        'status': 'error',
        'message': 'already existing'
      })

      return
    }

    console.log('ce face cainele')

    const token = sha256(username + "." + password + "@" + Date.now().toString()).toString()

    const newUser = await User.create({
      username,
      password,
      token
    })

    res.json({
      'status': 'success',
      'user': newUser
    })
  })

  app.post('/login', async (req, res) => {
    const username = req.body.username 
    if (isNullOrEmptyString(username)) {
      res.send({
        'status': 'error',
        'message': 'invalid username'
      })

      return
    }

    const password = req.body.password 
    if (isNullOrEmptyString(password)) {
      res.send({
        'status': 'error',
        'message': 'invalid password'
      })

      return
    }

    const userByName = await findUser(username, password)

    if (isNull(userByName)) {
      res.send({
        'status': 'error',
        'message': 'invalid credentials'
      })

      return
    }

    res.send ({
      'status': 'success',
      'user': userByName
    })
  })

  app.post('/upload', upload.single('file'), async (req, res) => {
    const token = req.headers.authorization
    if (isNullOrEmptyString(token)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const user = await findUserByToken(token)
    if (isNull(user)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const file = req.file
    if (isNull(file)) {
      res.send({
        'status': 'error',
        'message': 'invalid file'
      })

      return
    }

    let id = user.numImagesUploaded + 1

    s3.upload({
      Bucket: process.env.BUCKET_NAME,
      Key: `root-${user.id}/active/${id}.png`,
      Body: fs.readFileSync(file.path)
    }, async (err, data) => {
      fs.unlinkSync(file.path)

      if (err) {
        res.send({
          'status': 'error',
          'message': err.message
        })

        return
      }

      user.numImagesUploaded = id
      await user.save()

      res.send({
        'status': 'success'
      })
    })
  })

  app.post('/multi-upload', upload.array('files'), async (req, res) => {
    const token = req.headers.authorization
    if (isNullOrEmptyString(token)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const user = await findUserByToken(token)
    if (isNull(user)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const files = req.files
    if (isNull(files)) {
      res.send({
        'status': 'error',
        'message': 'invalid files'
      })
    }

    let id = user.numImagesUploaded + 1

    let failedToUpload = []
    for (let file of files) {
      const data = fs.readFileSync(file.path)

      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `root-${user.id}/active/${id}.png`,
        Body: data
      }

      const {err, result} = await s3.upload(params).promise()
      
      if (err) {
        failedToUpload.push({
          name: file.originalname,
          reason: err.message
        })
      }
      else {
        ++id
      }
    }

    user.numImagesUploaded = id - 1
    await user.save()

    res.json({
      'status': 'success',
      'failed': failedToUpload,
    })
  })

  app.get('/verify', async (req, res) => {
    const token = req.headers.authorization
    if (isNullOrEmptyString(token)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const user = await findUserByToken(token, true)
    if (isNull(user)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const targetToken = req.query.targetToken
    const targetUser = await findUserByToken(targetToken)
    if (isNull(targetUser)) {
      res.send({
        'status': 'error',
        'message': 'invalid target token'
      })
    }

    targetUser.set({
      isVerified: true
    })

    console.log('here')

    targetUser.save()
    .then(() => {
      res.send({
        'status': 'success'
      })
    })
  })

  app.get('/next-image', async (req, res) => {
    const token = req.headers.authorization
    if (isNullOrEmptyString(token)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const user = await findUserByToken(token, true)
    if (isNull(user)) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    s3.listObjectsV2({
      Bucket: process.env.BUCKET_NAME,
      Prefix: `root-${user.id}/active/`,
      MaxKeys: 2
    }, (err, data) => {
      if (err) {
        res.send({
          'status': 'error',
          'message': err.message
        })

        return
      }

      const images = data.Contents.filter(i => i.Key.endsWith('.jpg') || i.Key.endsWith('.png'))

      if (images.length === 0) {
        res.send({
          'status': 'error',
          'message': 'no images found'
        })

        return
      }

      const key = images[0].Key

      s3.getObject({
        Bucket: process.env.BUCKET_NAME,
        Key: key
      }, (err, data) => {
        if (err) {
          return {
            'status': 'error',
            'message': err.message
          }
        }
  
        const b64 = Buffer.from(data.Body).toString('base64')
        const mimeType = 'image/jpeg'
        
        res.send(`<img src="data:${mimeType};base64,${b64}" />`)
      })
    })
  })

  app.get('/dislike', async (req, res) => {
    const token = req.headers.authorization
    if (typeof token === 'undefined' || token === null || token.length === 0) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const userByToken = await User.findOne({
      where: {
        token
      }
    })

    if (userByToken === null) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    s3.listObjectsV2({
      Bucket: process.env.BUCKET_NAME,
      Prefix: `root-${userByToken.id}/active/`,
      MaxKeys: 2
    }, (err, data) => {
      if (err) {
        res.send({
          'status': 'error',
          'message': err.message
        })

        return
      }

      const images = data.Contents.filter(i => i.Key.endsWith('.jpg') || i.Key.endsWith('.png'))

      if (images.length === 0) {
        res.send({
          'status': 'error',
          'message': 'no images found'
        })

        return
      }

      const key = images[0].Key
      const newKey = key.replace('active', 'discarded')

      console.log(key, newKey)

      s3.copyObject({
        Bucket: process.env.BUCKET_NAME,
        CopySource: process.env.BUCKET_NAME + '/' + key,
        Key: newKey
      }, (err, data) => {
        s3.deleteObject({
          Bucket: process.env.BUCKET_NAME,
          Key: key
        }, (_err, _data) => {
          if (err) {
            res.send({
              'status': 'error',
              'message': err.message
            })

            return
          }

          if (_err) {
            res.send({
              'status': 'error',
              'message': err.message
            })

            return
          }

          res.send({
            'status': 'success'
          })
        })
      })
    })
  })

  app.get('/like', async (req, res) => {
    const token = req.headers.authorization
    if (typeof token === 'undefined' || token === null || token.length === 0) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    const userByToken = await User.findOne({
      where: {
        token
      }
    })

    if (userByToken === null) {
      res.send({
        'status': 'error',
        'message': 'invalid token'
      })

      return
    }

    s3.listObjectsV2({
      Bucket: process.env.BUCKET_NAME,
      Prefix: `root-${userByToken.id}/active/`,
      MaxKeys: 2
    }, (err, data) => {
      if (err) {
        res.send({
          'status': 'error',
          'message': err.message
        })

        return
      }

      const images = data.Contents.filter(i => i.Key.endsWith('.jpg') || i.Key.endsWith('.png'))

      if (images.length === 0) {
        res.send({
          'status': 'error',
          'message': 'no images found'
        })

        return
      }

      const key = images[0].Key
      const newKey = key.replace('active', 'kept')

      console.log(key, newKey)

      s3.copyObject({
        Bucket: process.env.BUCKET_NAME,
        CopySource: process.env.BUCKET_NAME + '/' + key,
        Key: newKey
      }, (err, data) => {
        s3.deleteObject({
          Bucket: process.env.BUCKET_NAME,
          Key: key
        }, (_err, _data) => {
          if (err) {
            res.send({
              'status': 'error',
              'message': err.message
            })

            return
          }

          if (_err) {
            res.send({
              'status': 'error',
              'message': err.message
            })

            return
          }

          res.send({
            'status': 'success'
          })
        })
      })
    })
  })

  app.get('/stats', async (req, res) => {
    // todo implement
  })
}

main()

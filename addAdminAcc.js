const { Sequelize, DataTypes, Op } = require('sequelize')

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

const main = async () => {
  try {
    await sequelize.authenticate()
    await User.sync()
  } catch (err) {
    console.log(err) 

    return
  }

  const user = await User.findOne({
    where: {
      isAdmin: true
    }
  })

  if (user === null) {
    const admin = await User.create({
      username: 'admin',
      password: 'admin',
      token: 'admin',
      isAdmin: true,
      isVerified: true
    })

    console.log(`Created admin account: ${admin.username}`)
  } else {
    console.log(`Admin account already exists: ${user.username}`)
  }
}

main()
require('dotenv').config()
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

const token = '20275b1a5b45b9cdd32a22b4ad4d8559e7a6545446713d9ce07f002090889ace'
main = async () => {
  const user = await User.findOne({
    where: {
      token
    }
  })

  user.isVerified = true

  await user.save()
}

main()
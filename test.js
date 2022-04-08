const axios = require('axios')

axios.post('http://localhost:15623/login', {
  username: 'mihai2',
  password: 'shaorma'
}).then(res => {
  console.log(res.data)
})
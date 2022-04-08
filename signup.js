const axios = require('axios')

axios.post('http://localhost:15623/signup', {
  username: 'mihai2',
  password: 'shaorma'
})
.then(response => {
  console.log(response.data)
})